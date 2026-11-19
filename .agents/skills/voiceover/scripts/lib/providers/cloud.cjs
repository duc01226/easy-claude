'use strict';

/**
 * Optional zero-dependency Cloud Studio TTS adapters (macOS + Windows identical via Node fetch).
 * Cloud providers NEVER run automatically — they require explicit `--provider <name>`.
 * API keys are resolved via env.cjs and NEVER written to manifests, cache keys, or error logs.
 */
const { DependencyError } = require('../exit-codes.cjs');
const { resolveEnvValue, redactSecrets } = require('../env.cjs');
const { writeFileAtomic } = require('../cues.cjs');

const REQUEST_TIMEOUT_MS = 90_000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const CLOUD_DEFAULTS = Object.freeze({
    openrouter: Object.freeze({
        envVar: 'OPENROUTER_API_KEY',
        model: 'google/gemini-3.8-flash-tts',
        voice: 'alloy',
        endpoint: 'https://openrouter.ai/api/v1/audio/speech'
    }),
    openai: Object.freeze({
        envVar: 'OPENAI_API_KEY',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        endpoint: 'https://api.openai.com/v1/audio/speech'
    }),
    gemini: Object.freeze({
        envVar: 'GEMINI_API_KEY',
        model: 'gemini-2.5-flash-preview-tts',
        voice: 'Kore',
        endpointBase: 'https://generativelanguage.googleapis.com/v1beta/models'
    }),
    elevenlabs: Object.freeze({
        envVar: 'ELEVENLABS_API_KEY',
        model: 'eleven_multilingual_v2',
        voice: 'JBFqnCBsd6RMkjVDRZzb',
        endpointBase: 'https://api.elevenlabs.io/v1/text-to-speech'
    })
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPcmWavHeader(pcmBytes, sampleRate = 24_000, channels = 1, bitsPerSample = 16) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBytes.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBytes.length, 40);
    return Buffer.concat([header, pcmBytes]);
}

async function fetchWithRetry(fetchFn, url, init, secretValues, delayFn = sleep) {
    let lastMessage = 'Cloud TTS request failed';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        let response = null;
        let retryableError = false;
        try {
            response = await fetchFn(url, {
                ...init,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
            });
        } catch (error) {
            const rawMsg = error?.message || String(error);
            lastMessage = redactSecrets(rawMsg, secretValues);
            const sig = `${error?.name || ''} ${error?.code || ''} ${error?.cause?.code || ''} ${rawMsg}`;
            retryableError = /ECONNRESET|ETIMEDOUT|fetch failed|TimeoutError|aborted due to timeout/i.test(sig);
        }
        if (response) {
            if (response.ok) return response;
            const body = redactSecrets(await response.text().catch(() => ''), secretValues).slice(0, 600);
            lastMessage = `HTTP ${response.status}: ${body || response.statusText}`;
            if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
                await delayFn(1000 * attempt);
                continue;
            }
            throw new Error(lastMessage);
        }
        if (retryableError && attempt < MAX_ATTEMPTS) {
            await delayFn(1000 * attempt);
            continue;
        }
        throw new Error(lastMessage);
    }
    throw new Error(lastMessage);
}

function createCloudProvider(name, options = {}) {
    const spec = CLOUD_DEFAULTS[name];
    if (!spec) throw new Error(`Unsupported cloud TTS provider: ${name}`);
    const { env = process.env, skillDir, model = spec.model, voice = spec.voice, fetchFn = globalThis.fetch, delayFn = sleep } = options;

    function requireKey() {
        const key = resolveEnvValue(spec.envVar, { env, skillDir });
        if (!key) {
            throw new DependencyError(
                `Cloud provider "${name}" requires ${spec.envVar} (set in environment or .claude/skills/voiceover/.env).\n` +
                    'Or use the free offline neural default: --provider sherpa-onnx'
            );
        }
        return key;
    }

    // All cloud adapters output RIFF WAV (wrapping raw PCM when needed) so pure-Node duration reading works with zero ffmpeg/ffprobe.
    const extension = '.wav';

    return {
        name,
        offline: false,
        extension,
        modelId: model,
        voiceId: String(voice),
        ensureReady() {
            requireKey();
            if (typeof fetchFn !== 'function') {
                throw new DependencyError('Node.js 18+ with global fetch() is required for cloud TTS providers.');
            }
            return { ready: true };
        },
        async synthesize({ text, speed = 1.0, instructions, outPath }) {
            const key = requireKey();
            const secrets = [key];
            if (name === 'openrouter' || name === 'openai') {
                const payload = {
                    model,
                    input: text,
                    voice: String(voice),
                    response_format: 'wav'
                };
                if (name === 'openai' && speed !== 1.0) payload.speed = speed;
                if (name === 'openai' && instructions) payload.instructions = instructions;
                const headers = {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                };
                if (name === 'openrouter') headers['X-Title'] = 'easy-claude voiceover skill';
                const resp = await fetchWithRetry(fetchFn, spec.endpoint, { method: 'POST', headers, body: JSON.stringify(payload) }, secrets, delayFn);
                const audio = Buffer.from(await resp.arrayBuffer());
                if (audio.length === 0) throw new Error(`${name} returned empty audio bytes.`);
                writeFileAtomic(outPath, audio);
                return { outPath };
            }
            if (name === 'elevenlabs') {
                const url = `${spec.endpointBase}/${encodeURIComponent(String(voice))}?output_format=pcm_24000`;
                const resp = await fetchWithRetry(
                    fetchFn,
                    url,
                    {
                        method: 'POST',
                        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/octet-stream' },
                        body: JSON.stringify({
                            text,
                            model_id: model,
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                        })
                    },
                    secrets,
                    delayFn
                );
                const raw = Buffer.from(await resp.arrayBuffer());
                if (raw.length === 0) throw new Error('elevenlabs returned empty audio bytes.');
                const wavBuffer = raw.subarray(0, 4).toString('ascii') === 'RIFF' ? raw : buildPcmWavHeader(raw, 24_000, 1, 16);
                writeFileAtomic(outPath, wavBuffer);
                return { outPath };
            }
            // Google Gemini native TTS returns base64 inline PCM (24 kHz mono 16-bit LE) or WAV.
            const url = `${spec.endpointBase}/${encodeURIComponent(model)}:generateContent`;
            const promptText = instructions ? `${instructions}: ${text}` : text;
            const resp = await fetchWithRetry(
                fetchFn,
                url,
                {
                    method: 'POST',
                    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: String(voice) } } }
                        }
                    })
                },
                secrets,
                delayFn
            );
            const json = await resp.json();
            const inline = json?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data)?.inlineData;
            if (!inline?.data) {
                throw new Error('gemini returned no inline audio payload.');
            }
            const raw = Buffer.from(inline.data, 'base64');
            if (raw.length === 0) {
                throw new Error('gemini returned empty audio bytes.');
            }
            const mime = String(inline.mimeType || '').toLowerCase();
            const wavBuffer = mime.includes('wav') || raw.subarray(0, 4).toString('ascii') === 'RIFF' ? raw : buildPcmWavHeader(raw, 24_000, 1, 16);
            writeFileAtomic(outPath, wavBuffer);
            return { outPath };
        }
    };
}

module.exports = { CLOUD_DEFAULTS, buildPcmWavHeader, createCloudProvider };
