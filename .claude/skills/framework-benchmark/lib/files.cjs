'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const LIMITS = Object.freeze({ files: 12000, bytes: 128 * 1024 * 1024, fileBytes: 4 * 1024 * 1024, depth: 32 });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.split(path.sep).join('/');

function safeRelative(value) {
    if (typeof value !== 'string' || !value || /[\\\x00-\x1f:]/.test(value) || path.posix.isAbsolute(value) || value.split('/').some(p => !p || p === '.' || p === '..')) {
        throw new Error('Expected a contained relative path');
    }
    return value;
}

function contained(root, relative) {
    safeRelative(relative);
    const resolved = path.resolve(root, relative);
    let cursor = root;
    for (const part of relative.split('/')) {
        cursor = path.join(cursor, part);
        if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Symbolic links are not supported');
    }
    return resolved;
}

function agentSurface(file) {
    const parts = file.toLowerCase().split('/');
    return parts.some(part => ['.claude', '.agents', '.codex', '.opencode', '.cursor', '.gemini'].includes(part)) ||
        /(?:^|\/)\.github\/(?:copilot-instructions\.md|instructions|prompts|agents|skills)(?:\/|$)/i.test(file) ||
        /^(?:claude(?:\.local)?|agents(?:\.override)?|gemini)\.md$/i.test(parts.at(-1)) ||
        ['.mcp.json', '.cursorrules', '.windsurfrules'].includes(parts.at(-1));
}

function withheldBenchmarkAsset(file) {
    return /(?:^|\/)skills\/framework-benchmark\/cases(?:\/|$)/i.test(file) || /(?:^|\/)scripts\/tests\/framework-benchmark(?:-[a-z0-9-]+)?\.test\.cjs$/i.test(file);
}

function runtimeControl(file) {
    return projectInstruction(file.split('/').at(-1)) || /(?:^|\/)\.(?:agents\/skills|codex\/(?:config\.toml|hooks\.json|skills|agents|rules)|opencode\/(?:skills|agents|plugins))(?:\/|$)/i.test(file) || /(?:^|\/)\.claude$/i.test(file) ||
        /(?:^|\/)\.claude\/(?:skills|agents|hooks|commands|scripts|workflows|templates|docs|rules)(?:\/|$)/i.test(file) ||
        /(?:^|\/)\.claude\/(?:\.ck(?:\.local)?|settings(?:\.local)?|workflows)\.json$/i.test(file) ||
        /(?:^|\/)\.claude\/(?:SKILLS|AGENTS|HOOKS|COMMANDS)\.yaml$/i.test(file) || /(?:^|\/)\.mcp\.json$/i.test(file);
}

function projectInstruction(file) {
    return !file.includes('/') && /^(?:claude(?:\.local)?|agents(?:\.override)?|gemini)\.md$/i.test(file);
}

function disposable(file) {
    return file.split('/').some(part => ['.git', 'node_modules', '.venv', '__pycache__', 'tmp', 'temp'].includes(part));
}

function secretFile(file) {
    const name = file.split('/').at(-1);
    return (/^\.env(?:\.|$)/i.test(name) && !/\.(?:example|sample|template)$/i.test(name)) ||
        /^(?:auth\.json|\.?credentials(?:\.json)?|\.git-credentials)$/i.test(name) || /\.(?:pem|key|p12|pfx)$/i.test(name) || /\.local\.json$/i.test(name);
}

function validateEntries(entries, limits = LIMITS) {
    if (entries.length > limits.files) throw new Error('Snapshot file limit exceeded');
    let bytes = 0;
    const seen = new Set();
    for (const entry of entries) {
        safeRelative(entry.path);
        const identity = entry.path.toLowerCase();
        if (seen.has(identity)) throw new Error('Case-colliding snapshot paths');
        seen.add(identity);
        bytes += entry.data.length;
        if (entry.data.length > limits.fileBytes || bytes > limits.bytes || entry.path.split('/').length > limits.depth) throw new Error('Snapshot byte/depth limit exceeded');
    }
    return entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function inventory(root, { filter = () => true, limits = LIMITS } = {}) {
    const entries = [];
    let seen = 0;
    let bytes = 0;
    function walk(dir, prefix = '', depth = 0) {
        if (depth > limits.depth) throw new Error('Snapshot depth limit exceeded');
        for (const name of fs.readdirSync(dir).sort()) {
            if (++seen > limits.files * 2) throw new Error('Snapshot entry limit exceeded');
            const relative = prefix ? `${prefix}/${name}` : name;
            safeRelative(relative);
            if (!filter(relative)) continue;
            const full = path.join(dir, name);
            const stat = fs.lstatSync(full);
            if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error(`Unsupported snapshot entry: ${relative}`);
            if (stat.isDirectory()) walk(full, relative, depth + 1);
            else {
                if (stat.size > limits.fileBytes || (bytes += stat.size) > limits.bytes || entries.length >= limits.files) throw new Error('Snapshot byte/file limit exceeded');
                entries.push({ path: relative, data: fs.readFileSync(full), executable: Boolean(stat.mode & 0o111) });
            }
        }
    }
    walk(fs.realpathSync(root));
    return validateEntries(entries, limits);
}

function gitSnapshot(root, ref) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    const run = (args, options = {}) => execFileSync('git', ['-C', root, ...args], { maxBuffer: LIMITS.bytes + 8 * 1024 * 1024, timeout: 60000, ...options, env });
    const commit = run(['rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid committed source identity');
    const tree = run(['ls-tree', '-rz', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean);
    if (tree.length > LIMITS.files * 2) throw new Error('Repository entry limit exceeded');
    const records = tree.map(line => {
        const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
        if (!match) throw new Error('Invalid committed tree');
        const [, mode, type, oid, file] = match;
        safeRelative(file);
        if (type !== 'blob' || !['100644', '100755'].includes(mode)) throw new Error('Symlinks/submodules are not supported in benchmark snapshots');
        return { path: file, oid, executable: mode === '100755' };
    }).filter(row => !disposable(row.path) && !secretFile(row.path));
    const output = run(['cat-file', '--batch'], { input: records.map(row => row.oid).join('\n') + '\n' });
    let offset = 0;
    const entries = records.map(row => {
        const end = output.indexOf(10, offset);
        const header = output.subarray(offset, end).toString('ascii').split(' ');
        const size = Number(header[2]);
        if (header[0] !== row.oid || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0 || size > LIMITS.fileBytes) throw new Error('Invalid committed blob');
        const data = output.subarray(end + 1, end + 1 + size);
        if (data.length !== size || output[end + 1 + size] !== 10) throw new Error('Truncated committed blob');
        offset = end + size + 2;
        return { ...row, data };
    });
    return { commit, entries: validateEntries(entries) };
}

function fingerprint(entries) {
    // Windows bind mounts do not preserve POSIX executable bits. Identity is paths + exact bytes.
    return sha(JSON.stringify(validateEntries([...entries]).map(row => [row.path, sha(row.data)])));
}

function materialize(root, entries) {
    fs.mkdirSync(root, { recursive: true });
    for (const row of validateEntries([...entries])) {
        const file = contained(root, row.path);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, row.data, { mode: row.executable ? 0o755 : 0o644, flag: 'wx' });
    }
}

function json(file, value) {
    const temporary = `${file}.${crypto.randomUUID()}.partial`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
}

module.exports = { LIMITS, sha, slash, safeRelative, contained, agentSurface, withheldBenchmarkAsset, projectInstruction, runtimeControl, disposable, secretFile, validateEntries, inventory, gitSnapshot, fingerprint, materialize, json };
