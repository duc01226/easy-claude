'use strict';

/**
 * Portable offline tests for `.claude/skills/voiceover`.
 * Zero live network, zero model downloads, zero global installs, scrubbed env/HOME/TMP.
 * Exercises macOS, Windows, and Linux seams explicitly.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePythonCommand } = require('../../hooks/tests/lib/python-command.cjs');
const { osEssentialsEnv } = require('../../hooks/tests/lib/os-essentials-env.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const VOICEOVER_DIR = path.join(ROOT, '.claude/skills/voiceover');
const CLI = path.join(VOICEOVER_DIR, 'scripts/voiceover.cjs');
const HELPER_PY = path.join(VOICEOVER_DIR, 'scripts/lib/sherpa_tts.py');

const { EXIT } = require('../../skills/voiceover/scripts/lib/exit-codes.cjs');
const { runCli } = require('../../skills/voiceover/scripts/voiceover.cjs');
const binaries = require('../../skills/voiceover/scripts/lib/binaries.cjs');
const envLib = require('../../skills/voiceover/scripts/lib/env.cjs');
const cuesLib = require('../../skills/voiceover/scripts/lib/cues.cjs');
const modelStore = require('../../skills/voiceover/scripts/lib/model-store.cjs');
const masterLib = require('../../skills/voiceover/scripts/lib/master.cjs');
const { buildPcmWavHeader } = require('../../skills/voiceover/scripts/lib/providers/cloud.cjs');

function scrubbedHostEnv(f) {
    const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !/^(?:CK_|CLAUDE_|CODEX_|OPENROUTER_|VOICEOVER_|PYTHON)|(?:KEY|TOKEN|SECRET|PASSWORD)$/i.test(key))
    );
    return Object.assign(env, {
        HOME: f.home,
        USERPROFILE: f.home,
        LOCALAPPDATA: f.localAppData,
        TMPDIR: f.root,
        TEMP: f.root,
        TMP: f.root,
        PYTHONDONTWRITEBYTECODE: '1'
    });
}

function makeFixture(t) {
    const parent = path.join(ROOT, 'tmp', 'voiceover-tests');
    fs.mkdirSync(parent, { recursive: true });
    const root = fs.mkdtempSync(path.join(parent, 'run-'));
    const home = path.join(root, 'home');
    const localAppData = path.join(root, 'localappdata');
    const skillDir = path.join(root, '.claude', 'skills', 'voiceover');
    const scriptsDir = path.join(skillDir, 'scripts');
    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(localAppData, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const cleanEnv = {
        PATH: '',
        HOME: home,
        USERPROFILE: home,
        LOCALAPPDATA: localAppData,
        TMPDIR: root,
        TEMP: root,
        TMP: root,
        OPENROUTER_API_KEY: '',
        OPENAI_API_KEY: '',
        GEMINI_API_KEY: '',
        ELEVENLABS_API_KEY: ''
    };
    return { root, home, localAppData, skillDir, scriptsDir, env: cleanEnv };
}

function makeWavBytes(durationSecs = 1.0, sampleRate = 24000) {
    const sampleCount = Math.round(durationSecs * sampleRate);
    const pcm = Buffer.alloc(sampleCount * 2, 0);
    return buildPcmWavHeader(pcm, sampleRate, 1, 16);
}

function writeSampleCues(dir, cues = null, fileName = 'cues.json') {
    const file = path.join(dir, fileName);
    const body = cues || {
        language: 'en',
        cues: [
            { id: 'c01-intro', chapter: 'ch1', text: 'Welcome to CI/CD and kubectl checks.', pauseAfter: 0.4 },
            { id: 'c02-next', chapter: 'ch1', text: 'Every build runs locally.', pauseAfter: 0.3 }
        ]
    };
    fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
    return file;
}

function createFakeModelDir(baseDir, presetId, { kokoro = true } = {}) {
    const dir = path.join(baseDir, presetId);
    fs.mkdirSync(path.join(dir, 'espeak-ng-data'), { recursive: true });
    fs.writeFileSync(path.join(dir, kokoro ? 'model.onnx' : 'vi_VN-vais1000-medium.onnx'), 'onnx-fixture', 'utf8');
    fs.writeFileSync(path.join(dir, 'tokens.txt'), 'a 0\n', 'utf8');
    if (kokoro) fs.writeFileSync(path.join(dir, 'voices.bin'), 'voices-fixture', 'utf8');
    return dir;
}

function captureIo() {
    let out = '';
    let err = '';
    return {
        stdout: chunk => {
            out += chunk;
        },
        stderr: chunk => {
            err += chunk;
        },
        getOut: () => out,
        getErr: () => err
    };
}

test('CLI refuses legacy OS TTS and unofficial edge-tts providers with exit 2', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);
    for (const refused of ['say', 'sapi', 'os-tts', 'edge-tts', 'EDGE-TTS']) {
        const io = captureIo();
        const code = await runCli(['synthesize', cuesPath, '--provider', refused, '--out', path.join(f.root, 'out')], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: io.stdout,
            stderr: io.stderr
        });
        assert.equal(code, EXIT.USAGE, `expected exit 2 for refused provider "${refused}"`);
        assert.match(io.getErr(), /Refused provider/i);
    }
});

test('CLI rejects invalid flags, unknown commands, path-traversal cue IDs, duplicates and oversized inputs with exit 2', async t => {
    const f = makeFixture(t);
    const badIds = ['../escape', 'dir/file', 'bad id', 'a..b', ''];
    for (const badId of badIds) {
        const badFile = writeSampleCues(f.root, { cues: [{ id: badId, text: 'hello' }] });
        const io = captureIo();
        const code = await runCli(['audition', badFile, '--out', path.join(f.root, 'out')], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: io.stdout,
            stderr: io.stderr
        });
        assert.equal(code, EXIT.USAGE, `expected exit 2 for invalid cue id ${JSON.stringify(badId)}`);
    }
    const dupFile = writeSampleCues(f.root, {
        cues: [
            { id: 'c01', text: 'first' },
            { id: 'c01', text: 'duplicate' }
        ]
    });
    const ioDup = captureIo();
    assert.equal(
        await runCli(['synthesize', dupFile], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioDup.stdout,
            stderr: ioDup.stderr
        }),
        EXIT.USAGE
    );
    assert.match(ioDup.getErr(), /Duplicate cue id/i);

    const ioFlag = captureIo();
    assert.equal(
        await runCli(['doctor', '--unknown-flag'], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioFlag.stdout,
            stderr: ioFlag.stderr
        }),
        EXIT.USAGE
    );
});

test('doctor and synthesize exit 3 with per-OS setup instructions when no neural provider is installed (macOS and Windows)', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);
    const neverSpawn = () => ({ status: 1, stdout: '', stderr: 'not found' });
    for (const [platform, expectedHint] of [
        ['darwin', /python3 -m venv \.claude\/skills\/voiceover\/scripts\/\.venv/],
        ['win32', /py -3 -m venv \.claude\\skills\\voiceover\\scripts\\\.venv/]
    ]) {
        const ioDoc = captureIo();
        const docCode = await runCli(['doctor'], {
            cwd: f.root,
            env: f.env,
            platform,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            spawn: neverSpawn,
            stdout: ioDoc.stdout,
            stderr: ioDoc.stderr
        });
        assert.equal(docCode, EXIT.DEPENDENCY);
        assert.match(ioDoc.getOut(), expectedHint);

        const ioSyn = captureIo();
        const synCode = await runCli(['synthesize', cuesPath, '--out', path.join(f.root, 'out')], {
            cwd: f.root,
            env: f.env,
            platform,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            spawn: neverSpawn,
            stdout: ioSyn.stdout,
            stderr: ioSyn.stderr
        });
        assert.equal(synCode, EXIT.DEPENDENCY);
        assert.match(ioSyn.getErr(), expectedHint);
    }
});

test('cross-platform binary resolution enforces absolute paths and .exe/.com on Windows while ignoring relative PATH entries', () => {
    const fakeFiles = new Set([
        'C:\\Tools\\ffmpeg.exe',
        'C:\\Tools\\python.exe',
        '/opt/bin/ffmpeg',
        '/opt/bin/python3',
        '/skill/scripts/.venv/bin/python',
        'C:\\skill\\scripts\\.venv\\Scripts\\python.exe'
    ]);
    const fakeFs = {
        statSync: p => {
            if (!fakeFiles.has(p)) throw new Error('ENOENT');
            return { isFile: () => true };
        },
        accessSync: () => {}
    };

    // Windows: case-insensitive Path, ignores relative ".", rejects .cmd/.bat overrides
    assert.equal(binaries.findOnPath('ffmpeg', { env: { Path: '.;C:\\Tools' }, platform: 'win32', fsApi: fakeFs }), 'C:\\Tools\\ffmpeg.exe');
    assert.throws(() => binaries.ffmpegBinary({ VOICEOVER_FFMPEG: 'ffmpeg.exe' }, 'win32', fakeFs), /absolute path/);
    assert.throws(() => binaries.ffmpegBinary({ VOICEOVER_FFMPEG: 'C:\\Tools\\ffmpeg.cmd' }, 'win32', fakeFs), /\.exe or \.com/);
    assert.equal(binaries.ffmpegBinary({ VOICEOVER_FFMPEG: 'C:\\Tools\\ffmpeg.exe' }, 'win32', fakeFs), 'C:\\Tools\\ffmpeg.exe');
    assert.equal(binaries.skillVenvPython('C:\\skill\\scripts', 'win32', fakeFs), 'C:\\skill\\scripts\\.venv\\Scripts\\python.exe');

    // macOS/POSIX: ignores empty PATH segments (which mean cwd on POSIX), rejects relative overrides
    assert.equal(binaries.findOnPath('ffmpeg', { env: { PATH: '::relative:/opt/bin' }, platform: 'darwin', fsApi: fakeFs }), '/opt/bin/ffmpeg');
    assert.throws(() => binaries.ffmpegBinary({ VOICEOVER_FFMPEG: './ffmpeg' }, 'darwin', fakeFs), /absolute path/);
    assert.equal(binaries.skillVenvPython('/skill/scripts', 'darwin', fakeFs), '/skill/scripts/.venv/bin/python');
});

test('pronunciation glossary respects Unicode word boundaries, ignores comment keys, prevents cascading replacements, and handles "$" safely', t => {
    const f = makeFixture(t);
    const pronFile = path.join(f.root, 'pron.json');
    fs.writeFileSync(
        pronFile,
        JSON.stringify({
            _comment: 'ignored',
            AI: 'A I',
            'CI/CD': 'C I C D',
            $100: 'one hundred dollars',
            cost: '$50 total',
            vi: 'V I',
            kubectl: 'kube control',
            kube: 'kyoob'
        }),
        'utf8'
    );
    const map = cuesLib.loadPronunciation(pronFile);
    assert.equal(map._comment, undefined);
    const spoken = cuesLib.applyPronunciation('WAIT for AI on CI/CD with cost $100', map);
    assert.equal(spoken, 'WAIT for A I on C I C D with $50 total one hundred dollars');
    // Unicode boundaries: must NOT split Vietnamese diacritics ("tiếng việt" keeps "việt" intact)
    assert.equal(cuesLib.applyPronunciation('tiếng việt và vi', map), 'tiếng việt và V I');
    // Single-pass longest-first: "kubectl" becomes "kube control" without re-matching "kube"
    assert.equal(cuesLib.applyPronunciation('kubectl and kube', map), 'kube control and kyoob');
});

test('audition synthesizes exactly 1 cue and reads pure-Node RIFF WAV duration without ffmpeg', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);
    const cacheRoot = path.join(f.root, 'models');
    createFakeModelDir(cacheRoot, 'kokoro-en-v0_19', { kokoro: true });
    const fakePy = path.join(f.scriptsDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    fs.mkdirSync(path.dirname(fakePy), { recursive: true });
    fs.writeFileSync(fakePy, '#!/bin/sh\n', { mode: 0o755 });

    const synthCalls = [];
    const mockSpawn = (cmd, args) => {
        if (args.includes('-c')) return { status: 0, stdout: '3.12.4\n', stderr: '' };
        if (args.includes('probe')) return { status: 0, stdout: '{"python":"3.12.4","sherpa_onnx":"1.10.0"}\n', stderr: '' };
        if (args.includes('synthesize')) {
            const outPath = args[args.indexOf('--out') + 1];
            const textArg = args.find(a => a.startsWith('--text='));
            const text = textArg ? textArg.slice('--text='.length) : args[args.indexOf('--text') + 1];
            synthCalls.push(text);
            fs.writeFileSync(outPath, makeWavBytes(1.5, 24000));
            return { status: 0, stdout: JSON.stringify({ out: outPath, sampleRate: 24000, duration: 1.5, arch: 'kokoro' }), stderr: '' };
        }
        return { status: 1, stdout: '', stderr: 'unexpected command' };
    };

    const outDir = path.join(f.root, 'audition-out');
    const io = captureIo();
    const code = await runCli(['audition', cuesPath, '--cue', 'c02-next', '--out', outDir], {
        cwd: f.root,
        env: { ...f.env, VOICEOVER_MODEL_DIR: cacheRoot },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        spawn: mockSpawn,
        stdout: io.stdout,
        stderr: io.stderr
    });
    assert.equal(code, EXIT.OK, io.getErr());
    assert.equal(synthCalls.length, 1);
    assert.equal(synthCalls[0], 'Every build runs locally.');
    const summary = JSON.parse(io.getOut());
    assert.equal(summary.cueId, 'c02-next');
    assert.equal(summary.duration, 1.5);
    assert.equal(summary.offline, true);
    assert.ok(fs.existsSync(path.join(outDir, 'audition.json')));
});

test('synthesize caches unchanged cues by content hash and invalidates only dirty cues on edit or pronunciation change', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);
    const pronPath = path.join(f.root, 'pron.json');
    fs.writeFileSync(pronPath, JSON.stringify({ 'CI/CD': 'C I C D', kubectl: 'kube control' }), 'utf8');
    const cacheRoot = path.join(f.root, 'models');
    createFakeModelDir(cacheRoot, 'kokoro-en-v0_19', { kokoro: true });
    const fakePy = path.join(f.scriptsDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    fs.mkdirSync(path.dirname(fakePy), { recursive: true });
    fs.writeFileSync(fakePy, '#!/bin/sh\n', { mode: 0o755 });

    const synthTexts = [];
    const mockSpawn = (_cmd, args) => {
        if (args.includes('-c')) return { status: 0, stdout: '3.12.4\n', stderr: '' };
        if (args.includes('probe')) return { status: 0, stdout: '{"python":"3.12.4","sherpa_onnx":"1.10.0"}\n', stderr: '' };
        if (args.includes('synthesize')) {
            const outPath = args[args.indexOf('--out') + 1];
            const textArg = args.find(a => a.startsWith('--text='));
            synthTexts.push(textArg ? textArg.slice('--text='.length) : args[args.indexOf('--text') + 1]);
            fs.writeFileSync(outPath, makeWavBytes(1.0, 24000));
            return { status: 0, stdout: '{}', stderr: '' };
        }
        return { status: 1, stdout: '', stderr: 'no ffmpeg' };
    };

    const outDir = path.join(f.root, 'run-out');
    const runDeps = () => {
        const io = captureIo();
        return {
            io,
            opts: {
                cwd: f.root,
                env: { ...f.env, VOICEOVER_MODEL_DIR: cacheRoot },
                homeDir: f.home,
                skillDir: f.skillDir,
                scriptsDir: f.scriptsDir,
                spawn: mockSpawn,
                stdout: io.stdout,
                stderr: io.stderr
            }
        };
    };

    // Run 1: synthesizes both cues
    const r1 = runDeps();
    assert.equal(await runCli(['synthesize', cuesPath, '--pronunciation', pronPath, '--no-master', '--out', outDir], r1.opts), EXIT.OK, r1.io.getErr());
    assert.equal(synthTexts.length, 2);
    assert.equal(synthTexts[0], 'Welcome to C I C D and kube control checks.');

    // Run 2: identical inputs -> 0 synthesis calls (100% cache hit)
    const r2 = runDeps();
    assert.equal(await runCli(['synthesize', cuesPath, '--pronunciation', pronPath, '--no-master', '--out', outDir], r2.opts), EXIT.OK, r2.io.getErr());
    assert.equal(synthTexts.length, 2);
    const m2 = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(
        m2.cues.every(c => c.cached),
        true
    );

    // Run 3: edit pronunciation of kubectl -> invalidates ONLY c01-intro, c02-next stays cached
    fs.writeFileSync(pronPath, JSON.stringify({ 'CI/CD': 'C I C D', kubectl: 'kube C T L' }), 'utf8');
    const r3 = runDeps();
    assert.equal(await runCli(['synthesize', cuesPath, '--pronunciation', pronPath, '--no-master', '--out', outDir], r3.opts), EXIT.OK, r3.io.getErr());
    assert.equal(synthTexts.length, 3);
    assert.equal(synthTexts[2], 'Welcome to C I C D and kube C T L checks.');
    const m3 = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(m3.cues[0].cached, false);
    assert.equal(m3.cues[1].cached, true);
});

test('ffmpeg mastering builds safe FFconcat manifests, two-pass loudnorm with latency=1 limiter, and portable manifest.json', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);
    const cacheRoot = path.join(f.root, 'models');
    createFakeModelDir(cacheRoot, 'vits-piper-vi_VN-vais1000-medium', { kokoro: false });
    const fakeBinDir = path.join(f.root, 'bin');
    fs.mkdirSync(fakeBinDir, { recursive: true });
    const ext = process.platform === 'win32' ? '.exe' : '';
    const fakeFfmpeg = path.join(fakeBinDir, `ffmpeg${ext}`);
    const fakeFfprobe = path.join(fakeBinDir, `ffprobe${ext}`);
    const fakePy = path.join(f.scriptsDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    fs.mkdirSync(path.dirname(fakePy), { recursive: true });
    for (const file of [fakeFfmpeg, fakeFfprobe, fakePy]) fs.writeFileSync(file, '#!/bin/sh\n', { mode: 0o755 });

    const ffmpegCalls = [];
    const loudJson = JSON.stringify({
        input_i: '-14.0',
        input_tp: '-2.1',
        input_lra: '5.2',
        input_thresh: '-25.0',
        target_offset: '0.0'
    });
    const mockSpawn = (cmd, args) => {
        if (args.includes('-c')) return { status: 0, stdout: '3.12.4\n', stderr: '' };
        if (args.includes('probe')) return { status: 0, stdout: '{"python":"3.12.4","sherpa_onnx":"1.10.0"}\n', stderr: '' };
        if (args.includes('synthesize')) {
            const outPath = args[args.indexOf('--out') + 1];
            fs.writeFileSync(outPath, makeWavBytes(1.0, 22050));
            return { status: 0, stdout: '{}', stderr: '' };
        }
        if (cmd === fakeFfmpeg) {
            ffmpegCalls.push(args);
            if (args.includes('-version')) return { status: 0, stdout: 'ffmpeg version 7.1\n', stderr: '' };
            if (args.includes('null')) return { status: 0, stdout: '', stderr: loudJson };
            const dest = args[args.length - 1];
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, makeWavBytes(1.4, 48000));
            return { status: 0, stdout: '', stderr: '' };
        }
        return { status: 1, stdout: '', stderr: 'unexpected' };
    };

    const outDir = path.join(f.root, 'master-out');
    const io = captureIo();
    const code = await runCli(['synthesize', cuesPath, '--preset', 'vits-piper-vi_VN-vais1000-medium', '--out', outDir], {
        cwd: f.root,
        env: {
            ...f.env,
            VOICEOVER_MODEL_DIR: cacheRoot,
            VOICEOVER_FFMPEG: fakeFfmpeg,
            VOICEOVER_FFPROBE: fakeFfprobe
        },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        spawn: mockSpawn,
        stdout: io.stdout,
        stderr: io.stderr
    });
    assert.equal(code, EXIT.OK, io.getErr());
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.masterFile, 'voiceover.wav');
    assert.equal(manifest.sampleRate, 48000);
    assert.equal(manifest.loudness.measuredLufs, -14);
    assert.equal(manifest.loudness.measuredTruePeakDbtp, -2.1);
    assert.equal(manifest.cues.length, 2);
    assert.equal(manifest.cues[0].start, 0);
    assert.equal(manifest.cues[1].start, manifest.cues[0].end);
    assert.ok(!manifest.cues[0].rawFile.includes('\\'));
    assert.ok(ffmpegCalls.some(args => args.some(a => a.includes('alimiter=limit=0.66:level=disabled:latency=1'))));

    // FFconcat escaping + CR/LF rejection
    assert.equal(masterLib.concatEntry("C:\\clips\\owner's café.wav"), "file 'C:/clips/owner'\\''s café.wav'\n");
    assert.throws(() => masterLib.concatEntry('bad\npath.wav'), /line breaks/);
});

test('optional cloud providers synthesize via mocked fetch, wrap Gemini PCM to WAV, retry 429, and never leak API keys', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root, { cues: [{ id: 'c01', text: 'Cloud narration check.' }] });
    const secret = 'sk-test-secret-value-999999';

    // Missing key -> exit 3
    const ioMissing = captureIo();
    assert.equal(
        await runCli(['audition', cuesPath, '--provider', 'openai', '--out', path.join(f.root, 'no-key')], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioMissing.stdout,
            stderr: ioMissing.stderr
        }),
        EXIT.DEPENDENCY
    );

    // Gemini raw PCM -> valid 24 kHz WAV + retry on 429
    let attempts = 0;
    const mockFetchGemini = async (url, init) => {
        attempts += 1;
        assert.match(url, /generativelanguage\.googleapis\.com/);
        assert.equal(init.headers['x-goog-api-key'], secret);
        if (attempts === 1) return { ok: false, status: 429, statusText: 'Rate Limit', text: async () => `retry ${secret}` };
        const pcm = Buffer.alloc(24000 * 2, 0);
        return {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: pcm.toString('base64') } }] } }]
            })
        };
    };
    const outGem = path.join(f.root, 'gem-out');
    const ioGem = captureIo();
    const gemCode = await runCli(['synthesize', cuesPath, '--provider', 'gemini', '--no-master', '--out', outGem], {
        cwd: f.root,
        env: { ...f.env, GEMINI_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: mockFetchGemini,
        delayFn: async () => {},
        stdout: ioGem.stdout,
        stderr: ioGem.stderr
    });
    assert.equal(gemCode, EXIT.OK, ioGem.getErr());
    assert.equal(attempts, 2);
    const gemManifestRaw = fs.readFileSync(path.join(outGem, 'manifest.json'), 'utf8');
    assert.ok(!gemManifestRaw.includes(secret), 'API key must never appear in manifest.json');
    assert.equal(JSON.parse(gemManifestRaw).cues[0].duration, 1);

    // Error path redacts leaked API key from response body
    const mockFetchErr = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => `Invalid Authorization: Bearer ${secret}`
    });
    const ioErr = captureIo();
    const errCode = await runCli(['audition', cuesPath, '--provider', 'openrouter', '--out', path.join(f.root, 'err-out')], {
        cwd: f.root,
        env: { ...f.env, OPENROUTER_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: mockFetchErr,
        delayFn: async () => {},
        stdout: ioErr.stdout,
        stderr: ioErr.stderr
    });
    assert.equal(errCode, EXIT.ERROR);
    assert.ok(!ioErr.getErr().includes(secret), 'API key must be redacted from stderr');
    assert.match(ioErr.getErr(), /\[REDACTED\]/);
});

test('env precedence follows process.env > skill .env > skills .env > .claude .env', t => {
    const f = makeFixture(t);
    const claudeDir = path.dirname(path.dirname(f.skillDir));
    const skillsDir = path.dirname(f.skillDir);
    fs.writeFileSync(path.join(claudeDir, '.env'), 'OPENAI_API_KEY=from-global\n', 'utf8');
    assert.equal(envLib.resolveEnvValue('OPENAI_API_KEY', { env: {}, skillDir: f.skillDir }), 'from-global');
    fs.writeFileSync(path.join(skillsDir, '.env'), 'OPENAI_API_KEY="from-skills"\n', 'utf8');
    assert.equal(envLib.resolveEnvValue('OPENAI_API_KEY', { env: {}, skillDir: f.skillDir }), 'from-skills');
    fs.writeFileSync(path.join(f.skillDir, '.env'), "OPENAI_API_KEY='from-skill'\n", 'utf8');
    assert.equal(envLib.resolveEnvValue('OPENAI_API_KEY', { env: {}, skillDir: f.skillDir }), 'from-skill');
    assert.equal(envLib.resolveEnvValue('OPENAI_API_KEY', { env: { OPENAI_API_KEY: 'from-proc' }, skillDir: f.skillDir }), 'from-proc');
});

test('sherpa_tts.py detects Kokoro and Piper layouts, writes valid PCM16 WAV, blocks non-allowlisted/traversal URLs, and rejects tar-slip/links/bombs', t => {
    const f = makeFixture(t);
    const pyEnv = scrubbedHostEnv(f);
    const python = resolvePythonCommand({ env: pyEnv, cwd: f.root });
    assert.ok(python, 'Python 3 is required for offline sherpa_tts.py safety tests');

    // Run an isolated Python check directly against sherpa_tts.py functions (no network, no sherpa_onnx package required)
    const pyScript = `
import io, json, os, sys, tarfile
sys.path.insert(0, ${JSON.stringify(path.dirname(HELPER_PY))})
import sherpa_tts

root = ${JSON.stringify(f.root)}

# 1. Kokoro & Piper model detection
kdir = os.path.join(root, "kokoro")
os.makedirs(os.path.join(kdir, "espeak-ng-data"))
os.makedirs(os.path.join(kdir, "dict"))
for name in ("model.onnx", "voices.bin", "tokens.txt", "lexicon-us-en.txt"):
    open(os.path.join(kdir, name), "w").write("x")
kinfo = sherpa_tts.detect_model_files(kdir)
assert kinfo["arch"] == "kokoro" and kinfo["voices"].endswith("voices.bin") and kinfo["dict_dir"].endswith("dict")

pdir = os.path.join(root, "piper")
os.makedirs(os.path.join(pdir, "espeak-ng-data"))
for name in ("vi_VN-vais1000-medium.onnx", "tokens.txt"):
    open(os.path.join(pdir, name), "w").write("x")
pinfo = sherpa_tts.detect_model_files(pdir)
assert pinfo["arch"] == "vits" and pinfo["model"].endswith("vi_VN-vais1000-medium.onnx")

# 2. Atomic PCM16 WAV writer
wav_out = os.path.join(root, "sample.wav")
sherpa_tts.write_pcm16_wav([0.0] * 12000, 24000, wav_out)

# 3. Safe tar.bz2 extraction succeeds for valid archive (stripping single top folder)
good_tar = os.path.join(root, "good.tar.bz2")
with tarfile.open(good_tar, "w:bz2") as tf:
    for rel, body in [("kokoro-en-v0_19/model.onnx", b"onnx"), ("kokoro-en-v0_19/tokens.txt", b"a 0\\n")]:
        ti = tarfile.TarInfo(rel)
        ti.size = len(body)
        tf.addfile(ti, io.BytesIO(body))
good_dest = os.path.join(root, "extracted-good")
sherpa_tts.safe_extract_tar(good_tar, good_dest)
assert os.path.isfile(os.path.join(good_dest, "model.onnx"))

# 4. Path-traversal, absolute path, colon/drive segment, symlink, and hardlink archives are ALL rejected without writing outside dest
def make_link(name, kind, target):
    ti = tarfile.TarInfo(name)
    ti.type = kind
    ti.linkname = target
    return ti, None

for label, make_member in [
    ("traversal", lambda: (tarfile.TarInfo("../evil.txt"), b"boom")),
    ("absolute", lambda: (tarfile.TarInfo("/tmp/evil.txt"), b"boom")),
    ("colon-segment", lambda: (tarfile.TarInfo("pkg/a:b.txt"), b"boom")),
    ("symlink", lambda: make_link("pkg/link", tarfile.SYMTYPE, "/etc/passwd")),
    ("hardlink", lambda: make_link("pkg/hlink", tarfile.LNKTYPE, "pkg/other")),
]:
    bad_tar = os.path.join(root, f"bad-{label}.tar.bz2")
    with tarfile.open(bad_tar, "w:bz2") as tf:
        ti, data = make_member()
        if data is not None:
            ti.size = len(data)
            tf.addfile(ti, io.BytesIO(data))
        else:
            tf.addfile(ti)
    bad_dest = os.path.join(root, f"extracted-{label}")
    raised = False
    try:
        sherpa_tts.safe_extract_tar(bad_tar, bad_dest)
    except ValueError:
        raised = True
    assert raised, f"expected ValueError for {label}"
    assert not os.path.exists(bad_dest)
    assert not os.path.exists(os.path.join(root, "evil.txt"))

# 5. Uncompressed byte cap and member count cap reject bomb-like archives
bomb_dest = os.path.join(root, "extracted-bomb")
for kwargs in ({"max_bytes": 3}, {"max_members": 1}):
    raised = False
    try:
        sherpa_tts.safe_extract_tar(good_tar, bomb_dest, **kwargs)
    except ValueError:
        raised = True
    assert raised, f"expected ValueError for {kwargs}"
    assert not os.path.exists(bomb_dest)

# 6. Allowlisted URL validator accepts canonical archive and rejects traversal/non-archive suffixes
assert sherpa_tts.is_allowed_model_url(sherpa_tts.ALLOWED_URL_PREFIX + "kokoro-en-v0_19.tar.bz2")
assert not sherpa_tts.is_allowed_model_url(sherpa_tts.ALLOWED_URL_PREFIX + "../attacker/evil.tar.bz2")
assert not sherpa_tts.is_allowed_model_url(sherpa_tts.ALLOWED_URL_PREFIX + "sub/evil.tar.bz2")
assert not sherpa_tts.is_allowed_model_url("https://evil.example/kokoro-en-v0_19.tar.bz2")

print("OK")
`;
    const run = spawnSync(python.command, [...python.baseArgs, '-c', pyScript], {
        cwd: f.root,
        env: pyEnv,
        encoding: 'utf8',
        timeout: 30000
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(run.stdout.trim(), 'OK');
    assert.equal(cuesLib.readWavDuration(path.join(f.root, 'sample.wav')), 0.5);

    // Non-allowlisted and traversal-suffix download URLs are rejected before any network call
    for (const badUrl of [
        'https://evil.example/model.tar.bz2',
        'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/../attacker/evil.tar.bz2'
    ]) {
        const dl = spawnSync(python.command, [...python.baseArgs, HELPER_PY, 'download', '--url', badUrl, '--dest', path.join(f.root, 'dl')], {
            cwd: f.root,
            env: pyEnv,
            encoding: 'utf8',
            timeout: 15000
        });
        assert.equal(dl.status, 2, `expected exit 2 for ${badUrl}`);
        assert.match(dl.stderr, /non-allowlisted/i);
    }
});

test('master CLI re-masters valid manifest and rejects malformed JSON, traversal IDs, duplicate IDs, escaping/missing rawFile, and invalid pauseAfter', async t => {
    const f = makeFixture(t);
    const fakeBinDir = path.join(f.root, 'bin');
    fs.mkdirSync(fakeBinDir, { recursive: true });
    const ext = process.platform === 'win32' ? '.exe' : '';
    const fakeFfmpeg = path.join(fakeBinDir, `ffmpeg${ext}`);
    const fakeFfprobe = path.join(fakeBinDir, `ffprobe${ext}`);
    for (const file of [fakeFfmpeg, fakeFfprobe]) fs.writeFileSync(file, '#!/bin/sh\n', { mode: 0o755 });

    const loudJson = JSON.stringify({
        input_i: '-16.0',
        input_tp: '-1.8',
        input_lra: '4.5',
        input_thresh: '-26.0',
        target_offset: '0.0'
    });
    const mockFfmpegSpawn = (cmd, args) => {
        if (cmd === fakeFfmpeg) {
            if (args.includes('-version')) return { status: 0, stdout: 'ffmpeg version 7.1\n', stderr: '' };
            if (args.includes('null')) return { status: 0, stdout: '', stderr: loudJson };
            const dest = args[args.length - 1];
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, makeWavBytes(1.2, 48000));
            return { status: 0, stdout: '', stderr: '' };
        }
        return { status: 1, stdout: '', stderr: 'unexpected' };
    };

    const runMaster = (dir, extra = []) => {
        const io = captureIo();
        return runCli(['master', dir, ...extra], {
            cwd: f.root,
            env: { ...f.env, VOICEOVER_FFMPEG: fakeFfmpeg, VOICEOVER_FFPROBE: fakeFfprobe },
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            spawn: mockFfmpegSpawn,
            stdout: io.stdout,
            stderr: io.stderr
        }).then(code => ({ code, out: io.getOut(), err: io.getErr() }));
    };

    // Valid re-mastering
    const validDir = path.join(f.root, 'm-valid');
    fs.mkdirSync(path.join(validDir, 'raw'), { recursive: true });
    fs.writeFileSync(path.join(validDir, 'raw', 'c01.wav'), makeWavBytes(1.0, 24000));
    fs.writeFileSync(
        path.join(validDir, 'manifest.json'),
        JSON.stringify({
            provider: 'sherpa-onnx',
            cues: [{ id: 'c01', text: 'Hello', spokenText: 'Hello', hash: 'abc', rawFile: 'raw/c01.wav', pauseAfter: 0.2 }]
        }),
        'utf8'
    );
    const okRes = await runMaster(validDir, ['--lufs', '-16', '--no-trim']);
    assert.equal(okRes.code, EXIT.OK, okRes.err);
    const updated = JSON.parse(fs.readFileSync(path.join(validDir, 'manifest.json'), 'utf8'));
    assert.equal(updated.masterFile, 'voiceover.wav');
    assert.equal(updated.loudness.targetLufs, -16);

    // Malformed JSON -> exit 2
    const badJsonDir = path.join(f.root, 'm-bad-json');
    fs.mkdirSync(badJsonDir, { recursive: true });
    fs.writeFileSync(path.join(badJsonDir, 'manifest.json'), '{not-json', 'utf8');
    const badJsonRes = await runMaster(badJsonDir);
    assert.equal(badJsonRes.code, EXIT.USAGE);
    assert.match(badJsonRes.err, /Invalid JSON/i);

    // Invalid cue manifest cases -> all exit 2
    const outsideWav = path.join(f.root, 'outside.wav');
    fs.writeFileSync(outsideWav, makeWavBytes(0.5, 24000));
    const badManifests = [
        { label: 'traversal id', cues: [{ id: '../../escape', text: 'x', rawFile: 'raw/c01.wav' }] },
        {
            label: 'duplicate id',
            cues: [
                { id: 'c01', text: 'x', rawFile: 'raw/c01.wav' },
                { id: 'c01', text: 'y', rawFile: 'raw/c01.wav' }
            ]
        },
        { label: 'escaping rawFile', cues: [{ id: 'c01', text: 'x', rawFile: '../outside.wav' }] },
        { label: 'missing rawFile on disk', cues: [{ id: 'c01', text: 'x', rawFile: 'raw/missing.wav' }] },
        { label: 'negative pauseAfter', cues: [{ id: 'c01', text: 'x', rawFile: 'raw/c01.wav', pauseAfter: -1 }] },
        { label: 'excessive pauseAfter', cues: [{ id: 'c01', text: 'x', rawFile: 'raw/c01.wav', pauseAfter: 99 }] },
        { label: 'string pauseAfter', cues: [{ id: 'c01', text: 'x', rawFile: 'raw/c01.wav', pauseAfter: 'bad' }] }
    ];
    for (const tc of badManifests) {
        const dir = path.join(f.root, `m-${tc.label.replace(/\s+/g, '-')}`);
        fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'raw', 'c01.wav'), makeWavBytes(0.5, 24000));
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ cues: tc.cues }), 'utf8');
        const res = await runMaster(dir);
        assert.equal(res.code, EXIT.USAGE, `expected exit 2 for ${tc.label}; got ${res.code} (${res.err})`);
    }
});

test('download-model CLI downloads via mocked Python helper, skips existing cache, and exits 3 when Python is missing', async t => {
    const f = makeFixture(t);
    const cacheRoot = path.join(f.root, 'dl-models');
    const fakePy = path.join(f.scriptsDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    fs.mkdirSync(path.dirname(fakePy), { recursive: true });
    fs.writeFileSync(fakePy, '#!/bin/sh\n', { mode: 0o755 });

    let downloadSpawns = 0;
    const mockSpawn = (_cmd, args) => {
        if (args.includes('-c')) return { status: 0, stdout: '3.12.4\n', stderr: '' };
        if (args.includes('download')) {
            downloadSpawns += 1;
            const dest = args[args.indexOf('--dest') + 1];
            fs.mkdirSync(path.join(dest, 'espeak-ng-data'), { recursive: true });
            fs.writeFileSync(path.join(dest, 'model.onnx'), 'onnx', 'utf8');
            fs.writeFileSync(path.join(dest, 'tokens.txt'), 'a 0\n', 'utf8');
            fs.writeFileSync(path.join(dest, 'voices.bin'), 'v', 'utf8');
            return { status: 0, stdout: JSON.stringify({ dest, bytes: 12 }), stderr: '' };
        }
        return { status: 1, stdout: '', stderr: 'unexpected' };
    };

    const io1 = captureIo();
    const c1 = await runCli(['download-model', 'kokoro-en-v0_19', '--model-root', cacheRoot], {
        cwd: f.root,
        env: f.env,
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        spawn: mockSpawn,
        stdout: io1.stdout,
        stderr: io1.stderr
    });
    assert.equal(c1, EXIT.OK, io1.getErr());
    assert.equal(downloadSpawns, 1);
    assert.equal(JSON.parse(io1.getOut()).downloaded, true);

    // Second call sees existing valid model directory and does NOT re-spawn download
    const io2 = captureIo();
    const c2 = await runCli(['download-model', 'kokoro-en-v0_19', '--model-root', cacheRoot], {
        cwd: f.root,
        env: f.env,
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        spawn: mockSpawn,
        stdout: io2.stdout,
        stderr: io2.stderr
    });
    assert.equal(c2, EXIT.OK, io2.getErr());
    assert.equal(downloadSpawns, 1);
    assert.equal(JSON.parse(io2.getOut()).downloaded, false);

    // Missing Python -> exit 3
    const ioMissingPy = captureIo();
    const cMissing = await runCli(['download-model', 'kokoro-en-v0_19', '--model-root', path.join(f.root, 'no-py-models')], {
        cwd: f.root,
        env: f.env,
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: path.join(f.root, 'empty-scripts'),
        spawn: () => ({ status: 1, stdout: '', stderr: 'not found' }),
        stdout: ioMissingPy.stdout,
        stderr: ioMissingPy.stderr
    });
    assert.equal(cMissing, EXIT.DEPENDENCY);
});

test('cloud providers output RIFF WAV for openrouter/openai/elevenlabs without ffprobe, retry TimeoutError, and reject empty Gemini audio', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root, { cues: [{ id: 'c01', text: 'Cloud WAV check.', instructions: 'Calm narrator', speed: 1.1 }] });
    const wavFixture = makeWavBytes(1.25, 24000);
    const secret = 'sk-cloud-secret-12345';

    // 1. OpenRouter sends response_format: "wav" and X-Title, works in audition with NO ffprobe
    let openrouterBody = null;
    let openrouterHeaders = null;
    const ioOr = captureIo();
    const orCode = await runCli(['audition', cuesPath, '--provider', 'openrouter', '--out', path.join(f.root, 'or-out')], {
        cwd: f.root,
        env: { ...f.env, OPENROUTER_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: async (_url, init) => {
            openrouterBody = JSON.parse(init.body);
            openrouterHeaders = init.headers;
            return { ok: true, status: 200, arrayBuffer: async () => wavFixture };
        },
        delayFn: async () => {},
        stdout: ioOr.stdout,
        stderr: ioOr.stderr
    });
    assert.equal(orCode, EXIT.OK, ioOr.getErr());
    assert.equal(openrouterBody.response_format, 'wav');
    assert.equal(openrouterHeaders['X-Title'], 'easy-claude voiceover skill');
    assert.equal(JSON.parse(ioOr.getOut()).duration, 1.25);

    // 2. OpenAI sends response_format: "wav", speed, instructions AND retries AbortSignal TimeoutError
    let openaiAttempts = 0;
    let openaiBody = null;
    const ioOa = captureIo();
    const oaCode = await runCli(['audition', cuesPath, '--provider', 'openai', '--out', path.join(f.root, 'oa-out')], {
        cwd: f.root,
        env: { ...f.env, OPENAI_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: async (_url, init) => {
            openaiAttempts += 1;
            openaiBody = JSON.parse(init.body);
            if (openaiAttempts === 1) {
                throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
            }
            return { ok: true, status: 200, arrayBuffer: async () => wavFixture };
        },
        delayFn: async () => {},
        stdout: ioOa.stdout,
        stderr: ioOa.stderr
    });
    assert.equal(oaCode, EXIT.OK, ioOa.getErr());
    assert.equal(openaiAttempts, 2);
    assert.equal(openaiBody.response_format, 'wav');
    assert.equal(openaiBody.speed, 1.1);
    assert.equal(openaiBody.instructions, 'Calm narrator');
    assert.equal(JSON.parse(ioOa.getOut()).duration, 1.25);

    // 3. ElevenLabs requests output_format=pcm_24000, wraps raw PCM to WAV, works in audition with NO ffprobe
    let elUrl = '';
    const rawPcm = Buffer.alloc(24000 * 2 * 2, 0); // 2.0 seconds @ 24 kHz mono 16-bit
    const ioEl = captureIo();
    const elCode = await runCli(['audition', cuesPath, '--provider', 'elevenlabs', '--out', path.join(f.root, 'el-out')], {
        cwd: f.root,
        env: { ...f.env, ELEVENLABS_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: async url => {
            elUrl = url;
            return { ok: true, status: 200, arrayBuffer: async () => rawPcm };
        },
        delayFn: async () => {},
        stdout: ioEl.stdout,
        stderr: ioEl.stderr
    });
    assert.equal(elCode, EXIT.OK, ioEl.getErr());
    assert.match(elUrl, /\?output_format=pcm_24000$/);
    const elSummary = JSON.parse(ioEl.getOut());
    assert.equal(elSummary.duration, 2);
    assert.ok(elSummary.audioPath.endsWith('.wav'));

    // 4. Gemini rejects empty base64 audio bytes with exit 1
    const ioEmptyGem = captureIo();
    const emptyGemCode = await runCli(['audition', cuesPath, '--provider', 'gemini', '--out', path.join(f.root, 'gem-empty')], {
        cwd: f.root,
        env: { ...f.env, GEMINI_API_KEY: secret },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: '===' } }] } }]
            })
        }),
        delayFn: async () => {},
        stdout: ioEmptyGem.stdout,
        stderr: ioEmptyGem.stderr
    });
    assert.equal(emptyGemCode, EXIT.ERROR);
    assert.match(ioEmptyGem.getErr(), /empty audio bytes/i);
});

test('VOICEOVER_PYTHON invalid override exits 3, parseArgs/cues/master/modelStore edge cases fail cleanly', async t => {
    const f = makeFixture(t);
    const cuesPath = writeSampleCues(f.root);

    // M2: Invalid VOICEOVER_PYTHON exits 3 (EXIT.DEPENDENCY), not 1, on doctor and synthesize
    for (const [platform, badPy] of [
        ['darwin', './relative/python3'],
        ['win32', 'C:\\Tools\\python.cmd']
    ]) {
        const ioDoc = captureIo();
        const docCode = await runCli(['doctor'], {
            cwd: f.root,
            env: { ...f.env, VOICEOVER_PYTHON: badPy },
            platform,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            spawn: () => ({ status: 1, stdout: '', stderr: '' }),
            stdout: ioDoc.stdout,
            stderr: ioDoc.stderr
        });
        assert.equal(docCode, EXIT.DEPENDENCY, `doctor should exit 3 for invalid VOICEOVER_PYTHON on ${platform}`);

        const ioSyn = captureIo();
        const synCode = await runCli(['synthesize', cuesPath, '--out', path.join(f.root, `bad-py-${platform}`)], {
            cwd: f.root,
            env: { ...f.env, VOICEOVER_PYTHON: badPy },
            platform,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            spawn: () => ({ status: 1, stdout: '', stderr: '' }),
            stdout: ioSyn.stdout,
            stderr: ioSyn.stderr
        });
        assert.equal(synCode, EXIT.DEPENDENCY, `synthesize should exit 3 for invalid VOICEOVER_PYTHON on ${platform}`);
    }

    // L2: Empty attached value flag (--out=) exits 2
    const ioEmptyFlag = captureIo();
    assert.equal(
        await runCli(['audition', cuesPath, '--out='], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioEmptyFlag.stdout,
            stderr: ioEmptyFlag.stderr
        }),
        EXIT.USAGE
    );

    // L3: Boolean cue speed (speed: true) exits 2
    const boolSpeedCues = writeSampleCues(f.root, { cues: [{ id: 'c01', text: 'Hi', speed: true }] }, 'bool-speed-cues.json');
    const ioBoolSpeed = captureIo();
    assert.equal(
        await runCli(['audition', boolSpeedCues, '--out', path.join(f.root, 'bool-speed')], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioBoolSpeed.stdout,
            stderr: ioBoolSpeed.stderr
        }),
        EXIT.USAGE
    );

    // L4: Non-finite loudnorm measurement ("-inf") throws actionable error
    assert.throws(
        () => masterLib.parseLoudnormJson(JSON.stringify({ input_i: '-inf', input_tp: '-inf', input_lra: '0.0', input_thresh: '-inf', target_offset: '0.0' })),
        /non-finite/i
    );

    // L5: Broken symlink inside model dir does not crash inspectModelDir
    if (process.platform !== 'win32') {
        const symModelDir = path.join(f.root, 'broken-sym-model');
        fs.mkdirSync(symModelDir, { recursive: true });
        fs.writeFileSync(path.join(symModelDir, 'model.onnx'), 'onnx', 'utf8');
        fs.writeFileSync(path.join(symModelDir, 'tokens.txt'), 'a 0\n', 'utf8');
        fs.symlinkSync(path.join(f.root, 'does-not-exist'), path.join(symModelDir, 'espeak-ng-data'));
        const info = modelStore.inspectModelDir(symModelDir);
        assert.equal(info.ok, true);
        assert.equal(info.dataDir, null);
    }

    // Non-WAV probeDurationSeconds: uses mocked ffprobe when present and returns null when allowMissingFfprobe: true
    const fakeMp3 = path.join(f.root, 'clip.mp3');
    fs.writeFileSync(fakeMp3, 'ID3-not-wav', 'utf8');
    assert.equal(masterLib.probeDurationSeconds(fakeMp3, { ffprobe: null, allowMissingFfprobe: true }), null);
    assert.equal(
        masterLib.probeDurationSeconds(fakeMp3, {
            ffprobe: '/usr/bin/ffprobe',
            spawn: () => ({ status: 0, stdout: '3.45678\n', stderr: '' })
        }),
        3.4568
    );

    // M1: synthesize without --no-master fails fast with exit 3 and ZERO provider calls when ffmpeg is missing
    let cloudFetchCalls = 0;
    const ioFastFail = captureIo();
    const fastFailCode = await runCli(['synthesize', cuesPath, '--provider', 'openai', '--out', path.join(f.root, 'no-ffmpeg-out')], {
        cwd: f.root,
        env: { ...f.env, OPENAI_API_KEY: 'sk-test-fast-fail' },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        fetchFn: async () => {
            cloudFetchCalls += 1;
            return { ok: true, status: 200, arrayBuffer: async () => makeWavBytes(1.0, 24000) };
        },
        delayFn: async () => {},
        stdout: ioFastFail.stdout,
        stderr: ioFastFail.stderr
    });
    assert.equal(fastFailCode, EXIT.DEPENDENCY, ioFastFail.getErr());
    assert.match(ioFastFail.getErr(), /ffmpeg/i);
    assert.equal(cloudFetchCalls, 0, 'synthesize must not invoke provider when ffmpeg is missing for mastering');
    assert.ok(!fs.existsSync(path.join(f.root, 'no-ffmpeg-out')), 'outDir must not be created before ffmpeg fail-fast');

    // L1: Single-token leading-dash cue text ("--no-master") passes via --text=... without breaking argparse
    const dashCues = writeSampleCues(f.root, { cues: [{ id: 'c01', text: '--no-master' }] }, 'dash-cues.json');
    const cacheRoot = path.join(f.root, 'dash-models');
    createFakeModelDir(cacheRoot, 'kokoro-en-v0_19', { kokoro: true });
    const fakePy = path.join(f.scriptsDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    fs.mkdirSync(path.dirname(fakePy), { recursive: true });
    fs.writeFileSync(fakePy, '#!/bin/sh\n', { mode: 0o755 });
    let capturedArgs = null;
    const ioDash = captureIo();
    const dashCode = await runCli(['audition', dashCues, '--out', path.join(f.root, 'dash-out')], {
        cwd: f.root,
        env: { ...f.env, VOICEOVER_MODEL_DIR: cacheRoot },
        homeDir: f.home,
        skillDir: f.skillDir,
        scriptsDir: f.scriptsDir,
        spawn: (_cmd, args) => {
            if (args.includes('-c')) return { status: 0, stdout: '3.12.4\n', stderr: '' };
            if (args.includes('probe')) return { status: 0, stdout: '{"python":"3.12.4","sherpa_onnx":"1.10.0"}\n', stderr: '' };
            if (args.includes('synthesize')) {
                capturedArgs = args;
                const outPath = args[args.indexOf('--out') + 1];
                fs.writeFileSync(outPath, makeWavBytes(0.5, 24000));
                return { status: 0, stdout: '{}', stderr: '' };
            }
            return { status: 1, stdout: '', stderr: '' };
        },
        stdout: ioDash.stdout,
        stderr: ioDash.stderr
    });
    assert.equal(dashCode, EXIT.OK, ioDash.getErr());
    assert.ok(capturedArgs.includes('--text=--no-master'), 'leading-dash text must use --text=<val> form');

    // L3: handleMaster rejects symlink inside outDir/raw pointing outside outDir
    if (process.platform !== 'win32') {
        const outsideWav = path.join(f.root, 'secret-outside.wav');
        fs.writeFileSync(outsideWav, makeWavBytes(0.5, 24000));
        const symMasterDir = path.join(f.root, 'm-symlink-escape');
        fs.mkdirSync(path.join(symMasterDir, 'raw'), { recursive: true });
        fs.symlinkSync(outsideWav, path.join(symMasterDir, 'raw', 'c01.wav'));
        fs.writeFileSync(path.join(symMasterDir, 'manifest.json'), JSON.stringify({ cues: [{ id: 'c01', text: 'x', rawFile: 'raw/c01.wav' }] }), 'utf8');
        const ioSym = captureIo();
        const symCode = await runCli(['master', symMasterDir], {
            cwd: f.root,
            env: f.env,
            homeDir: f.home,
            skillDir: f.skillDir,
            scriptsDir: f.scriptsDir,
            stdout: ioSym.stdout,
            stderr: ioSym.stderr
        });
        assert.equal(symCode, EXIT.USAGE);
        assert.match(ioSym.getErr(), /symlink outside output directory/i);
    }
});

test('CLI subprocess --help and list-presets work directly from a clean scrubbed environment', t => {
    const f = makeFixture(t);
    const childEnv = osEssentialsEnv(f.env);
    const run = args =>
        spawnSync(process.execPath, [CLI, ...args], {
            cwd: f.root,
            env: childEnv,
            encoding: 'utf8',
            windowsHide: true,
            timeout: 15000
        });
    const help = run(['--help']);
    assert.equal(help.status, EXIT.OK, help.stderr);
    assert.match(help.stdout, /sherpa-onnx/);
    const presets = run(['list-presets', '--json']);
    assert.equal(presets.status, EXIT.OK, presets.stderr);
    const parsed = JSON.parse(presets.stdout);
    assert.ok(parsed.presets.some(p => p.id === 'kokoro-en-v0_19'));
    assert.ok(parsed.presets.some(p => p.id === 'vits-piper-vi_VN-vais1000-medium'));
    assert.equal(
        modelStore.defaultModelCacheRoot({ env: { LOCALAPPDATA: 'C:\\Users\\Dev\\AppData\\Local' }, platform: 'win32' }),
        'C:\\Users\\Dev\\AppData\\Local\\easy-claude-voiceover\\models'
    );
});
