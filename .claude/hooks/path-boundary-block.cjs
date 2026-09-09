#!/usr/bin/env node
/**
 * path-boundary-block.cjs - Block file access outside project root
 *
 * Security hook to enforce project boundary. Unlike privacy-block,
 * NO user override (APPROVED: prefix) - this is security critical.
 *
 * Exit codes:
 *   0 = Allow (path inside project or allowlisted)
 *   2 = Block (path outside project boundary)
 */

const path = require('path');
const fs = require('fs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { evaluateBoundary } = require('./lib/path-boundary-policy.cjs');
const { inspectCommand } = require('./lib/command-inspection.cjs');
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');

function inspectBoundaryCommand(command) {
    try {
        return inspectCommand(command);
    } catch (error) {
        reportHookInternalError('path-boundary-block', 'command inspection failed', error);
        throw error;
    }
}

// Lazy-load ck-path-utils (deferred until after isBoundaryCheckDisabled early exit)
let _ckPathUtils;
function getCkPathUtils() {
    return _ckPathUtils || (_ckPathUtils = require('./lib/ck-path-utils.cjs'));
}

/**
 * Get project root from environment or cwd
 * @returns {string} Normalized project root path
 */
function getProjectRoot() {
    const resolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
    if (resolution.source === 'invalid-env-fallback') {
        throw new Error(`Unable to resolve project root: ${resolution.error}`);
    }
    const root = resolution.rootDir;
    return getCkPathUtils().normalizePathForComparison(root);
}

/**
 * Decode URI-encoded path components
 * @param {string} p - Path that may contain encoded chars
 * @returns {string} Decoded path
 */
function decodePath(p) {
    if (!p) return '';
    try {
        return decodeURIComponent(p);
    } catch (error) {
        reportHookInternalError('path-boundary-block', 'invalid URI-encoded path', error);
        throw new Error(`Unable to decode path safely: ${error.message}`);
    }
}

/**
 * Resolve path to absolute, following symlinks if possible
 * @param {string} p - Path to resolve
 * @param {string} projectRoot - Project root for relative path resolution
 * @returns {string} Absolute resolved path
 */
function resolveRealPath(p, projectRoot, options = {}) {
    if (!p) return '';

    // Decode URI components first
    let decoded = decodePath(p);

    // Convert MSYS/Git Bash paths (/d/... → D:/...) before path.resolve()
    // Node.js doesn't understand MSYS format and would resolve /d/path as D:\d\path
    decoded = getCkPathUtils().convertMsysToWindows(decoded);

    // Handle home directory expansion
    if (decoded.startsWith('~/') || decoded === '~') {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        decoded = decoded.replace(/^~/, home);
    }

    // Resolve to absolute path
    let resolved;
    if (path.isAbsolute(decoded)) {
        resolved = path.resolve(decoded);
    } else {
        // Relative paths resolved against project root
        resolved = path.resolve(projectRoot, decoded);
    }

    // Try to resolve symlinks (fail gracefully if file doesn't exist)
    try {
        resolved = fs.realpathSync(resolved);
    } catch (error) {
        if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
            reportHookInternalError('path-boundary-block', 'realpath resolution failed', error);
            throw new Error(`Unable to resolve path safely: ${error.message}`);
        }
        const verificationRoot = options.projectRoot || projectRoot;
        if (options.requiresExisting && fs.existsSync(verificationRoot)) {
            throw new Error(`Path does not exist and cannot be verified safely: ${decoded}`);
        }
        // File may not exist yet (Write operation), use resolved path.
    }

    return getCkPathUtils().normalizePathForComparison(resolved);
}

/**
 * Build allowlist using shared utility + .ck.json custom dirs
 * @returns {string[]} Array of normalized allowed paths
 */
function buildAllowlist() {
    return getCkPathUtils().buildBoundaryAllowlist(getConfigArray('pathBoundaryAllowedDirs'));
}

/**
 * Get array value from .ck.json config
 * @param {string} key - Config key
 * @returns {string[]} Array value or empty array
 */
function getConfigArray(key) {
    const config = readBoundaryConfig();
    return Array.isArray(config[key]) ? config[key] : [];
}

/**
 * Check if path-boundary feature is disabled via config
 * @returns {boolean} true if boundary check should be skipped
 */
function isBoundaryCheckDisabled() {
    return getConfigValue('pathBoundary') === false;
}

/**
 * Get value from .ck.json config
 * @param {string} key - Config key
 * @returns {*} Config value or undefined
 */
function getConfigValue(key) {
    return readBoundaryConfig()[key];
}

function readBoundaryConfig() {
    const configPath = path.join(getProjectRoot(), '.claude', '.ck.json');
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw new Error(`Unable to evaluate path-boundary configuration at ${configPath}: ${error.message}`);
    }
}

/**
 * Check if path is within a directory (equals or is a subdirectory)
 * @param {string} targetPath - Path to check
 * @param {string} dir - Directory to check against
 * @returns {boolean} true if path is within directory
 */
function isWithinDir(targetPath, dir) {
    return targetPath === dir || targetPath.startsWith(dir + '/');
}

/**
 * Check if resolved path is outside project boundary
 * @param {string} resolvedPath - Absolute normalized path
 * @param {string} projectRoot - Normalized project root
 * @param {string[]} allowlist - Allowed directories outside project
 * @returns {boolean} true if path is outside and not allowlisted
 */
function isOutsideProject(resolvedPath, projectRoot, allowlist) {
    if (!resolvedPath) return false; // Empty paths handled by Claude

    // Check if inside project or any allowlisted directory
    const allowedDirs = [projectRoot, ...allowlist];
    return !allowedDirs.some(dir => isWithinDir(resolvedPath, dir));
}

/**
 * Extract all regex matches from text
 * @param {RegExp} regex - Pattern to match
 * @param {string} text - Text to search
 * @param {function} filter - Optional filter for matches
 * @returns {string[]} Matched values
 */
function extractMatches(regex, text, filter = () => true) {
    const results = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        // Coalesce alternative capture groups. Path rules expose the operand
        // via one of three alternatives ("quoted with spaces" | 'quoted' |
        // unquoted) so a quoted path containing spaces is not truncated at the
        // first space. Single-group rules still resolve to match[1].
        const value = match.slice(1).find(g => g != null);
        if (value && filter(value)) results.push(value);
    }
    return results;
}

/**
 * Strip inline interpreter code from command before path extraction.
 * Prevents false positives from strings like "/v2/users" inside code.
 * Replaces code content with empty quotes to preserve surrounding command.
 *
 * Handles: python -c "code", python3 -c 'code', node -e "code",
 *          ruby -e "code", perl -e "code", php -r "code"
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with inline code content replaced by empty strings
 */
function stripInlineCode(cmd) {
    const interp = '(?:python3?|node|ruby|perl|php)';

    // Double-quoted code after interpreter -c/-e/-r
    // [^"']*? prevents crossing quote boundaries between interpreter and flag
    let result = cmd.replace(new RegExp(`(\\b${interp}\\b[^"']*?-[cer]\\s+)"(?:[^"\\\\]|\\\\.)*"`, 'gs'), '$1""');

    // Single-quoted code after interpreter -c/-e/-r
    result = result.replace(new RegExp(`(\\b${interp}\\b[^"']*?-[cer]\\s+)'[^']*'`, 'gs'), "$1''");

    return result;
}

/**
 * Strip sed/awk pattern arguments from command before path extraction.
 * These tools take expression arguments containing forward slashes
 * (e.g., 's/docker compose/new/g') that trigger false-positive path detection.
 *
 * Handles: sed 's/old/new/', sed -i 's/.../.../', sed -i.bak -e 's/.../.../',
 *          awk '{print $1}', awk -F, '/pattern/ {print}'
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with sed/awk pattern content replaced by empty strings
 */
function stripSedAwkPatterns(cmd) {
    const tools = '(?:sed|awk|gawk|mawk)';
    // Match within the current command segment only: tool ... 'pattern' → tool ... ''
    // Preserve option values and file operands before the quoted expression so
    // real path arguments like `awk -f /etc/script.awk '/x/' file` still block.
    // Both prefixes stop at EITHER quote char so a pass cannot cross out of its
    // own quote region into an adjacent operand. Without the cross-quote stop,
    // `awk '/x/' "/etc/passwd"` → pass1 `awk '' "/etc/passwd"` → pass2's prefix
    // swallows `'' ` and empties the "/etc/passwd" path operand → boundary bypass.
    const singleQuotedExprPrefix = `\\b${tools}\\b[^'";&|\\n]*`;
    const doubleQuotedExprPrefix = `\\b${tools}\\b[^'";&|\\n]*`;

    // Single-quoted patterns
    let result = cmd.replace(new RegExp(`(${singleQuotedExprPrefix})'[^']*'`, 'g'), "$1''");

    // Double-quoted patterns
    result = result.replace(new RegExp(`(${doubleQuotedExprPrefix})"(?:[^"\\\\]|\\\\.)*"`, 'g'), '$1""');

    return result;
}

/**
 * Strip PowerShell here-strings from command before path extraction.
 * Here-strings (@'...'@ and @"..."@) carry verbatim multi-line content
 * — markdown, regex, code samples — that frequently contains characters
 * (=>, ->, |>, regex `\s*`, backslashes) which trip path-extraction regexes.
 *
 * Replaces here-string body with empty placeholder, preserving the @'@/@"@
 * markers so the surrounding command structure is unchanged.
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with PowerShell here-string bodies emptied
 */
function stripPowerShellHereStrings(cmd) {
    let result = cmd.replace(/@'[\s\S]*?'@/g, "@''@");
    result = result.replace(/@"[\s\S]*?"@/g, '@""@');
    return result;
}

/**
 * Strip grep/ripgrep pattern arguments from command before path extraction.
 * Grep patterns often contain slashes (e.g., "<!-- /SYNC:", "/api/v2/")
 * that trigger false-positive path detection.
 *
 * Uses [^'"]* to consume all flag forms (--type js, -A 3, -c, etc.) before
 * the first quoted string — simpler and more robust than a flags-only pattern
 * which fails on space-separated flag values like `rg --type js "pattern"`.
 *
 * Handles: grep "pattern", grep -c "pattern", rg --type js "pattern",
 *          grep -A 3 "pattern", rg "pattern", grep -E 'pattern'
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with grep pattern content replaced by empty strings
 */
function stripGrepPatterns(cmd) {
    const tools = '(?:grep|egrep|fgrep|rg|ripgrep|findstr)';

    // Single-quoted patterns — consume everything up to first quote as flags
    let result = cmd.replace(new RegExp(`(\\b${tools}\\b[^']*)'[^']*'`, 'g'), "$1''");

    // Double-quoted patterns — consume everything up to first quote as flags
    result = result.replace(new RegExp(`(\\b${tools}\\b[^'"]*)"(?:[^"\\\\]|\\\\.)*"`, 'g'), '$1""');

    return result;
}

/**
 * Strip cd/pushd/chdir navigation targets before path extraction.
 * Changing the shell's working directory is navigation, not file-content
 * access, and the hook cannot track cwd changes to re-scope later relative
 * paths — so blocking a cross-drive `cd /d D:\Other` is a false positive.
 * Replace only the target operand with `.`, preserving the command head
 * (cd /d) and any chained commands after `&&`/`;`/`|` so they stay scanned:
 * `cd /d D:\Other && type D:\Other\secret` still blocks the `type` read.
 *
 * Anchored to command-start (^, ;, &, |) so `cd` as another command's
 * argument (e.g. `echo cd D:\x`) is NOT treated as a navigation target.
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with cd/pushd/chdir targets neutralized
 */
function stripCdTargets(cmd) {
    return cmd.replace(
        /(^|[;&|]\s*)(cd|chdir|pushd)\b((?:\s+\/[dD])?)\s+(?:"[^"]*"|'[^']*'|[^\s"'&|;<>]+)/gi,
        '$1$2$3 .'
    );
}

/**
 * Extract file paths from tool input
 * @param {Object} toolInput - Tool input object
 * @param {string} toolName - Name of the tool being used
 * @returns {Array<{value: string, field: string}>} Extracted paths
 */
function extractPaths(toolInput, toolName) {
    if (!toolInput) return [];

    const paths = [];
    const addPath = (value, field) => value && paths.push({ value, field });

    // Direct file path fields
    ['file_path', 'path', 'notebook_path'].forEach(f => addPath(toolInput[f], f));

    // MCP filesystem array paths
    if (toolName?.startsWith('mcp__filesystem__') && Array.isArray(toolInput.paths)) {
        toolInput.paths.forEach(p => addPath(p, 'paths[]'));
    }

    // Bash command parsing
    if (toolInput.command) {
        // Strip inline code and pattern-argument tools to prevent false positives
        let cmd = stripInlineCode(toolInput.command);
        cmd = stripPowerShellHereStrings(cmd);
        cmd = stripSedAwkPatterns(cmd);
        cmd = stripGrepPatterns(cmd);
        cmd = stripCdTargets(cmd);

        // Skip path extraction for commands running inside containers
        // (docker exec, docker run, kubectl exec, etc.) — paths are container-internal
        if (/\b(?:docker|podman)\s+(?:exec|run)\b/i.test(cmd) || /\bkubectl\s+exec\b/i.test(cmd)) {
            return paths;
        }

        // File operation patterns (cat, head, etc.)
        // Quoted alternatives allow spaces so quoted paths under a space-containing
        // project root (e.g. "D:/New folder/file") are not truncated at the space.
        extractMatches(/(?:cat|head|tail|less|more|vim|nano|code|notepad|type)\s+(?:"([^"]+)"|'([^']+)'|([^\s"'|><&;]+))/gi, cmd, m => !m.startsWith('-')).forEach(p =>
            addPath(p, 'command')
        );

        // Redirection targets (> file, >> file) — skip /dev, /proc, /sys.
        // Anchor `>` to whitespace/start/`>` to avoid matching `>` inside `=>`,
        // `->`, `|>`, etc. (regex/code fragments quoted in args). `>>` still
        // matches because the second `>` is preceded by the first.
        extractMatches(/(?:^|[\s>])>\s*(?:"([^"]+)"|'([^']+)'|([^\s"'|><&;]+))/g, cmd, m => !/^\/(?:dev|proc|sys)(\/|$)/.test(m)).forEach(p =>
            addPath(p, 'command')
        );

        // Absolute paths (skip /dev, /proc, /sys; on Windows also skip cmd flags like /I, /nologo, /v:m
        // when preceded by a Windows-only tool token). Outer platform gate guarantees Linux/macOS
        // can never bypass the boundary on /etc, /var, /home, etc.
        // Test override: CLAUDE_TEST_PLATFORM lets the test suite exercise both branches on either host.
        const isWin = (process.env.CLAUDE_TEST_PLATFORM || process.platform) === 'win32';
        const winToolRe = /\b(?:findstr|cmd|xcopy|robocopy|reg|sc|net|tasklist|taskkill|where|attrib|cd|dir|md|mkdir|rd|rmdir|del|erase|copy|move|ren|rename|type|mklink|chkdsk|chcp|pushd|popd|setx|start|call|forfiles|fc|comp|tree|cls|ver|vol|systeminfo|wmic|powershell|pwsh)\b/i;
        const cmdHasWinTool = isWin && winToolRe.test(cmd);
        extractMatches(/(?:^|\s)(?:"([A-Za-z]:[/\\][^"]+|\/[^"]+)"|'([A-Za-z]:[/\\][^']+|\/[^']+)'|([A-Za-z]:[/\\][^\s"'|><&;]+|\/[^\s"'|><&;]+))/g, cmd, m => {
            if (/^\/(?:dev|proc|sys)\//.test(m)) return false;
            // Windows command flags: /Letter, /Word, or /Word:value — no nested path separators.
            // Also //Flag: Git Bash (MSYS) requires doubling the leading slash so the flag
            // survives MSYS path conversion (`cmd //c` reaches cmd.exe as `/c`). UNC paths
            // (//server/share/...) contain a nested separator so they never match this skip.
            // Skip ONLY on Windows AND when the command line contains a Windows-only tool token
            // (findstr, cmd, xcopy, etc.). This prevents Linux paths /etc, /var, /home from
            // being misclassified as flags.
            if (cmdHasWinTool && /^\/{1,2}[A-Za-z][A-Za-z0-9_-]*(?::[^\s/\\]*)?$/.test(m)) return false;
            return true;
        }).forEach(p => addPath(p, 'command'));

        // Relative traversal on a command this extractor does not otherwise model.
        // The rules above catch absolute paths and a fixed read-command list, so
        // `sort ../../outside.txt` escaped BOTH layers: the structured policy does
        // not model sort's operands, and nothing here proposed the operand as a
        // path candidate. Absolute-only coverage is not a boundary.
        //
        // Deliberately narrow: a token qualifies only when a whole segment is `..`
        // delimited by a path separator, so `HEAD~2..HEAD`, `1..5` and version
        // ranges never match. Candidates are still resolved against the project
        // root, so `.claude/../README.md` resolves back inside and allows.
        extractMatches(/(?:^|\s)(?:"([^"]*(?:^|[/\\])\.\.(?:[/\\][^"]*)?)"|'([^']*(?:^|[/\\])\.\.(?:[/\\][^']*)?)'|([^\s"'|><&;]*(?:^|[/\\])\.\.(?:[/\\][^\s"'|><&;]*)?))/g, cmd,
            m => /(?:^|[/\\])\.\.(?:[/\\]|$)/.test(m) && !m.startsWith('-')
        ).forEach(p => addPath(p, 'command'));
    }

    return paths;
}

// Plain-language cause for the diagnostic codes a user actually meets. The
// code is ALWAYS printed alongside, so an unlisted code degrades to the
// rule-based fallback below rather than to a wrong sentence — the map is a
// precision layer, never the correctness layer, and adding a code to
// path-boundary-policy.cjs cannot silently produce a misleading message.
const DIAGNOSTIC_REASONS = new Map([
    ['OUTSIDE_PROJECT', 'the path resolves outside the project root'],
    ['PATH_UNRESOLVABLE', 'the path could not be resolved to a real location'],
    ['STATEMENT_UNKNOWN', 'this statement is not a form the hook can parse into file operands'],
    ['DYNAMIC_PATH_OPERAND', 'an operand is produced at run time (variable, command substitution, or glob), so its target cannot be known before the command runs'],
    ['DYNAMIC_PATH_OPTION', 'an option value is produced at run time, so its target cannot be known before the command runs'],
    ['REDIRECT_UNKNOWN', 'a redirection uses a form the hook does not model'],
    ['REDIRECT_TARGET_UNKNOWN', 'a redirection writes to a target produced at run time'],
    ['HEREDOC_UNSUPPORTED', 'here-documents are not modelled, so the hook cannot tell what the body writes'],
    ['CWD_TRANSITION_UNKNOWN', 'the statement runs after a directory change whose destination the hook could not follow'],
    ['UNSUPPORTED_OPTION_ARITY', 'an option takes an argument shape the hook does not model'],
    ['POLICY_EXCEPTION', 'the command scanner failed, so nothing about this command is known'],
    ['INVALID_CONTEXT', 'the project root or event working directory is not a usable absolute path'],

    // The twelve below reach a user but matched NONE of the naming-convention
    // rules in explainDiagnostic, so each one printed the same terminal sentence
    // ("the boundary policy denied this input") — which says only that the hook
    // said no. A denial the operator cannot act on is a denial they work around,
    // so each now names the specific parse or limit that stopped the scan.
    // Their emission sites, in order: command-inspection.cjs :349, :348, :288,
    // :423, path-boundary-policy.cjs :439, :777/:784, :745/:787, :749,
    // command-inspection.cjs :236, :387, :342, :259.
    ['INPUT_LIMIT', 'the command is longer than the scanner will parse, so its operands were never read'],
    ['INVALID_INPUT', 'the command was not a string, so there was nothing to parse'],
    ['MISSING_REDIRECT_TARGET', 'a redirection operator has no target after it'],
    ['MISSING_STATEMENT', 'the command ends with a separator (`&&`, `;`, `|`) and no statement after it'],
    ['SHELL_INSPECTION_FAILED', 'inspecting the nested shell body failed, so the paths it touches are unknown'],
    ['STRUCTURED_PATH_INVALID', 'a structured path field is not a non-empty string'],
    ['STRUCTURED_PATH_LIMIT', 'the input lists more paths — or more total path bytes — than the policy will check'],
    ['STRUCTURED_PATH_TOO_LONG', 'a structured path is longer than the policy will resolve'],
    ['TRAILING_ESCAPE', 'the command ends in a trailing backslash, leaving its final token incomplete'],
    ['UNEXPECTED_SEPARATOR', 'a separator (`&&`, `;`, `|`) appears with no command before it'],
    ['UNTERMINATED_HEREDOC', 'a here-document is opened but its terminator never appears'],
    ['UNTERMINATED_QUOTE', 'a quoted string is never closed, so the command cannot be tokenized'],
    ['UNSUPPORTED_DD_OPERAND', 'a `dd` operand is not a recognized `key=value` pair, so the hook cannot tell whether it names a file']
]);

/**
 * Explain a diagnostic code in prose.
 *
 * Falls back to the code's own naming convention (`DYNAMIC_*`, `*_UNSUPPORTED`,
 * `*_UNKNOWN`) so a code added later still yields a true sentence.
 * @param {string} code - Diagnostic code from the boundary policy
 * @returns {string} Human-readable cause
 */
function explainDiagnostic(code) {
    if (DIAGNOSTIC_REASONS.has(code)) return DIAGNOSTIC_REASONS.get(code);
    if (/^DYNAMIC_/.test(code)) return 'part of the command is produced at run time, so its targets cannot be known before it runs';
    if (/UNSUPPORTED/.test(code)) return 'the command uses a form the hook does not model';
    if (/UNKNOWN|UNRESOLVABLE/.test(code)) return 'the hook could not determine which paths this command touches';
    return 'the boundary policy denied this input';
}

/**
 * Format block message.
 *
 * Every slot is labelled by what it ACTUALLY holds. The structured-policy
 * branch often has no path at all — only a diagnostic code saying the command's
 * operands could not be determined. Printing that code under `Path:` claimed a
 * filesystem path was rejected and sent the reader hunting for a file that was
 * never named, while the printed remedy (allowlist another directory) could not
 * fix an unparseable command. The three subjects below are genuinely different
 * denials and now read as such.
 * @param {string|{kind: string, path?: string, code?: string, command?: string}} subject
 *   A bare string is the legacy form and means an OUTSIDE path.
 * @param {string} projectRoot - Project root for reference
 * @returns {string} Formatted error message
 */
function formatBlockMessage(subject, projectRoot) {
    const detail = typeof subject === 'string' ? { kind: 'outside', path: subject } : (subject || {});
    const root = `  \x1b[33mProject Root:\x1b[0m ${projectRoot}`;
    const allowlistFooter = `
  \x1b[34mAllowed locations:\x1b[0m
  - Project directory and subdirectories
  - System temp directories
  - Claude config (~/.claude)

  \x1b[90mTo allow additional directories, add them to
  .claude/.ck.json: { "pathBoundaryAllowedDirs": ["D:/path"] }\x1b[0m
`;

    if (detail.kind === 'undetermined') {
        // No path was rejected — none was ever resolved. Naming the command is
        // the only actionable subject the hook has here.
        //
        // But this branch is reached by NON-Bash tools too (Write, Edit,
        // NotebookEdit, mcp__filesystem__*), whose input carries no command at
        // all. Those denials used to print `Command: (no command in this tool
        // input)` above a remedy telling the reader to "split a compound
        // statement, drop the pipe or redirection" — advice with no referent,
        // contradicting this file's own docstring at :452 that every slot is
        // labelled by what it ACTUALLY holds. A remedy that cannot be followed
        // reads as a malfunction, so the two cases now diverge: a shell denial
        // gets the shell remedy, a structured-input denial gets the one that
        // applies to it.
        const hasCommand = typeof detail.command === 'string' && detail.command.length > 0;
        const subjectLine = hasCommand
            ? `  \x1b[33mCommand:\x1b[0m ${detail.command.length > 300 ? `${detail.command.slice(0, 300)}…` : detail.command}`
            : `  \x1b[33mTool input:\x1b[0m ${detail.tool ? `${detail.tool} (no shell command — path fields only)` : 'structured path fields only (no shell command)'}`;
        const remedy = hasCommand
            ? `  \x1b[90mRewrite the command so its file operands are literal: split a
  compound statement, drop the pipe or redirection, or use the Read /
  Write / Glob / Grep tools instead of a shell equivalent.\x1b[0m`
            : `  \x1b[90mThis tool takes path fields, not a shell command — the reason above
  names which field the policy could not resolve. Supply a literal
  absolute or project-relative path in that field.\x1b[0m`;
        return `
\x1b[31mBLOCKED:\x1b[0m ${hasCommand ? 'Command paths could not be determined' : 'Tool input paths could not be determined'}

  \x1b[33mReason:\x1b[0m ${detail.code} — ${explainDiagnostic(detail.code)}
${subjectLine}
${root}

  No path was rejected — the hook could not work out which paths this
  ${hasCommand ? 'command' : 'tool input'} touches, so it denies closed rather than guess.

${remedy}
`;
    }

    if (detail.kind === 'unresolved-path') {
        return `
\x1b[31mBLOCKED:\x1b[0m Path could not be resolved

  \x1b[33mPath:\x1b[0m ${detail.path}
  \x1b[33mReason:\x1b[0m ${detail.code} — ${explainDiagnostic(detail.code)}
${root}

  The path was named but could not be resolved to a real location, so
  the hook cannot prove it is inside the project and denies closed.
${allowlistFooter}`;
    }

    return `
\x1b[31mBLOCKED:\x1b[0m Path outside project boundary

  \x1b[33mPath:\x1b[0m ${detail.path}
${root}

  File access is restricted to the current project directory.
  This is a security measure to prevent unintended access to
  files outside the project.
${allowlistFooter}`;
}

/**
 * Choose what the block message is ABOUT.
 *
 * An actual boundary violation outranks an unresolved operand: `OUTSIDE` is a
 * decided verdict on a named path, `UNKNOWN` only says the hook could not
 * decide. The previous first-match-in-path-order pick could report the vaguer
 * one while a concrete violation sat in the same command.
 * @param {object} policy - Result from evaluateBoundary
 * @param {object} toolInput - The tool input under evaluation
 * @returns {{kind: string, path?: string, code?: string, command?: string}}
 */
function describeBlock(policy, toolInput, toolName) {
    const outside = policy.paths.find(item => item.outcome === 'OUTSIDE');
    if (outside) return { kind: 'outside', path: outside.resolved || outside.value || '(unnamed operand)' };

    const unresolved = policy.paths.find(item => item.outcome === 'UNKNOWN');
    const firstCode = policy.diagnostics[0]?.code || 'STATEMENT_UNKNOWN';
    if (unresolved) {
        return {
            kind: 'unresolved-path',
            path: unresolved.value || '(unnamed operand)',
            code: unresolved.diagnostic || firstCode
        };
    }

    return {
        kind: 'undetermined',
        code: firstCode,
        command: typeof toolInput?.command === 'string' ? toolInput.command : null,
        // Carried ONLY so a commandless denial can name which tool it came from.
        // The message never branches on the tool's identity — it branches on
        // whether a command exists — so an unrecognized tool degrades to the
        // generic "structured path fields only" wording rather than a wrong one.
        tool: typeof toolName === 'string' && toolName.length > 0 ? toolName : null
    };
}

// Main execution
function evaluationError(message) {
    return {
        code: 2,
        stderr: `[path-boundary-block] Unable to evaluate tool input: ${message}\n`,
        decision: 'error-block'
    };
}

// ── Write-only enforcement ──────────────────────────────────────────────────────────────────────
// This hook exists to stop ONE accident: creating, modifying or deleting a file OUTSIDE the project
// root. Reading outside the root is not that accident, so a read-only request is allowed wherever it
// points. (Secrets stay `privacy-block.cjs`'s job — this hook never was the credential gate.)
//
// The consequence that matters: a command this file does not recognize is treated as a READER and
// allowed. The previous model denied closed on anything the grammar could not fully parse, so every
// unmodelled shape — `docker logs`, a piped `grep`, a heredoc, a `cd &&` chain — became unrunnable
// until someone extended the parser. That charged a large, permanent tax on correct work to prevent
// a file write those commands were never going to perform.
//
// So the maintained list is the SMALL one: things that write. Missing an exotic mutator here is a
// real gap, and it is the deliberate trade for not blocking everything else by default. Two shapes
// count as writes regardless of the command name:
//   - an output redirect (`>`, `>>`) — it writes whatever it points at
//   - a structured write tool (Write / Edit / NotebookEdit, or an MCP tool whose name says write)
const FILE_MUTATING_COMMANDS = new Set([
    // POSIX file mutation
    'rm', 'rmdir', 'unlink', 'shred', 'mv', 'cp', 'dd', 'install', 'truncate', 'tee', 'touch',
    'mkdir', 'ln', 'chmod', 'chown', 'chgrp', 'chattr', 'setfacl', 'mkfifo', 'mknod', 'split',
    // In-place editors and stream writers
    'sed', 'perl', 'ed', 'ex', 'vi', 'vim', 'nano', 'emacs', 'patch', 'sponge',
    // Archive and transfer tools that materialize files
    'tar', 'unzip', 'zip', 'gzip', 'gunzip', 'bzip2', 'bunzip2', 'xz', 'unxz', '7z', '7za',
    'rsync', 'scp', 'sftp', 'curl', 'wget',
    // Windows shell
    'del', 'erase', 'move', 'copy', 'xcopy', 'robocopy', 'ren', 'rename', 'rd', 'md', 'mklink',
    // PowerShell
    'remove-item', 'move-item', 'copy-item', 'rename-item', 'new-item', 'set-content',
    'add-content', 'clear-content', 'out-file', 'set-item', 'set-itemproperty',
    'new-itemproperty', 'remove-itemproperty', 'export-csv', 'export-clixml'
]);

// A wrapper delegates to whatever follows it, so `sudo rm -rf /x` and `xargs rm` must still read as
// writes. Only for these is the whole argv scanned — scanning every command's argv would turn
// `grep -r "rm" .` into a false write.
const COMMAND_WRAPPERS = new Set([
    'sudo', 'doas', 'env', 'command', 'builtin', 'exec', 'nice', 'nohup', 'time', 'timeout',
    'xargs', 'sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd',
    // Container CLIs delegate to a payload exactly as `sudo` does — `docker exec c rm -rf /data`
    // and `kubectl cp pod:/a /etc/b` are still the mutator they name.
    'docker', 'podman', 'nerdctl', 'kubectl', 'docker-compose'
]);

const CONTAINER_CLIS = new Set(['docker', 'podman', 'nerdctl', 'kubectl', 'docker-compose']);

// A bind mount is the mechanism by which anything inside a container reaches a HOST file, so the
// mount itself is the write — the payload that uses it is the container's business, not visible
// here. `-o` is deliberately NOT on this list: for `kubectl` it selects an output FORMAT
// (`kubectl get pods -o json`), and treating it as a file would deny an everyday read.
const BIND_MOUNT_FLAG = /^(?:-v$|--volume(?:=|$)|--mount(?:=|$))/;

// Some binaries sit on BOTH sides of the line — the same program reads in one invocation and writes
// in another, and a flag is what decides. Listing them unconditionally re-imports exactly the
// over-blocking this model exists to remove: `sed -n '1,40p' file` is a pager and `git diff` is a
// report, yet both would be denied for pointing outside the root. So each carries a predicate over
// its own argv answering the only question that matters — does THIS invocation materialize a file?
const CONDITIONAL_MUTATORS = new Map([
    // `sed`/`perl` touch a file only in place; without `-i` they stream to stdout.
    ['sed', argv => argv.some(arg => /^-[A-Za-z]*i/.test(arg) || arg.startsWith('--in-place'))],
    ['perl', argv => argv.some(arg => /^-[A-Za-z]*i/.test(arg))],
    // `curl` prints the response body unless told where to save it.
    ['curl', argv => argv.some(arg => /^--(?:output|remote-name|remote-name-all|output-dir|dump-header)\b/.test(arg)
        || /^-[A-Za-z]*[oOD]$/.test(arg))],
    // `tar`'s list mode materializes nothing; every other mode can. The mode is the first bare
    // letter cluster (`tar tf a.tar` and `tar -tf a.tar` are the same command).
    ['tar', argv => {
        if (argv.includes('--list')) return false;
        const mode = argv.find(arg => /^-?[A-Za-z]+$/.test(arg));
        return !(mode && /t/.test(mode) && !/[xcruA]/.test(mode));
    }],
    // `unzip -l|-p|-t|-v|-z` inspect an archive without extracting it.
    ['unzip', argv => !argv.some(arg => /^-[A-Za-z]*[lptvz]/.test(arg))],
    // `git` reaches a path of its own choosing only through a named output file. Every other git
    // write targets the work tree, which is `git-commit-block.cjs`'s subject, not this hook's.
    ['git', argv => argv.some(arg => /^--output(?:=|$)/.test(arg))]
]);

const STRUCTURED_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const STRUCTURED_PATH_FIELDS = ['file_path', 'path', 'notebook_path'];

function hasStructuredPathInput(toolInput, toolName) {
    if (STRUCTURED_PATH_FIELDS.some(field =>
        Object.prototype.hasOwnProperty.call(toolInput, field)
        && toolInput[field] !== undefined
        && toolInput[field] !== ''
    )) return true;

    return typeof toolName === 'string'
        && toolName.startsWith('mcp__filesystem__')
        && Array.isArray(toolInput.paths)
        && toolInput.paths.length > 0;
}

// `sh -c "sh -c '…'"` nests; the payload shrinks each hop, so a small cap ends the recursion
// without truncating any shape a person actually types.
const MAX_NESTED_COMMAND_DEPTH = 4;

function normalizeCommandName(value) {
    return String(value || '')
        .replace(/^.*[\\/]/, '')
        .replace(/\.(?:exe|cmd|bat|ps1|com)$/i, '')
        .toLowerCase();
}

function isMutatorName(name) {
    return FILE_MUTATING_COMMANDS.has(name) || CONDITIONAL_MUTATORS.has(name);
}

/**
 * The mutator's OWN arguments — argv carries the program name at [0], and under a wrapper it also
 * carries the wrapper's, so a predicate reading raw argv would score `tar` itself as a mode string.
 */
function invocationArgs(name, statement) {
    const tokens = (statement?.argv || []).map(token => String(token?.value ?? ''));
    const index = tokens.findIndex(token => normalizeCommandName(token) === name);
    return index >= 0 ? tokens.slice(index + 1) : tokens;
}

/** Does THIS invocation of a known mutator actually write? Conditional entries decide by argv. */
function invocationWrites(name, statement) {
    const conditional = CONDITIONAL_MUTATORS.get(name);
    if (!conditional) return FILE_MUTATING_COMMANDS.has(name);
    return conditional(invocationArgs(name, statement));
}

function statementWrites(statement, depth) {
    for (const redirect of statement?.redirects || []) {
        const operator = redirect?.operator?.value;
        // `2>&1` and friends duplicate a descriptor rather than naming a file, so they cannot
        // create a file at a path of their own.
        if (typeof operator === 'string' && operator.includes('>') && !operator.includes('&')) return true;
    }
    const name = normalizeCommandName(statement?.command?.value);
    if (isMutatorName(name)) return invocationWrites(name, statement);
    if (!COMMAND_WRAPPERS.has(name) || depth >= MAX_NESTED_COMMAND_DEPTH) return false;
    if (CONTAINER_CLIS.has(name)
        && (statement?.argv || []).some(token => BIND_MOUNT_FLAG.test(String(token?.value ?? '')))) {
        return true;
    }
    return (statement?.argv || []).some(token => {
        const value = token?.value;
        if (typeof value !== 'string') return false;
        // `sudo sed -i …` — a wrapper's argv IS the child's argv, so the conditional predicate
        // reads the same tokens it would have read unwrapped.
        const inner = normalizeCommandName(value);
        if (isMutatorName(inner)) return invocationWrites(inner, statement);
        // `sh -c "rm x"` carries a whole script inside ONE token. Parsing it is the only way to
        // see the mutator; a name comparison against `rm x` never matches.
        return /\s/.test(value) && commandCanWriteFiles(value, depth + 1);
    });
}

/**
 * Can this Bash command create, modify or delete a file?
 * An unparseable command falls back to a literal scan for a mutator name or an output redirect —
 * an unparseable `docker logs` is still just a read. Conditional mutators are matched by NAME in
 * that fallback: once the grammar has failed there is no argv left to test the predicate against,
 * and an unparseable command is rare enough that leaning to the boundary check there costs little.
 */
function commandCanWriteFiles(command, depth = 0) {
    let statements = [];
    try {
        statements = inspectCommand(command)?.statements || [];
    } catch {
        statements = [];
    }
    if (statements.length > 0) return statements.some(statement => statementWrites(statement, depth));
    const names = [...FILE_MUTATING_COMMANDS].join('|');
    return new RegExp(`(?:^|[\\s;&|(])(?:${names})\\b`, 'i').test(command)
        || /(?:^|[^0-9&>])>{1,2}(?![&>])/.test(command);
}

/** Structured (non-Bash) tools: does this tool's purpose include writing? */
function toolWrites(toolName) {
    if (typeof toolName !== 'string' || toolName.length === 0) return true;
    if (STRUCTURED_WRITE_TOOLS.has(toolName)) return true;
    return /(?:write|edit|create|move|delete|remove|rename|copy|mkdir|put|save|append)/i.test(toolName);
}

function evaluate(input) {
    // Preserve the legacy standalone-test envelope: a payload with no tool
    // input is not an access request. A real tool event with a malformed
    // payload is denied closed and reported by the shared runner.
    if (!input || typeof input !== 'object') return undefined;
    const { tool_input: toolInput, tool_name: toolName } = input;
    if (!Object.prototype.hasOwnProperty.call(input, 'tool_input') || toolInput == null) {
        return toolName ? evaluationError('tool_input is missing') : undefined;
    }
    if (typeof toolInput !== 'object' || Array.isArray(toolInput)) {
        return toolName ? evaluationError('tool_input is not an object') : undefined;
    }

    // Check if boundary check is disabled. Invalid configuration throws and
    // becomes a visible exit-2 error through the shared runner.
    if (isBoundaryCheckDisabled()) return undefined;

    // Write-only gate — see FILE_MUTATING_COMMANDS above. A request that cannot create, modify or
    // delete a file cannot commit the accident this hook exists to prevent, so it is allowed
    // wherever it points and is never denied merely for being unparseable.
    const hasStructuredPath = hasStructuredPathInput(toolInput, toolName);
    if (Object.prototype.hasOwnProperty.call(toolInput, 'command')) {
        // A `command` that is present but not a string is MALFORMED input, not a read. Fall through
        // so the policy layer reports it and denies closed; silently allowing it would turn a
        // delivery bug into an unlogged pass.
        if (typeof toolInput.command === 'string' && !commandCanWriteFiles(toolInput.command) && !hasStructuredPath) return undefined;
    } else if (!toolWrites(toolName)) {
        return undefined;
    }

    const projectRoot = getProjectRoot();
    const allowlist = buildAllowlist();
    const eventCwd = Object.prototype.hasOwnProperty.call(input, 'cwd')
        ? input.cwd
        : (Object.prototype.hasOwnProperty.call(toolInput, 'cwd') ? toolInput.cwd : process.cwd());
    const policy = evaluateBoundary({
        toolName,
        toolInput,
        eventCwd,
        projectRoot,
        allowlist,
        inspect: inspectBoundaryCommand,
        resolver: {
            resolve(value, base, metadata = {}) {
                return resolveRealPath(value, base || projectRoot, { ...metadata, projectRoot });
            }
        }
    });

    if (policy.status === 'BLOCK' || policy.status === 'UNKNOWN') {
        return { code: 2, stderr: `${formatBlockMessage(describeBlock(policy, toolInput, toolName), projectRoot)}\n`, decision: 'block' };
    }

    // The structured policy is authoritative for commands it understands. The
    // legacy regex extractor remains a compatibility fallback for opaque
    // commands only; re-running it over covered commands would turn quoted
    // data, Windows flags, and parser-safe paths into false boundary blocks.
    if (typeof toolInput.command === 'string' && policy.covered) return undefined;

    const paths = extractPaths(toolInput, toolName);
    for (const { value: rawPath } of paths) {
        const resolvedPath = resolveRealPath(rawPath, projectRoot);
        if (isOutsideProject(resolvedPath, projectRoot, allowlist)) {
            return { code: 2, stderr: `${formatBlockMessage(rawPath, projectRoot)}\n`, decision: 'block' };
        }
    }

    return undefined;
}

if (require.main === module) {
    runPreToolHookSync('path-boundary-block', evaluate, {
        inputErrorCode: 2,
        errorExitCode: 2
    });
}

// Export for testing
module.exports = {
    getProjectRoot,
    get normalizePathForComparison() {
        return getCkPathUtils().normalizePathForComparison;
    },
    decodePath,
    resolveRealPath,
    buildAllowlist,
    evaluate,
    isBoundaryCheckDisabled,
    isOutsideProject,
    isWithinDir,
    formatBlockMessage,
    describeBlock,
    explainDiagnostic,
    extractPaths,
    extractMatches,
    stripInlineCode,
    stripPowerShellHereStrings,
    stripSedAwkPatterns,
    stripGrepPatterns,
    stripCdTargets
};
