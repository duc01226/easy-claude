'use strict';

/**
 * Environment resolution and secret redaction for optional cloud TTS adapters.
 * Precedence matches .claude/.env.example:
 *   1. process.env (highest)
 *   2. <skillDir>/.env
 *   3. <skillsDir>/.env
 *   4. <claudeDir>/.env
 */
const fs = require('node:fs');
const path = require('node:path');

const KNOWN_SECRET_VARS = Object.freeze(['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'ELEVENLABS_API_KEY']);

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const out = {};
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        let value = line.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function resolveEnvValue(name, options = {}) {
    const { env = process.env, skillDir = path.resolve(__dirname, '../..') } = options;
    if (Object.prototype.hasOwnProperty.call(env, name)) {
        const direct = env[name];
        return direct ? String(direct).trim() : null;
    }
    const skillsDir = path.dirname(skillDir);
    const claudeDir = path.dirname(skillsDir);
    for (const file of [path.join(skillDir, '.env'), path.join(skillsDir, '.env'), path.join(claudeDir, '.env')]) {
        const parsed = parseEnvFile(file);
        if (Object.prototype.hasOwnProperty.call(parsed, name) && parsed[name]) {
            return parsed[name].trim();
        }
    }
    return null;
}

function redactSecrets(text, secretValues = []) {
    let result = String(text == null ? '' : text);
    for (const secret of secretValues) {
        if (typeof secret === 'string' && secret.length >= 6) {
            result = result.split(secret).join('[REDACTED]');
        }
    }
    result = result.replace(/\b(Bearer\s+)[A-Za-z0-9._-]{8,}\b/gi, '$1[REDACTED]');
    result = result.replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]');
    return result;
}

module.exports = { KNOWN_SECRET_VARS, parseEnvFile, resolveEnvValue, redactSecrets };
