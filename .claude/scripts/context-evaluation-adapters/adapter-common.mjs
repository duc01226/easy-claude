// Shared parts of the reference host adapters for `.claude/scripts/context-delivery-evaluate.cjs`
// (`claude-code.mjs`, `codex.mjs`): how a shell command counts as a read, which environment a run may
// inherit, which surroundings would leak guidance into a run, and the host scratch that is not the run's
// output. One owner, so both hosts are graded the same way.
// PORTABILITY CONTRACT: node: built-ins only.
import fs from 'node:fs';
import path from 'node:path';

// Read evidence must carry the file's actual text (the grader matches it), so outputs are raw tool text,
// bounded well above any fixture file; the evaluator applies its own total evidence limit.
export const MAX_OUTPUT = 1024 * 1024;
/** Read-only shell readers whose file operands count as reads. */
const SHELL_READERS = new Set(['cat', 'head', 'tail', 'less', 'more', 'sed', 'nl', 'bat']);

/** The inner command of a `<shell> -lc '<command>'` wrapper, or the command itself. Pure. */
export function innerCommand(command) {
    const text = String(command || '').trim();
    const match = /^\S*\/?(?:ba|z)?sh\s+-l?c\s+(['"])([\s\S]*)\1$/.exec(text);
    return match ? match[2] : text;
}

/** World-relative files that reader statements name. A command is split into its `;`, `&&`, `||` and line
 * statements; a statement counts only when it is a plain reader call (no pipe, redirect or substitution), so a
 * batched `ls; cat a b` credits `a` and `b`. The grader still requires each file's original text in the output. */
export function shellReadPaths(command, cwd) {
    const out = [];
    for (const statement of innerCommand(command).split(/\s*(?:;|&&|\|\||\n)\s*/)) {
        if (!statement || /[|<>`$()]/.test(statement)) continue;
        const words = statement.trim().split(/\s+/).map(word => word.replace(/^['"]|['"]$/g, ''));
        if (!SHELL_READERS.has(path.basename(words[0] || ''))) continue;
        for (const word of words.slice(1)) {
            if (!word || word.startsWith('-')) continue;
            const relative = path.relative(cwd, path.resolve(cwd, word));
            if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) continue;
            const file = relative.split(path.sep).join('/');
            if (fs.existsSync(path.join(cwd, file)) && fs.statSync(path.join(cwd, file)).isFile() && !out.includes(file)) out.push(file);
        }
    }
    return out;
}

/** Environment variables a run may inherit; everything else (tokens, cloud keys) is dropped. */
const ENV_ALLOW = /^(PATH|PATHEXT|HOME|USER|USERNAME|LOGNAME|SHELL|LANG|LC_[A-Z_]+|TERM|TZ|TMPDIR|TEMP|TMP|SYSTEMROOT|WINDIR|COMSPEC|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH|XDG_[A-Z_]+|HTTPS?_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|SSL_CERT_DIR|ANTHROPIC_[A-Z0-9_]+|CLAUDE_CONFIG_DIR|CLAUDE_CODE_[A-Z0-9_]+)$/i;

/** The child's environment: allowlisted names plus `extra` names (comma list). Pure. */
export function childEnv(env, extra = '') {
    const names = new Set(String(extra).split(',').map(name => name.trim()).filter(Boolean));
    const out = {};
    for (const [key, value] of Object.entries(env)) if (ENV_ALLOW.test(key) || names.has(key)) out[key] = value;
    return out;
}

/** The first of `names` in a directory strictly above `world`, or null. Guidance or a repository there would
 * reach both profiles of the run. */
export function ancestorContext(world, names = ['CLAUDE.md', 'CLAUDE.local.md', path.join('.claude', 'CLAUDE.md'), '.git']) {
    let dir = path.dirname(path.resolve(world));
    for (;;) {
        for (const name of names) if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

/** Host scratch directories a host may leave in the world after a write; they are not the run's output. */
const HOST_SCRATCH = [path.join('.claude', '.cc-writes')];

/** Remove each host scratch directory the run left EMPTY; a non-empty one stays for the grader to see. */
export function removeHostScratch(world) {
    const removed = [];
    for (const relative of HOST_SCRATCH) {
        const dir = path.join(world, relative);
        try {
            if (fs.lstatSync(dir).isDirectory() && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); removed.push(relative.split(path.sep).join('/')); }
        } catch { /* absent or unreadable: nothing to remove */ }
    }
    return removed;
}
