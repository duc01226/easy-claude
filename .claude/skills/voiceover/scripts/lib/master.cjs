'use strict';

/**
 * Deterministic ffmpeg cue normalization, silence trim, inter-cue breath gaps,
 * two-pass loudnorm (-14 LUFS, -1.5 dBTP, alimiter latency=1, 48 kHz), and manifest generation.
 *
 * All subprocess calls pass literal argv arrays with shell: false and windowsHide: true.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DependencyError } = require('./exit-codes.cjs');
const { probeFfmpeg } = require('./binaries.cjs');
const { readWavDuration, writeFileAtomic } = require('./cues.cjs');

const TARGET_SAMPLE_RATE = 48_000;
const DEFAULT_LUFS = -14;
const DEFAULT_TRUE_PEAK = -1.5;
const FFMPEG_TIMEOUT_MS = 180_000;
const PROBE_TIMEOUT_MS = 15_000;

// Trim both ENDS only using areverse (matches edit-video/scripts/fix_word.py:29-30 so mid-cue pauses stay intact).
const TRIM_FILTER =
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,' +
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse';

function concatEntry(filePath) {
    if (/[\r\n]/.test(filePath)) {
        throw new Error('FFconcat paths cannot contain line breaks.');
    }
    const normalized = filePath.replace(/\\/g, '/').replace(/'/g, () => "'\\''");
    return `file '${normalized}'\n`;
}

function parseLoudnormJson(stderr) {
    const text = String(stderr || '');
    const end = text.lastIndexOf('}');
    const start = end >= 0 ? text.lastIndexOf('{', end) : -1;
    if (start < 0 || end < 0) {
        throw new Error(`ffmpeg loudnorm did not emit measurement JSON: ${text.slice(-400)}`);
    }
    const data = JSON.parse(text.slice(start, end + 1));
    for (const key of ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']) {
        if (data[key] === undefined) {
            throw new Error(`ffmpeg loudnorm measurement missing "${key}"`);
        }
        if (!Number.isFinite(Number(data[key]))) {
            throw new Error(`ffmpeg loudnorm returned non-finite "${key}" (${JSON.stringify(data[key])}); audio may be silent or too short to measure.`);
        }
    }
    return data;
}

function runProcess(binary, args, options = {}) {
    const { env = process.env, timeoutMs = FFMPEG_TIMEOUT_MS, spawn = spawnSync } = options;
    const result = spawn(binary, args, {
        env,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024
    });
    if (result.error) throw new Error(`${binary} failed to start: ${result.error.message}`);
    if (result.status !== 0) {
        throw new Error(
            `${binary} exited with ${result.status}: ${String(result.stderr || result.stdout || '')
                .trim()
                .slice(-1000)}`
        );
    }
    return result;
}

function probeDurationSeconds(filePath, options = {}) {
    const { ffprobe, env = process.env, spawn = spawnSync, allowMissingFfprobe = false } = options;
    const wavDur = readWavDuration(filePath);
    if (wavDur !== null) return wavDur;
    if (!ffprobe) {
        if (allowMissingFfprobe) return null;
        throw new DependencyError(`Cannot probe non-WAV duration of "${filePath}" without ffprobe.`);
    }
    const result = runProcess(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], {
        env,
        timeoutMs: PROBE_TIMEOUT_MS,
        spawn
    });
    const value = Number(
        String(result.stdout || '')
            .trim()
            .split(/\r?\n/)[0]
    );
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`ffprobe returned invalid duration for "${filePath}": ${JSON.stringify(result.stdout)}`);
    }
    return Number(value.toFixed(4));
}

function buildCueNormalizeArgs(inputPath, outputPath, pauseAfter, trimSilence = true) {
    const filters = [];
    if (trimSilence) filters.push(TRIM_FILTER);
    if (pauseAfter > 0) filters.push(`apad=pad_dur=${pauseAfter.toFixed(3)}`);
    filters.push(`aresample=${TARGET_SAMPLE_RATE}`);
    return [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        inputPath,
        '-vn',
        '-ac',
        '1',
        '-ar',
        String(TARGET_SAMPLE_RATE),
        '-af',
        filters.join(','),
        '-c:a',
        'pcm_s16le',
        outputPath
    ];
}

function buildLoudnormPass2Filter(measured, targetLufs = DEFAULT_LUFS, truePeak = DEFAULT_TRUE_PEAK) {
    const base =
        `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=11:` +
        `measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:` +
        `measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
    // latency=1 matches edit-video/scripts/finalize.py:66 so alimiter introduces zero sync drift.
    return `${base},alimiter=limit=0.66:level=disabled:latency=1,aresample=${TARGET_SAMPLE_RATE}`;
}

function masterCues(options) {
    const {
        cues,
        outDir,
        targetLufs = DEFAULT_LUFS,
        truePeak = DEFAULT_TRUE_PEAK,
        trimSilence = true,
        env = process.env,
        platform = process.platform,
        spawn = spawnSync,
        fsApi = fs
    } = options;
    const probed = probeFfmpeg({ env, platform, spawn, fsApi });
    if (!probed.ok) {
        throw new DependencyError(`ffmpeg/ffprobe required for mastering: ${probed.message}`);
    }
    const normDir = path.join(outDir, 'normalized');
    fs.mkdirSync(normDir, { recursive: true });

    const timeline = [];
    const concatLines = [];
    let cursor = 0;

    for (const cue of cues) {
        const normPath = path.join(normDir, `${cue.id}.wav`);
        const tmpNorm = `${normPath}.${process.pid}.tmp.wav`;
        try {
            runProcess(probed.ffmpeg, buildCueNormalizeArgs(cue.rawPath, tmpNorm, cue.pauseAfter, trimSilence), { env, spawn });
            fs.renameSync(tmpNorm, normPath);
        } catch (error) {
            try {
                if (fs.existsSync(tmpNorm)) fs.unlinkSync(tmpNorm);
            } catch {
                // Best-effort temp cleanup after ffmpeg failure.
            }
            throw error;
        }
        const totalDur = probeDurationSeconds(normPath, { ffprobe: probed.ffprobe, env, spawn });
        const speechDur = Number(Math.max(0, totalDur - cue.pauseAfter).toFixed(4));
        const start = Number(cursor.toFixed(4));
        const end = Number((cursor + totalDur).toFixed(4));
        cursor += totalDur;
        concatLines.push(concatEntry(normPath));
        timeline.push({
            id: cue.id,
            chapter: cue.chapter || null,
            text: cue.text,
            spokenText: cue.spokenText,
            hash: cue.hash,
            cached: Boolean(cue.cached),
            rawFile: path.relative(outDir, cue.rawPath).replace(/\\/g, '/'),
            normalizedFile: path.relative(outDir, normPath).replace(/\\/g, '/'),
            start,
            end,
            duration: totalDur,
            speechDuration: speechDur,
            pauseAfter: cue.pauseAfter
        });
    }

    const concatPath = path.join(normDir, 'concat.txt');
    writeFileAtomic(concatPath, concatLines.join(''));
    const stitchedPath = path.join(normDir, 'stitched.wav');
    runProcess(probed.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', stitchedPath], {
        env,
        spawn
    });

    const pass1 = runProcess(
        probed.ffmpeg,
        ['-hide_banner', '-i', stitchedPath, '-af', `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=11:print_format=json`, '-f', 'null', '-'],
        { env, spawn }
    );
    const measured = parseLoudnormJson(pass1.stderr);
    const pass2Filter = buildLoudnormPass2Filter(measured, targetLufs, truePeak);

    const masterWav = path.join(outDir, 'voiceover.wav');
    const tmpMaster = `${masterWav}.${process.pid}.tmp.wav`;
    try {
        runProcess(
            probed.ffmpeg,
            [
                '-hide_banner',
                '-loglevel',
                'error',
                '-y',
                '-i',
                stitchedPath,
                '-af',
                pass2Filter,
                '-ac',
                '1',
                '-ar',
                String(TARGET_SAMPLE_RATE),
                '-c:a',
                'pcm_s16le',
                tmpMaster
            ],
            { env, spawn }
        );
        fs.renameSync(tmpMaster, masterWav);
    } catch (error) {
        try {
            if (fs.existsSync(tmpMaster)) fs.unlinkSync(tmpMaster);
        } catch {
            // Best-effort temp cleanup after ffmpeg failure.
        }
        throw error;
    }

    const finalProbe = runProcess(probed.ffmpeg, ['-hide_banner', '-i', masterWav, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { env, spawn });
    const finalStats = parseLoudnormJson(finalProbe.stderr);
    const masterDuration = probeDurationSeconds(masterWav, { ffprobe: probed.ffprobe, env, spawn });

    return {
        masterFile: 'voiceover.wav',
        sampleRate: TARGET_SAMPLE_RATE,
        duration: masterDuration,
        loudness: {
            targetLufs,
            truePeakLimitDbtp: truePeak,
            measuredLufs: Number(finalStats.input_i),
            measuredTruePeakDbtp: Number(finalStats.input_tp)
        },
        cues: timeline
    };
}

function buildUnmasteredTimeline(cues, outDir, options = {}) {
    const timeline = [];
    let cursor = 0;
    let allDurationsKnown = true;
    for (const cue of cues) {
        const dur = probeDurationSeconds(cue.rawPath, options);
        let start = null;
        let end = null;
        if (dur === null) {
            allDurationsKnown = false;
        } else if (allDurationsKnown) {
            start = Number(cursor.toFixed(4));
            end = Number((cursor + dur).toFixed(4));
            cursor += dur;
        }
        timeline.push({
            id: cue.id,
            chapter: cue.chapter || null,
            text: cue.text,
            spokenText: cue.spokenText,
            hash: cue.hash,
            cached: Boolean(cue.cached),
            rawFile: path.relative(outDir, cue.rawPath).replace(/\\/g, '/'),
            normalizedFile: null,
            start,
            end,
            duration: dur,
            speechDuration: dur,
            pauseAfter: cue.pauseAfter
        });
    }
    return {
        masterFile: null,
        sampleRate: null,
        duration: allDurationsKnown ? Number(cursor.toFixed(4)) : null,
        loudness: null,
        cues: timeline
    };
}

module.exports = {
    TARGET_SAMPLE_RATE,
    DEFAULT_LUFS,
    DEFAULT_TRUE_PEAK,
    TRIM_FILTER,
    concatEntry,
    parseLoudnormJson,
    probeDurationSeconds,
    buildCueNormalizeArgs,
    buildLoudnormPass2Filter,
    masterCues,
    buildUnmasteredTimeline
};
