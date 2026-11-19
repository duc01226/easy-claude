#!/usr/bin/env node
'use strict';

/**
 * Cross-platform (macOS, Windows, Linux) neural voiceover CLI.
 * Free local offline default: sherpa-onnx (Kokoro-82M English + Piper VITS Vietnamese/multilingual).
 * Optional cloud studio adapters: openrouter, openai, gemini, elevenlabs (explicit --provider only).
 * Never installs packages/models automatically and never falls back silently to OS TTS (/usr/bin/say, SAPI5).
 */
const fs = require('node:fs');
const path = require('node:path');
const { EXIT, UsageError, DependencyError } = require('./lib/exit-codes.cjs');
const { resolvePython, probeFfmpeg, pythonSetupHint, ffmpegInstallHint } = require('./lib/binaries.cjs');
const { resolveEnvValue } = require('./lib/env.cjs');
const { validateCueId, loadCues, loadPronunciation, applyPronunciation, computeCueHash, writeFileAtomic } = require('./lib/cues.cjs');
const { PRESETS, DEFAULT_PRESET_ID, defaultModelCacheRoot, inspectModelDir, downloadPreset } = require('./lib/model-store.cjs');
const { DEFAULT_LUFS, masterCues, buildUnmasteredTimeline, probeDurationSeconds } = require('./lib/master.cjs');
const { DEFAULT_PROVIDER, CLOUD_DEFAULTS, supportedProviders, createProvider } = require('./lib/providers/index.cjs');

const SKILL_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = __dirname;
const SCHEMA_VERSION = 1;

const HELP_TEXT = `Usage:
  node .claude/skills/voiceover/scripts/voiceover.cjs <command> [options]

Commands:
  doctor [--json]                             Check Python, sherpa-onnx, local presets, ffmpeg, and optional cloud keys
  list-presets [--json]                       List free offline sherpa-onnx model presets and local install status
  download-model <preset> [--model-root <d>]  Explicitly download and safely extract an official offline model preset
  audition <cues.json> [options]              Synthesize 1 sample cue (~5s) to verify voice & pronunciation first
  synthesize <cues.json> [options]            Synthesize all cues (cached), master to -14 LUFS, and write manifest.json
  master <out-dir> [--lufs -14] [--no-trim]   Re-master existing raw cues from <out-dir>/manifest.json

Options:
  --out <dir>            Output directory (default: tmp/voiceover/<run>)
  --provider <name>      ${supportedProviders().join(' | ')} (default: ${DEFAULT_PROVIDER})
  --preset <id>          Offline preset for sherpa-onnx (default: ${DEFAULT_PRESET_ID})
  --model-dir <dir>      Custom local sherpa-onnx model directory (overrides --preset)
  --model <id>           Model ID for cloud providers
  --voice <id>           Speaker ID (int for sherpa-onnx, voice name/ID for cloud)
  --speed <num>          Speech speed in [0.5, 2.0] (default: 1.0)
  --cue <id>             Cue ID for audition (default: first cue)
  --pronunciation <file> JSON map of technical terms -> spoken text
  --threads <n>          CPU threads for sherpa-onnx (default: 2)
  --lufs <num>           Mastering target loudness (default: ${DEFAULT_LUFS})
  --no-master            Skip ffmpeg stitching/mastering (writes per-cue audio + manifest.json)
  --no-trim              Skip leading/trailing cue silence trim during mastering
  --no-cache             Ignore existing cached cue files and re-synthesize
  --max-cues <n>         Override maximum cues per run (default: 500)
  --json                 Emit JSON output (doctor, list-presets)
  --help, -h             Show this help

Exit codes: 0 ok | 1 runtime fault | 2 usage/input error | 3 missing dependency/provider (never auto-installs)`;

const VALUE_FLAGS = new Set([
    'out',
    'provider',
    'preset',
    'model-dir',
    'model',
    'voice',
    'speed',
    'cue',
    'pronunciation',
    'threads',
    'lufs',
    'max-cues',
    'model-root'
]);

const BOOL_FLAGS = new Set(['json', 'no-master', 'no-trim', 'no-cache', 'help']);

function parseArgs(argv) {
    const positionals = [];
    const flags = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '-h' || token === '--help') {
            flags.help = true;
            continue;
        }
        if (!token.startsWith('--')) {
            positionals.push(token);
            continue;
        }
        const eqIdx = token.indexOf('=');
        const key = eqIdx >= 0 ? token.slice(2, eqIdx) : token.slice(2);
        if (BOOL_FLAGS.has(key)) {
            if (eqIdx >= 0) throw new UsageError(`Flag --${key} takes no value.`);
            flags[key] = true;
            continue;
        }
        if (VALUE_FLAGS.has(key)) {
            const val = eqIdx >= 0 ? token.slice(eqIdx + 1) : argv[++i];
            if (val === undefined || val === '' || (eqIdx < 0 && val.startsWith('--'))) {
                throw new UsageError(`Flag --${key} requires a non-empty value.`);
            }
            flags[key] = val;
            continue;
        }
        throw new UsageError(`Unknown flag: --${key}. Run with --help to see supported options.`);
    }
    return { command: positionals[0] || null, args: positionals.slice(1), flags };
}

function parseNumberFlag(raw, name, min, max, fallback) {
    if (raw === undefined) return fallback;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < min || num > max) {
        throw new UsageError(`--${name} must be a number in [${min}, ${max}]; got "${raw}".`);
    }
    return num;
}

function parseIntFlag(raw, name, min, max, fallback) {
    if (raw === undefined) return fallback;
    const num = Number(raw);
    if (!Number.isInteger(num) || num < min || num > max) {
        throw new UsageError(`--${name} must be an integer in [${min}, ${max}]; got "${raw}".`);
    }
    return num;
}

function defaultOutDir(cwd) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(2, 13);
    return path.join(cwd, 'tmp', 'voiceover', `run-${stamp}`);
}

function handleDoctor(flags, deps) {
    const { env, platform, homeDir, spawn, fsApi, skillDir, scriptsDir } = deps;
    const { probeSherpa } = require('./lib/providers/sherpa-onnx.cjs');
    const sherpa = probeSherpa({ env, platform, probe: spawn, scriptsDir, fsApi });
    const ffmpeg = probeFfmpeg({ env, platform, spawn, fsApi });
    const cacheRoot = defaultModelCacheRoot({ env, platform, homeDir });
    const presets = Object.values(PRESETS).map(p => {
        const dir = path.join(cacheRoot, p.id);
        const info = inspectModelDir(dir);
        return { id: p.id, arch: p.arch, languages: p.languages, installed: info.ok, dir };
    });
    const cloud = Object.fromEntries(
        Object.entries(CLOUD_DEFAULTS).map(([name, spec]) => [
            name,
            { envVar: spec.envVar, configured: Boolean(resolveEnvValue(spec.envVar, { env, skillDir })) }
        ])
    );
    const localReady = sherpa.ok && presets.some(p => p.installed);
    const anyCloudReady = Object.values(cloud).some(c => c.configured);
    const report = {
        platform,
        node: process.version,
        offlineNeural: {
            ready: localReady,
            python: sherpa.python ? `${sherpa.python.command} (${sherpa.python.version})` : null,
            sherpaOnnx: sherpa.sherpaVersion,
            modelCacheRoot: cacheRoot,
            presets,
            message: sherpa.message
        },
        mastering: {
            ready: ffmpeg.ok,
            ffmpeg: ffmpeg.ffmpeg,
            ffprobe: ffmpeg.ffprobe,
            version: ffmpeg.version,
            message: ffmpeg.message
        },
        cloudProviders: cloud,
        silentOsTtsFallback: 'FORBIDDEN'
    };
    if (flags.json) {
        deps.stdout(JSON.stringify(report, null, 2) + '\n');
    } else {
        const lines = [
            `voiceover doctor (${platform}, node ${process.version})`,
            `  offline sherpa-onnx : ${sherpa.ok ? `OK (${sherpa.sherpaVersion}, python ${sherpa.python.version})` : 'MISSING'}`,
            `  model cache         : ${cacheRoot}`,
            ...presets.map(p => `    - ${p.id} [${p.languages.join(',')}] : ${p.installed ? 'INSTALLED' : 'not downloaded'}`),
            `  ffmpeg mastering    : ${ffmpeg.ok ? `OK (${ffmpeg.version || ffmpeg.ffmpeg})` : 'MISSING (audition/--no-master still work)'}`,
            `  optional cloud keys : ${Object.entries(cloud)
                .map(([n, c]) => `${n}=${c.configured ? 'set' : 'unset'}`)
                .join(', ')}`
        ];
        if (!sherpa.ok) lines.push('', pythonSetupHint(platform));
        if (sherpa.ok && !localReady) {
            lines.push('', `Download a free offline model once:\n  node .claude/skills/voiceover/scripts/voiceover.cjs download-model ${DEFAULT_PRESET_ID}`);
        }
        if (!ffmpeg.ok) lines.push('', ffmpegInstallHint(platform));
        deps.stdout(lines.join('\n') + '\n');
    }
    return localReady || anyCloudReady ? EXIT.OK : EXIT.DEPENDENCY;
}

function handleListPresets(flags, deps) {
    const cacheRoot = defaultModelCacheRoot({ env: deps.env, platform: deps.platform, homeDir: deps.homeDir });
    const rows = Object.values(PRESETS).map(p => ({
        ...p,
        installed: inspectModelDir(path.join(cacheRoot, p.id)).ok,
        dir: path.join(cacheRoot, p.id)
    }));
    if (flags.json) {
        deps.stdout(JSON.stringify({ cacheRoot, presets: rows }, null, 2) + '\n');
    } else {
        const lines = [`Model cache root: ${cacheRoot}`, 'Free offline neural presets (Apache-2.0 sherpa-onnx):'];
        for (const r of rows) {
            lines.push(`  ${r.id.padEnd(34)} [${r.languages.join(',')}]  ${r.installed ? 'INSTALLED' : 'available'}  — ${r.notes}`);
        }
        deps.stdout(lines.join('\n') + '\n');
    }
    return EXIT.OK;
}

function handleDownloadModel(args, flags, deps) {
    const presetId = args[0] || DEFAULT_PRESET_ID;
    const py = resolvePython({ env: deps.env, platform: deps.platform, probe: deps.spawn, scriptsDir: deps.scriptsDir, fsApi: deps.fsApi });
    const res = downloadPreset(presetId, {
        python: py,
        env: deps.env,
        platform: deps.platform,
        homeDir: deps.homeDir,
        destRoot: flags['model-root'] ? path.resolve(deps.cwd, flags['model-root']) : undefined,
        spawn: deps.spawn
    });
    deps.stdout(JSON.stringify({ preset: res.preset, arch: res.arch, downloaded: res.downloaded, dir: res.dir }, null, 2) + '\n');
    return EXIT.OK;
}

async function runSynthesis(mode, args, flags, deps) {
    const cuesPath = args[0];
    if (!cuesPath) throw new UsageError(`${mode} requires a <cues.json> input path.`);
    const maxCues = parseIntFlag(flags['max-cues'], 'max-cues', 1, 5000, 500);
    const speed = parseNumberFlag(flags.speed, 'speed', 0.5, 2.0, 1.0);
    const threads = parseIntFlag(flags.threads, 'threads', 1, 32, 2);
    const targetLufs = parseNumberFlag(flags.lufs, 'lufs', -36, -6, DEFAULT_LUFS);
    const loaded = loadCues(path.resolve(deps.cwd, cuesPath), { maxCues });
    const pronunciation = loadPronunciation(flags.pronunciation ? path.resolve(deps.cwd, flags.pronunciation) : null);

    let selectedCues = loaded.cues;
    if (mode === 'audition') {
        if (flags.cue) {
            const found = loaded.cues.find(c => c.id === flags.cue);
            if (!found) throw new UsageError(`Cue "${flags.cue}" not found in "${cuesPath}".`);
            selectedCues = [found];
        } else {
            selectedCues = [loaded.cues[0]];
        }
    }

    const providerName = flags.provider || DEFAULT_PROVIDER;
    const provider = createProvider(providerName, {
        preset: flags.preset || DEFAULT_PRESET_ID,
        modelDir: flags['model-dir'] ? path.resolve(deps.cwd, flags['model-dir']) : undefined,
        model: flags.model,
        voice: flags.voice,
        threads,
        env: deps.env,
        platform: deps.platform,
        homeDir: deps.homeDir,
        skillDir: deps.skillDir,
        scriptsDir: deps.scriptsDir,
        fsApi: deps.fsApi,
        spawn: deps.spawn,
        fetchFn: deps.fetchFn,
        delayFn: deps.delayFn
    });

    provider.ensureReady();

    // Fail fast before synthesizing cues (paid cloud API or local CPU) when mastering is requested without ffmpeg/ffprobe.
    if (mode === 'synthesize' && !flags['no-master']) {
        const ffCheck = probeFfmpeg({ env: deps.env, platform: deps.platform, spawn: deps.spawn, fsApi: deps.fsApi });
        if (!ffCheck.ok) {
            throw new DependencyError(`ffmpeg/ffprobe required for mastering (or pass --no-master): ${ffCheck.message}`);
        }
    }

    const outDir = flags.out ? path.resolve(deps.cwd, flags.out) : defaultOutDir(deps.cwd);
    const rawDir = path.join(outDir, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });

    const useCache = !flags['no-cache'];
    const synthesized = [];
    for (const cue of selectedCues) {
        const spokenText = applyPronunciation(cue.text, pronunciation);
        const cueSpeed = cue.speed === null ? speed : cue.speed;
        const hash = computeCueHash({
            provider: provider.name,
            model: provider.modelId,
            voice: provider.voiceId,
            speed: cueSpeed,
            instructions: cue.instructions || '',
            spokenText
        });
        const rawPath = path.join(rawDir, `${cue.id}.${hash}${provider.extension}`);
        const isHit = useCache && fs.existsSync(rawPath) && fs.statSync(rawPath).size > 0;
        if (!isHit) {
            await provider.synthesize({
                text: spokenText,
                speed: cueSpeed,
                instructions: cue.instructions,
                outPath: rawPath
            });
        }
        synthesized.push({ ...cue, spokenText, hash, rawPath, cached: isHit });
    }

    if (mode === 'audition') {
        const sample = synthesized[0];
        const ff = probeFfmpeg({ env: deps.env, platform: deps.platform, spawn: deps.spawn, fsApi: deps.fsApi });
        const duration = probeDurationSeconds(sample.rawPath, {
            ffprobe: ff.ok ? ff.ffprobe : null,
            env: deps.env,
            spawn: deps.spawn,
            allowMissingFfprobe: true
        });
        const result = {
            schemaVersion: SCHEMA_VERSION,
            mode: 'audition',
            provider: provider.name,
            offline: provider.offline,
            model: provider.modelId,
            voice: provider.voiceId,
            cueId: sample.id,
            text: sample.text,
            spokenText: sample.spokenText,
            cached: sample.cached,
            duration,
            audioPath: sample.rawPath
        };
        writeFileAtomic(path.join(outDir, 'audition.json'), JSON.stringify(result, null, 2) + '\n');
        deps.stdout(JSON.stringify(result, null, 2) + '\n');
        return EXIT.OK;
    }

    let mastered;
    if (flags['no-master']) {
        const ff = probeFfmpeg({ env: deps.env, platform: deps.platform, spawn: deps.spawn, fsApi: deps.fsApi });
        mastered = buildUnmasteredTimeline(synthesized, outDir, {
            ffprobe: ff.ok ? ff.ffprobe : null,
            env: deps.env,
            spawn: deps.spawn,
            allowMissingFfprobe: true
        });
    } else {
        mastered = masterCues({
            cues: synthesized,
            outDir,
            targetLufs,
            trimSilence: !flags['no-trim'],
            env: deps.env,
            platform: deps.platform,
            spawn: deps.spawn,
            fsApi: deps.fsApi
        });
    }

    const manifest = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        provider: provider.name,
        offline: provider.offline,
        model: provider.modelId,
        voice: provider.voiceId,
        language: loaded.language,
        masterFile: mastered.masterFile,
        sampleRate: mastered.sampleRate,
        duration: mastered.duration,
        loudness: mastered.loudness,
        cues: mastered.cues
    };
    const manifestPath = path.join(outDir, 'manifest.json');
    writeFileAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    deps.stdout(JSON.stringify({ manifestPath, outDir, ...manifest, cueCount: manifest.cues.length }, null, 2) + '\n');
    return EXIT.OK;
}

function isPathInside(parentDir, candidatePath) {
    const rel = path.relative(path.resolve(parentDir), path.resolve(candidatePath));
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function handleMaster(args, flags, deps) {
    const outDirArg = args[0];
    if (!outDirArg) throw new UsageError('master requires an <out-dir> containing manifest.json.');
    const outDir = path.resolve(deps.cwd, outDirArg);
    const manifestPath = path.join(outDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new UsageError(`No manifest.json found in "${outDir}". Run synthesize first.`);
    }
    let prev;
    try {
        prev = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        throw new UsageError(`Invalid JSON in manifest "${manifestPath}": ${error.message}`);
    }
    if (!Array.isArray(prev?.cues) || prev.cues.length === 0) {
        throw new UsageError(`Manifest "${manifestPath}" contains no cues.`);
    }
    const targetLufs = parseNumberFlag(flags.lufs, 'lufs', -36, -6, DEFAULT_LUFS);
    const seenIds = new Set();
    const cues = prev.cues.map((c, index) => {
        if (!c || typeof c !== 'object' || Array.isArray(c)) {
            throw new UsageError(`Manifest cue at index ${index} must be an object.`);
        }
        const id = validateCueId(c.id);
        if (seenIds.has(id)) throw new UsageError(`Duplicate cue id "${id}" in manifest.`);
        seenIds.add(id);
        if (typeof c.rawFile !== 'string' || !c.rawFile.trim()) {
            throw new UsageError(`Manifest cue "${id}" is missing a valid rawFile path.`);
        }
        const rawPath = path.resolve(outDir, c.rawFile);
        if (!isPathInside(outDir, rawPath)) {
            throw new UsageError(`Manifest cue "${id}" rawFile escapes output directory: "${c.rawFile}".`);
        }
        if (!fs.existsSync(rawPath) || !fs.statSync(rawPath).isFile()) {
            throw new UsageError(`Manifest cue "${id}" raw audio file not found: "${rawPath}".`);
        }
        if (!isPathInside(fs.realpathSync(outDir), fs.realpathSync(rawPath))) {
            throw new UsageError(`Manifest cue "${id}" rawFile resolves via symlink outside output directory: "${c.rawFile}".`);
        }
        let pauseAfter = 0.35;
        if (c.pauseAfter !== undefined) {
            if (typeof c.pauseAfter !== 'number' || !Number.isFinite(c.pauseAfter) || c.pauseAfter < 0 || c.pauseAfter > 10) {
                throw new UsageError(`Manifest cue "${id}" pauseAfter must be a finite number in [0, 10]; got ${JSON.stringify(c.pauseAfter)}.`);
            }
            pauseAfter = c.pauseAfter;
        }
        return { ...c, id, rawPath, pauseAfter };
    });
    const mastered = masterCues({
        cues,
        outDir,
        targetLufs,
        trimSilence: !flags['no-trim'],
        env: deps.env,
        platform: deps.platform,
        spawn: deps.spawn,
        fsApi: deps.fsApi
    });
    const next = {
        ...prev,
        generatedAt: new Date().toISOString(),
        masterFile: mastered.masterFile,
        sampleRate: mastered.sampleRate,
        duration: mastered.duration,
        loudness: mastered.loudness,
        cues: mastered.cues
    };
    writeFileAtomic(manifestPath, JSON.stringify(next, null, 2) + '\n');
    deps.stdout(JSON.stringify({ manifestPath, masterFile: next.masterFile, duration: next.duration, loudness: next.loudness }, null, 2) + '\n');
    return EXIT.OK;
}

async function runCli(argv, overrides = {}) {
    const deps = {
        cwd: process.cwd(),
        env: process.env,
        platform: process.platform,
        homeDir: require('node:os').homedir(),
        skillDir: SKILL_DIR,
        scriptsDir: SCRIPTS_DIR,
        fsApi: fs,
        spawn: require('node:child_process').spawnSync,
        fetchFn: globalThis.fetch,
        delayFn: undefined,
        stdout: text => process.stdout.write(text),
        stderr: text => process.stderr.write(text),
        ...overrides
    };
    try {
        const { command, args, flags } = parseArgs(argv);
        if (flags.help || !command) {
            deps.stdout(HELP_TEXT + '\n');
            return EXIT.OK;
        }
        if (command === 'doctor') return handleDoctor(flags, deps);
        if (command === 'list-presets') return handleListPresets(flags, deps);
        if (command === 'download-model') return handleDownloadModel(args, flags, deps);
        if (command === 'audition' || command === 'synthesize') return await runSynthesis(command, args, flags, deps);
        if (command === 'master') return handleMaster(args, flags, deps);
        throw new UsageError(`Unknown command "${command}". Run with --help to see supported commands.`);
    } catch (error) {
        const code = error instanceof UsageError ? EXIT.USAGE : error instanceof DependencyError ? EXIT.DEPENDENCY : EXIT.ERROR;
        deps.stderr(`voiceover error: ${error?.message || String(error)}\n`);
        return code;
    }
}

if (require.main === module) {
    runCli(process.argv.slice(2)).then(code => {
        process.exitCode = code;
    });
}

module.exports = { HELP_TEXT, parseArgs, runCli };
