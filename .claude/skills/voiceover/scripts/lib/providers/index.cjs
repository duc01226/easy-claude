'use strict';

/**
 * SpeechProvider strategy registry.
 * Adding a new provider touches one adapter module and one registry entry here.
 * Legacy OS TTS (say, sapi) and unofficial scrapers (edge-tts) are explicitly refused.
 */
const { UsageError } = require('../exit-codes.cjs');
const { createSherpaProvider } = require('./sherpa-onnx.cjs');
const { CLOUD_DEFAULTS, createCloudProvider } = require('./cloud.cjs');

const DEFAULT_PROVIDER = 'sherpa-onnx';

const REFUSED_PROVIDERS = Object.freeze({
    say: 'macOS /usr/bin/say uses legacy concatenative voices and is not cross-platform. Use free offline sherpa-onnx or an explicit cloud studio provider.',
    sapi: 'Windows SAPI5 System.Speech sounds robotic and is not cross-platform. Use free offline sherpa-onnx or an explicit cloud studio provider.',
    'os-tts': 'Legacy OS TTS is disabled to prevent robotic narration. Use free offline sherpa-onnx or an explicit cloud studio provider.',
    'edge-tts':
        'edge-tts targets an unofficial Microsoft Edge endpoint prone to 403 outages, IP throttling, and ToS issues. Use free offline sherpa-onnx (Kokoro/Piper) or an official cloud provider.'
});

const REGISTRY = Object.freeze({
    'sherpa-onnx': options => createSherpaProvider(options),
    openrouter: options => createCloudProvider('openrouter', options),
    openai: options => createCloudProvider('openai', options),
    gemini: options => createCloudProvider('gemini', options),
    elevenlabs: options => createCloudProvider('elevenlabs', options)
});

function supportedProviders() {
    return Object.keys(REGISTRY);
}

function createProvider(name = DEFAULT_PROVIDER, options = {}) {
    const key = String(name || DEFAULT_PROVIDER)
        .trim()
        .toLowerCase();
    if (Object.prototype.hasOwnProperty.call(REFUSED_PROVIDERS, key)) {
        throw new UsageError(`Refused provider "${key}": ${REFUSED_PROVIDERS[key]}`);
    }
    const factory = REGISTRY[key];
    if (!factory) {
        throw new UsageError(`Unknown provider "${key}". Supported providers: ${supportedProviders().join(', ')}`);
    }
    return factory(options);
}

module.exports = { DEFAULT_PROVIDER, REFUSED_PROVIDERS, CLOUD_DEFAULTS, supportedProviders, createProvider };
