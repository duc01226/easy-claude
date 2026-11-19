'use strict';

/**
 * Official k2-fsa/sherpa-onnx offline TTS model preset catalog and local cache management.
 * Presets cover Apache-2.0 Kokoro-82M (best English & 8-lang) and Piper VITS (Vietnamese + 30-50+ langs).
 * Never downloads automatically during doctor/audition/synthesize; only explicit `download-model` fetches.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { UsageError, DependencyError } = require('./exit-codes.cjs');
const { readEnv, pythonSetupHint } = require('./binaries.cjs');

const RELEASE_BASE = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models';

const PRESETS = Object.freeze({
    'kokoro-en-v0_19': Object.freeze({
        id: 'kokoro-en-v0_19',
        arch: 'kokoro',
        languages: ['en'],
        defaultVoice: 0,
        archive: 'kokoro-en-v0_19.tar.bz2',
        url: `${RELEASE_BASE}/kokoro-en-v0_19.tar.bz2`,
        license: 'Apache-2.0',
        notes: 'Natural English Kokoro-82M (11 preset voices, bundled espeak-ng-data; ~310 MB).'
    }),
    'kokoro-multi-lang-v1_0': Object.freeze({
        id: 'kokoro-multi-lang-v1_0',
        arch: 'kokoro',
        languages: ['en', 'zh', 'ja', 'es', 'fr', 'hi', 'it', 'pt'],
        defaultVoice: 0,
        archive: 'kokoro-multi-lang-v1_0.tar.bz2',
        url: `${RELEASE_BASE}/kokoro-multi-lang-v1_0.tar.bz2`,
        license: 'Apache-2.0',
        notes: 'Multilingual Kokoro v1.0 (53 voices across 8 languages, bundled espeak-ng-data; ~340 MB).'
    }),
    'vits-piper-vi_VN-vais1000-medium': Object.freeze({
        id: 'vits-piper-vi_VN-vais1000-medium',
        arch: 'vits',
        languages: ['vi'],
        defaultVoice: 0,
        archive: 'vits-piper-vi_VN-vais1000-medium.tar.bz2',
        url: `${RELEASE_BASE}/vits-piper-vi_VN-vais1000-medium.tar.bz2`,
        license: 'MIT/Apache-2.0 runtime (Piper voice dataset terms apply)',
        notes: 'Offline Vietnamese neural voice (Piper VITS medium, bundled espeak-ng-data; ~65 MB).'
    }),
    'vits-piper-en_US-lessac-medium': Object.freeze({
        id: 'vits-piper-en_US-lessac-medium',
        arch: 'vits',
        languages: ['en'],
        defaultVoice: 0,
        archive: 'vits-piper-en_US-lessac-medium.tar.bz2',
        url: `${RELEASE_BASE}/vits-piper-en_US-lessac-medium.tar.bz2`,
        license: 'MIT/Apache-2.0 runtime',
        notes: 'Lightweight fast offline English voice (Piper VITS medium, bundled espeak-ng-data; ~65 MB).'
    })
});

const DEFAULT_PRESET_ID = 'kokoro-en-v0_19';
const DOWNLOAD_TIMEOUT_MS = 600_000;

function defaultModelCacheRoot(options = {}) {
    const { env = process.env, platform = process.platform, homeDir = os.homedir() } = options;
    const override = readEnv(env, 'VOICEOVER_MODEL_DIR', platform);
    if (override && override.trim()) return override.trim();
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    if (platform === 'win32') {
        const localAppData = readEnv(env, 'LOCALAPPDATA', 'win32') || readEnv(env, 'USERPROFILE', 'win32') || homeDir;
        return pathApi.join(localAppData, 'easy-claude-voiceover', 'models');
    }
    const xdgCache = readEnv(env, 'XDG_CACHE_HOME', platform);
    if (xdgCache && xdgCache.trim()) {
        return pathApi.join(xdgCache.trim(), 'easy-claude-voiceover', 'models');
    }
    return pathApi.join(homeDir, '.cache', 'easy-claude-voiceover', 'models');
}

function getPreset(presetId) {
    const id = presetId || DEFAULT_PRESET_ID;
    const preset = PRESETS[id];
    if (!preset) {
        throw new UsageError(`Unknown model preset "${id}". Supported presets: ${Object.keys(PRESETS).join(', ')}`);
    }
    return preset;
}

function isDir(dirPath) {
    try {
        return Boolean(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

function inspectModelDir(dirPath) {
    if (!isDir(dirPath)) {
        return { ok: false, reason: `model directory not found: ${dirPath || '(unset)'}` };
    }
    const entries = fs.readdirSync(dirPath);
    const onnxFiles = entries.filter(name => name.toLowerCase().endsWith('.onnx')).sort();
    const modelFile = onnxFiles.includes('model.onnx') ? 'model.onnx' : onnxFiles[0] || null;
    const tokensFile = entries.includes('tokens.txt') ? 'tokens.txt' : null;
    const voicesFile = entries.includes('voices.bin') ? 'voices.bin' : null;
    const dataDir = entries.includes('espeak-ng-data') && isDir(path.join(dirPath, 'espeak-ng-data')) ? 'espeak-ng-data' : null;
    if (!modelFile || !tokensFile) {
        return { ok: false, reason: `incomplete model directory "${dirPath}" (requires *.onnx and tokens.txt)` };
    }
    const arch = voicesFile ? 'kokoro' : 'vits';
    const lexicons = entries.filter(name => /^lexicon.*\.txt$/i.test(name)).sort();
    const dictDir = entries.includes('dict') && isDir(path.join(dirPath, 'dict')) ? 'dict' : null;
    return {
        ok: true,
        arch,
        dir: dirPath,
        model: path.join(dirPath, modelFile),
        tokens: path.join(dirPath, tokensFile),
        voices: voicesFile ? path.join(dirPath, voicesFile) : null,
        dataDir: dataDir ? path.join(dirPath, dataDir) : null,
        lexicons: lexicons.map(name => path.join(dirPath, name)),
        dictDir: dictDir ? path.join(dirPath, dictDir) : null
    };
}

function resolveModelDir(options = {}) {
    const { modelDir, preset = DEFAULT_PRESET_ID, env = process.env, platform = process.platform, homeDir = os.homedir() } = options;
    if (modelDir) {
        const info = inspectModelDir(path.resolve(modelDir));
        if (!info.ok) throw new DependencyError(info.reason);
        return info;
    }
    const chosen = getPreset(preset);
    const cacheRoot = defaultModelCacheRoot({ env, platform, homeDir });
    const candidate = path.join(cacheRoot, chosen.id);
    const info = inspectModelDir(candidate);
    if (!info.ok) {
        throw new DependencyError(
            `Offline neural model "${chosen.id}" is not downloaded yet (${info.reason}).\n` +
                `Download it once (free, offline, ${chosen.license}):\n` +
                `  node .claude/skills/voiceover/scripts/voiceover.cjs download-model ${chosen.id}`
        );
    }
    return { ...info, preset: chosen.id };
}

function downloadPreset(presetId, options = {}) {
    const {
        python,
        helperScript = path.resolve(__dirname, 'sherpa_tts.py'),
        env = process.env,
        platform = process.platform,
        homeDir = os.homedir(),
        destRoot,
        spawn = spawnSync
    } = options;
    const preset = getPreset(presetId);
    if (!python || !python.command) {
        const detail = python?.error ? ` (${python.error})` : '';
        throw new DependencyError(`Python 3 is required to download and safely extract "${preset.id}"${detail}.\n${pythonSetupHint(platform)}`);
    }
    const root = destRoot ? path.resolve(destRoot) : defaultModelCacheRoot({ env, platform, homeDir });
    const targetDir = path.join(root, preset.id);
    const existing = inspectModelDir(targetDir);
    if (existing.ok) {
        return { downloaded: false, ...existing, preset: preset.id };
    }
    fs.mkdirSync(root, { recursive: true });
    const result = spawn(python.command, [...(python.baseArgs || []), helperScript, 'download', '--url', preset.url, '--dest', targetDir], {
        env,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout: DOWNLOAD_TIMEOUT_MS
    });
    if (result.error) {
        throw new Error(`Model download failed to start: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(
            `Model download failed (exit ${result.status}): ${String(result.stderr || result.stdout || '')
                .trim()
                .slice(0, 1200)}`
        );
    }
    const info = inspectModelDir(targetDir);
    if (!info.ok) {
        throw new Error(`Downloaded model "${preset.id}" failed verification: ${info.reason}`);
    }
    return { downloaded: true, ...info, preset: preset.id };
}

module.exports = {
    RELEASE_BASE,
    PRESETS,
    DEFAULT_PRESET_ID,
    defaultModelCacheRoot,
    getPreset,
    inspectModelDir,
    resolveModelDir,
    downloadPreset
};
