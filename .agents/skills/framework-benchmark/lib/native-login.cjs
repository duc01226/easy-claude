'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { protect } = require('./private-files.cjs');

function secretValues(value) {
    const found = [];
    const walk = object => {
        if (!object || typeof object !== 'object') return;
        for (const [key, child] of Object.entries(object)) {
            if (/(?:access.?token|refresh.?token|id.?token|api.?key)/i.test(key) && typeof child === 'string' && child.length >= 12) found.push(child);
            else if (child && typeof child === 'object') walk(child);
        }
    };
    walk(value); return [...new Set(found)];
}

function readCredential(file) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Unsupported native credential file');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readClaudeLogin({ env, home, platform, runCommand }) {
    const file = path.join(env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), '.credentials.json');
    if (fs.existsSync(file)) return readCredential(file);
    if (platform !== 'darwin') return null;
    try { return JSON.parse(runCommand('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 })); }
    catch { throw new Error('ENVIRONMENT-BLOCKED: native Claude login credential store unavailable; run claude auth login'); }
}

// The stored access token only refreshes when the user's own CLI runs, and a
// private benchmark profile receives the access token alone. One minimal call
// in the user's normal environment lets the CLI rotate and persist it in its
// own store, so the user's login stays valid.
function refreshClaudeLogin({ env, refreshModel, runCommand }) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-bench-refresh-'));
    try {
        runCommand('claude', ['-p', 'Reply with the single word ok', '--model', refreshModel, '--max-turns', '1', '--output-format', 'json'],
            { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch { /* The re-read below decides; a failed refresh stays a blocked login. */ }
    finally { fs.rmSync(cwd, { recursive: true, force: true }); }
}

function credentials(host, { env = process.env, home = os.homedir(), platform = process.platform, runCommand = execFileSync, now = Date.now, minValidityMs = 0, refreshModel = null } = {}) {
    if (host === 'codex') {
        const file = path.join(env.CODEX_HOME || path.join(home, '.codex'), 'auth.json');
        if (!fs.existsSync(file)) throw new Error('ENVIRONMENT-BLOCKED: native Codex auth.json cache unavailable; sign in with the CLI using its file credential store');
        const value = readCredential(file);
        return { source: 'native-codex-login', auth: value, secrets: secretValues(value) };
    }
    if (host !== 'claude') throw new Error('Unsupported native coding host');
    if (env.CLAUDE_CODE_OAUTH_TOKEN) return { source: 'native-claude-oauth', token: env.CLAUDE_CODE_OAUTH_TOKEN, secrets: [env.CLAUDE_CODE_OAUTH_TOKEN] };
    const ports = { env, home, platform, runCommand };
    // Discovery (no window) checks presence only; a session window checks a known expiry.
    // A missing expiry is treated as valid.
    const stale = login => minValidityMs > 0 && Number.isFinite(login?.claudeAiOauth?.expiresAt) && login.claudeAiOauth.expiresAt - now() < minValidityMs;
    let value = readClaudeLogin(ports);
    let refreshed = false;
    if (stale(value) && refreshModel) { refreshClaudeLogin({ env, refreshModel, runCommand }); value = readClaudeLogin(ports); refreshed = true; }
    const token = value?.claudeAiOauth?.accessToken;
    if (typeof token !== 'string' || !token) throw new Error('ENVIRONMENT-BLOCKED: native Claude subscription login unavailable; run claude auth login');
    if (stale(value)) throw new Error('ENVIRONMENT-BLOCKED: native Claude access token expires before this session can finish; run any claude command to refresh it, or export CLAUDE_CODE_OAUTH_TOKEN from claude setup-token');
    return { source: 'native-claude-login', token, secrets: secretValues(value), refreshed };
}

function environment(profile, login, source = process.env) {
    fs.mkdirSync(profile, { recursive: true, mode: 0o700 }); protect(profile);
    const env = Object.fromEntries(Object.entries(source).filter(([key]) => /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|LANG|LC_ALL|HTTPS?_PROXY|NO_PROXY|SSL_CERT_FILE|NODE_EXTRA_CA_CERTS)$/i.test(key)));
    Object.assign(env, { HOME: profile, USERPROFILE: profile, APPDATA: path.join(profile, 'appdata'), LOCALAPPDATA: path.join(profile, 'localappdata'),
        TMPDIR: profile, TEMP: profile, TMP: profile, CODEX_HOME: path.join(profile, '.codex'), CLAUDE_CONFIG_DIR: path.join(profile, '.claude'),
        CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', DISABLE_AUTOUPDATER: '1', CK_FRAMEWORK_MODE: 'on', CK_NOTIFY: '0' });
    for (const key of ['CODEX_HOME', 'CLAUDE_CONFIG_DIR', 'APPDATA', 'LOCALAPPDATA']) fs.mkdirSync(env[key], { recursive: true, mode: 0o700 });
    if (login.auth) fs.writeFileSync(path.join(env.CODEX_HOME, 'auth.json'), JSON.stringify(login.auth), { mode: 0o600 });
    if (login.token) env.CLAUDE_CODE_OAUTH_TOKEN = login.token;
    return env;
}

function redact(text, secrets) {
    let result = String(text || '');
    for (const secret of secrets || []) if (secret) result = result.split(secret).join('[REDACTED]');
    return result;
}

module.exports = { secretValues, readCredential, credentials, environment, redact };
