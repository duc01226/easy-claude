'use strict';

/**
 * Free, 100% offline neural TTS provider backed by Apache-2.0 sherpa-onnx (Kokoro-82M & Piper VITS).
 * Runs identically on macOS and Windows via Python 3 + sherpa_tts.py (no manual espeak-ng install).
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DependencyError, UsageError } = require('../exit-codes.cjs');
const { resolvePython, pythonSetupHint, PROBE_TIMEOUT_MS } = require('../binaries.cjs');
const { DEFAULT_PRESET_ID, resolveModelDir } = require('../model-store.cjs');

const SYNTH_TIMEOUT_MS = 180_000;
const HELPER_SCRIPT = path.resolve(__dirname, '..', 'sherpa_tts.py');

function parseSpeakerId(voice) {
    if (voice === undefined || voice === null || voice === '') return 0;
    const num = Number(voice);
    if (!Number.isInteger(num) || num < 0) {
        throw new UsageError(`sherpa-onnx --voice must be a non-negative integer speaker ID (sid), got "${voice}".`);
    }
    return num;
}

function probeSherpa(options = {}) {
    const { env = process.env, platform = process.platform, probe = spawnSync, scriptsDir, fsApi, helperScript = HELPER_SCRIPT } = options;
    const py = resolvePython({ env, platform, probe, scriptsDir, fsApi });
    if (!py.command) {
        return { ok: false, python: null, sherpaVersion: null, message: `${py.error}\n${pythonSetupHint(platform)}` };
    }
    const check = probe(py.command, [...py.baseArgs, helperScript, 'probe'], {
        env,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout: PROBE_TIMEOUT_MS
    });
    if (check.error) {
        return { ok: false, python: py, sherpaVersion: null, message: `sherpa-onnx probe failed: ${check.error.message}` };
    }
    let payload;
    try {
        payload = JSON.parse(String(check.stdout || '').trim());
    } catch {
        payload = null;
    }
    if (check.status !== 0 || !payload?.sherpa_onnx) {
        const detail = payload?.error || String(check.stderr || '').trim() || `exit ${check.status}`;
        return {
            ok: false,
            python: py,
            sherpaVersion: null,
            message: `Python package "sherpa-onnx" is not installed (${detail}).\n${pythonSetupHint(platform)}`
        };
    }
    return { ok: true, python: py, sherpaVersion: payload.sherpa_onnx, message: null };
}

function createSherpaProvider(options = {}) {
    const {
        preset = DEFAULT_PRESET_ID,
        modelDir,
        voice = 0,
        threads = 2,
        env = process.env,
        platform = process.platform,
        homeDir,
        scriptsDir,
        fsApi,
        spawn = spawnSync,
        helperScript = HELPER_SCRIPT
    } = options;
    const sid = parseSpeakerId(voice);
    let cachedRuntime = null;

    function ensureReady() {
        if (cachedRuntime) return cachedRuntime;
        const probed = probeSherpa({ env, platform, probe: spawn, scriptsDir, fsApi, helperScript });
        if (!probed.ok) throw new DependencyError(probed.message);
        const modelInfo = resolveModelDir({ modelDir, preset, env, platform, homeDir });
        cachedRuntime = { python: probed.python, modelInfo };
        return cachedRuntime;
    }

    return {
        name: 'sherpa-onnx',
        offline: true,
        extension: '.wav',
        modelId: modelDir ? path.basename(path.resolve(modelDir)) : preset,
        voiceId: String(sid),
        ensureReady,
        async synthesize({ text, speed = 1.0, outPath }) {
            const { python, modelInfo } = ensureReady();
            const args = [
                ...python.baseArgs,
                helperScript,
                'synthesize',
                '--model-dir',
                modelInfo.dir,
                `--text=${text}`,
                '--out',
                outPath,
                '--sid',
                String(sid),
                '--speed',
                String(speed),
                '--threads',
                String(threads)
            ];
            const result = spawn(python.command, args, {
                env,
                encoding: 'utf8',
                shell: false,
                windowsHide: true,
                timeout: SYNTH_TIMEOUT_MS
            });
            if (result.error) throw new Error(`sherpa-onnx failed to start: ${result.error.message}`);
            if (result.status === 3) {
                throw new DependencyError(String(result.stderr || '').trim() || pythonSetupHint(platform));
            }
            if (result.status !== 0) {
                throw new Error(
                    `sherpa-onnx failed (exit ${result.status}): ${String(result.stderr || result.stdout || '')
                        .trim()
                        .slice(0, 1200)}`
                );
            }
            return { outPath };
        }
    };
}

module.exports = { parseSpeakerId, probeSherpa, createSherpaProvider };
