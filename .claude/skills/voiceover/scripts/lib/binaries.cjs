'use strict';

/**
 * Cross-platform binary resolution for voiceover (macOS, Windows, Linux).
 *
 * Security & portability invariants (matching html-export/scripts/lib/ffmpeg.cjs):
 * - PATH lookup skips empty/relative entries so the current working directory is never searched.
 * - Explicit env overrides (VOICEOVER_FFMPEG, VOICEOVER_FFPROBE, VOICEOVER_PYTHON) must be
 *   absolute paths; on Windows they must end in .exe or .com (never .bat/.cmd wrappers).
 * - Every probe runs with shell: false, windowsHide: true, and a bounded timeout.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROBE_TIMEOUT_MS = 15_000;
const WINDOWS_SPAWNABLE_EXTENSIONS = Object.freeze(['.com', '.exe']);

const FFMPEG_HINTS = Object.freeze({
    win32: 'Windows: winget install Gyan.FFmpeg',
    darwin: 'macOS: brew install ffmpeg',
    linux: 'Linux (Debian/Ubuntu): sudo apt-get install ffmpeg'
});

function readEnv(env, name, platform) {
    if (platform !== 'win32') return env[name];
    const key = Object.keys(env).find(candidate => candidate.toUpperCase() === name.toUpperCase());
    return key === undefined ? undefined : env[key];
}

function isFullyQualified(value, platform) {
    if (typeof value !== 'string' || value.length === 0) return false;
    return platform === 'win32' ? /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(value) : path.posix.isAbsolute(value);
}

function windowsExtensions(env) {
    const listed = String(readEnv(env, 'PATHEXT', 'win32') || '')
        .split(';')
        .map(ext => ext.trim().toLowerCase())
        .filter(ext => WINDOWS_SPAWNABLE_EXTENSIONS.includes(ext));
    return listed.length > 0 ? [...new Set(listed)] : [...WINDOWS_SPAWNABLE_EXTENSIONS];
}

function isRunnableFile(candidate, platform, fsApi = fs) {
    try {
        if (!fsApi.statSync(candidate).isFile()) return false;
        if (platform !== 'win32') fsApi.accessSync(candidate, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

function findOnPath(name, options = {}) {
    const { env = process.env, platform = process.platform, fsApi = fs } = options;
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    const extensions = platform === 'win32' ? windowsExtensions(env) : [''];
    for (const entry of String(readEnv(env, 'PATH', platform) || '').split(pathApi.delimiter)) {
        const dir = entry.trim().replace(/^"(.*)"$/, '$1');
        if (dir === '' || !isFullyQualified(dir, platform)) continue;
        for (const ext of extensions) {
            const candidate = pathApi.join(dir, `${name}${ext}`);
            if (isRunnableFile(candidate, platform, fsApi)) return candidate;
        }
    }
    return null;
}

function overrideBinary(env, variable, platform) {
    const value = readEnv(env, variable, platform);
    if (!value) return null;
    if (!isFullyQualified(value, platform)) {
        throw new Error(`${variable} must be an absolute path to the executable; got "${value}".`);
    }
    if (platform === 'win32' && !WINDOWS_SPAWNABLE_EXTENSIONS.includes(path.win32.extname(value).toLowerCase())) {
        throw new Error(
            `${variable} must point at an .exe or .com executable on Windows; got "${value}". ` + 'Point it at the binary directly, never a .bat/.cmd wrapper.'
        );
    }
    return value;
}

function ffmpegBinary(env = process.env, platform = process.platform, fsApi = fs) {
    return overrideBinary(env, 'VOICEOVER_FFMPEG', platform) || findOnPath('ffmpeg', { env, platform, fsApi });
}

function ffprobeBinary(env = process.env, platform = process.platform, fsApi = fs) {
    return overrideBinary(env, 'VOICEOVER_FFPROBE', platform) || findOnPath('ffprobe', { env, platform, fsApi });
}

function skillVenvPython(scriptsDir, platform = process.platform, fsApi = fs) {
    if (!scriptsDir) return null;
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    const candidate = platform === 'win32' ? pathApi.join(scriptsDir, '.venv', 'Scripts', 'python.exe') : pathApi.join(scriptsDir, '.venv', 'bin', 'python');
    return isRunnableFile(candidate, platform, fsApi) ? candidate : null;
}

function resolvePython(options = {}) {
    const { env = process.env, platform = process.platform, probe = spawnSync, scriptsDir = path.resolve(__dirname, '..'), fsApi = fs } = options;
    let override;
    try {
        override = overrideBinary(env, 'VOICEOVER_PYTHON', platform);
    } catch (error) {
        return { command: null, baseArgs: [], source: null, version: null, error: error.message };
    }
    const candidates = [];
    if (override) {
        candidates.push({ command: override, baseArgs: [], source: 'VOICEOVER_PYTHON' });
    } else {
        const venvPy = skillVenvPython(scriptsDir, platform, fsApi);
        if (venvPy) candidates.push({ command: venvPy, baseArgs: [], source: 'skill-venv' });
        if (platform === 'win32') {
            const py = findOnPath('python', { env, platform, fsApi });
            const launcher = findOnPath('py', { env, platform, fsApi });
            if (py) candidates.push({ command: py, baseArgs: [], source: 'PATH' });
            if (launcher) candidates.push({ command: launcher, baseArgs: ['-3'], source: 'PATH' });
        } else {
            const py3 = findOnPath('python3', { env, platform, fsApi });
            const py = findOnPath('python', { env, platform, fsApi });
            if (py3) candidates.push({ command: py3, baseArgs: [], source: 'PATH' });
            if (py) candidates.push({ command: py, baseArgs: [], source: 'PATH' });
        }
    }

    const failures = [];
    for (const candidate of candidates) {
        const result = probe(candidate.command, [...candidate.baseArgs, '-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])'], {
            env,
            encoding: 'utf8',
            shell: false,
            windowsHide: true,
            timeout: PROBE_TIMEOUT_MS
        });
        const stdout = String(result.stdout || '').trim();
        const match = /^3\.(\d+)\.(\d+)$/.exec(stdout);
        if (!result.error && result.status === 0 && match) {
            return { ...candidate, version: stdout };
        }
        failures.push(`${[candidate.command, ...candidate.baseArgs].join(' ')}: ${result.error?.code || result.signal || `exit ${result.status}`}`);
    }
    return {
        command: null,
        baseArgs: [],
        source: null,
        version: null,
        error: failures.length > 0 ? `Python 3 probe failed (${failures.join('; ')})` : 'Python 3 was not found on PATH.'
    };
}

function ffmpegInstallHint(platform = process.platform) {
    const order = [platform, ...Object.keys(FFMPEG_HINTS).filter(name => name !== platform)];
    const lines = order.filter(name => FFMPEG_HINTS[name]).map(name => `  ${FFMPEG_HINTS[name]}`);
    return ['Install ffmpeg (never auto-installed), or set VOICEOVER_FFMPEG and VOICEOVER_FFPROBE to absolute executables:', ...lines].join('\n');
}

function pythonSetupHint(platform = process.platform, scriptsRelPath = '.claude/skills/voiceover/scripts') {
    if (platform === 'win32') {
        const winRel = scriptsRelPath.replace(/\//g, '\\');
        return [
            'Install free offline neural TTS (sherpa-onnx, Apache-2.0):',
            `  py -3 -m venv ${winRel}\\.venv`,
            `  ${winRel}\\.venv\\Scripts\\python.exe -m pip install --upgrade pip sherpa-onnx`
        ].join('\n');
    }
    return [
        'Install free offline neural TTS (sherpa-onnx, Apache-2.0):',
        `  python3 -m venv ${scriptsRelPath}/.venv`,
        `  ${scriptsRelPath}/.venv/bin/python -m pip install --upgrade pip sherpa-onnx`
    ].join('\n');
}

function probeFfmpeg(options = {}) {
    const { env = process.env, platform = process.platform, spawn = spawnSync, fsApi = fs } = options;
    let ff;
    let fp;
    try {
        ff = ffmpegBinary(env, platform, fsApi);
        fp = ffprobeBinary(env, platform, fsApi);
    } catch (error) {
        return { ok: false, ffmpeg: null, ffprobe: null, version: null, message: `${error.message}\n${ffmpegInstallHint(platform)}` };
    }
    if (!ff || !fp) {
        const missing = [!ff && 'ffmpeg', !fp && 'ffprobe'].filter(Boolean).join(' and ');
        return { ok: false, ffmpeg: ff, ffprobe: fp, version: null, message: `${missing} not found on PATH.\n${ffmpegInstallHint(platform)}` };
    }
    const ver = spawn(ff, ['-version'], { env, encoding: 'utf8', shell: false, windowsHide: true, timeout: PROBE_TIMEOUT_MS });
    if (ver.error || ver.status !== 0) {
        return {
            ok: false,
            ffmpeg: ff,
            ffprobe: fp,
            version: null,
            message: `"${ff} -version" failed (${ver.error ? ver.error.message : `exit ${ver.status}`}).\n${ffmpegInstallHint(platform)}`
        };
    }
    const firstLine = String(ver.stdout || '')
        .split(/\r?\n/)[0]
        .trim();
    return { ok: true, ffmpeg: ff, ffprobe: fp, version: firstLine || null, message: null };
}

module.exports = {
    PROBE_TIMEOUT_MS,
    readEnv,
    isFullyQualified,
    findOnPath,
    overrideBinary,
    ffmpegBinary,
    ffprobeBinary,
    skillVenvPython,
    resolvePython,
    ffmpegInstallHint,
    pythonSetupHint,
    probeFfmpeg
};
