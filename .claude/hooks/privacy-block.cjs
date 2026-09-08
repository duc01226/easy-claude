#!/usr/bin/env node
/**
 * privacy-block.cjs - Block access to sensitive files unless user-approved
 *
 * PRIVACY-based blocking (separate from SIZE-based scout-block)
 * Blocks sensitive files. LLM must get user approval and use APPROVED: prefix.
 *
 * Flow:
 * 1. LLM tries: Read ".env" → BLOCKED
 * 2. LLM asks user for permission
 * 3. User approves
 * 4. LLM retries: Read "APPROVED:.env" → ALLOWED
 */

const path = require('path');
const fs = require('fs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { inspectCommand } = require('./lib/command-inspection.cjs');
const { collectFileOperands, collectGitDiffOperands, unwrapCommand } = require('./lib/path-boundary-policy.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');
const {
  APPROVED_PREFIX,
  isSafeFile,
  isPrivacySensitive,
  hasApprovalPrefix,
  stripApprovalPrefix,
  classifySensitivePath
} = require('./lib/sensitive-path-policy.cjs');

/**
 * Load .ck.json config to check if privacy block is disabled
 * @returns {boolean} true if privacy block should be skipped
 */
function isPrivacyBlockDisabled() {
  const resolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
  if (resolution.source === 'invalid-env-fallback') {
    throw new Error(`Unable to resolve project root: ${resolution.error}`);
  }
  const projectRoot = resolution.rootDir;
  const configPath = path.join(projectRoot, '.claude', '.ck.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.privacyBlock === false;
  } catch (error) {
    if (error.code === 'ENOENT') return false; // Missing config means enabled.
    throw new Error(`Unable to evaluate privacy configuration at ${configPath}: ${error.message}`);
  }
}

const SHELL_WRAPPERS = new Set([
  'env', 'command', 'builtin', 'exec', 'sudo', 'bash', 'sh', 'zsh', 'dash', 'ksh',
  'pwsh', 'powershell', 'cmd'
]);
const POSIX_SHELL_WRAPPERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'cmd']);
const POWERSHELL_WRAPPERS = new Set(['pwsh', 'powershell']);
const SHELL_BODY_OPTIONS = new Set(['-c', '-command', '/c', '/command', '-e']);
// PowerShell resolves any unambiguous PREFIX of a parameter name, so `-c`,
// `-com` and `-Command` all select the same parameter. Match by prefix; a fixed
// spelling list lets an abbreviation walk straight past the body check.
const POWERSHELL_PARAMETERS = [
  { name: 'command', kind: 'body' },
  { name: 'encodedcommand', kind: 'opaque' },
  { name: 'file', kind: 'file' }
];
// A body that is nothing but one variable reference exposes no operand at all,
// exactly like `bash -c "$SCRIPT"`. The anchors exclude `$env:PATH` and `$_`,
// so ordinary PowerShell is not caught by this.
const POWERSHELL_OPAQUE_BODY = /^\$[A-Za-z_][A-Za-z0-9_]*$/;

function commandName(statement) {
  const raw = statement?.command?.value;
  return typeof raw === 'string' ? raw.replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '') : '';
}

function inspectPrivacyCommand(command) {
  try {
    return inspectCommand(command);
  } catch (error) {
    reportHookInternalError('privacy-block', 'command inspection failed', error);
    throw error;
  }
}

function commandOperands(statement) {
  const candidates = [];
  const add = (token, field = 'command', valueOverride) => {
    const value = valueOverride ?? token?.value;
    if (typeof value === 'string' && value.length > 0) {
      candidates.push({ value, field, token, statement, unknown: token?.static === false });
    } else if (token?.static === false) {
      candidates.push({ value: '<unresolved>', field, token, statement, unknown: true });
    }
  };
  for (const assignment of statement?.assignments || []) add(assignment, 'assignment', assignment.assignmentValue);
  for (const redirect of statement?.redirects || []) add(redirect.target, 'redirect');
  const git = collectGitDiffOperands(statement);
  const collected = git.protected ? git : collectFileOperands(statement, { privacy: true });
  for (const entry of collected.paths) {
    add(entry.token, entry.role, entry.value);
    for (const directory of entry.cwdChanges || []) add(null, 'git-cwd', directory);
  }
  if (collected.unknown) candidates.push({ value: '<unresolved>', field: 'command', statement, unknown: true });
  return candidates;
}

function unknownNested(statement, field = 'command-wrapper') {
  return [{
    value: '<unresolved>',
    field,
    token: statement?.command || null,
    statement,
    unknown: true
  }];
}

/**
 * Split only on syntax delimiters and classify each bounded fragment, so a
 * sensitive operand stays covered without regex-scanning ordinary command text.
 */
function sensitiveFragments(text, statement, field) {
  const entries = [];
  if (typeof text !== 'string') return entries;
  for (const fragment of text.split(/[\s()[\]{};|&"'`<>]+/).filter(Boolean)) {
    if (isPrivacySensitive(fragment)) entries.push({ value: fragment, field, statement });
  }
  return entries;
}

function powershellParameter(value) {
  const match = /^[-/]([A-Za-z]+)$/.exec(value);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const candidates = POWERSHELL_PARAMETERS.filter(parameter => parameter.name.startsWith(name));
  if (candidates.length === 0) return null;
  // PowerShell itself rejects an ambiguous abbreviation; never guess which one.
  return candidates.length === 1 ? candidates[0] : { kind: 'ambiguous' };
}

/**
 * PowerShell is not POSIX sh, so the shared inspector reports every PowerShell
 * body UNKNOWN by construction — `command-inspection.cjs` flags the interpreter
 * AND every `Verb-Noun` cmdlet as `UNSUPPORTED_COMMAND`. Escalating that to an
 * unresolved operand blocked essentially every PowerShell command while proving
 * nothing. A PowerShell body is instead handled the way an unsupported TOP-LEVEL
 * statement already is (see `extractPaths`): keep the operands the POSIX pass can
 * still see, and scan the body with the same bounded sensitive-fragment pass. A
 * sensitive path stays blocked; an ordinary cmdlet does not.
 *
 * Trade-off, deliberately taken: an operand hidden behind a variable
 * (`Get-Content $secret`) is no longer deny-closed, because `$` is pervasive in
 * PowerShell (`$env:PATH`, `$_`) and treating it as unresolvable is precisely
 * what made the interpreter unusable. A body that is ONLY a variable reference
 * is still deny-closed, keeping parity with `bash -c "$SCRIPT"`.
 */
function powershellOperands(statement, argv, depth) {
  const entries = [];
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (typeof token?.value !== 'string') return unknownNested(statement, 'powershell-argument');
    const parameter = powershellParameter(token.value);
    if (parameter?.kind === 'ambiguous') return unknownNested(statement, 'powershell-parameter');
    // `-EncodedCommand` carries a base64 body that cannot be inspected at all.
    if (parameter?.kind === 'opaque') return unknownNested(statement, 'powershell-encoded-command');
    if (parameter?.kind === 'file') {
      const target = argv[++index];
      if (typeof target?.value !== 'string') return unknownNested(statement, 'powershell-script-file');
      entries.push({ value: target.value, field: 'powershell-file', token: target, statement });
      continue;
    }
    if (parameter?.kind === 'body') {
      const body = argv[index + 1];
      if (typeof body?.value !== 'string') return unknownNested(statement, 'powershell-body');
      if (POWERSHELL_OPAQUE_BODY.test(body.value.trim())) return unknownNested(statement, 'powershell-body');
      return [...entries, ...powershellBodyOperands(body.value, statement, depth)];
    }
    // A bare positional ahead of any parameter is the implicit `-File` script.
    if (!/^[-/]/.test(token.value) && entries.length === 0) {
      entries.push({ value: token.value, field: 'powershell-file', token, statement });
    }
  }
  return entries;
}

function powershellBodyOperands(body, statement, depth) {
  const inspected = inspectPrivacyCommand(body);
  if (inspected.diagnostics.some(item => item.code === 'INPUT_LIMIT')) {
    return unknownNested(statement, 'powershell-body');
  }
  const entries = [];
  for (const nested of inspected.statements || []) {
    entries.push(...commandOperands(nested), ...nestedCommandOperands(nested, depth + 1));
  }
  return [
    // Drop the POSIX pass's bare `<unresolved>` markers — they only report that a
    // POSIX parse of a non-POSIX language was incomplete, which is expected here
    // and is not evidence. An operand that carries a real value is still
    // classified, so `Get-Content $HOME/.env` remains covered.
    ...entries
      .filter(entry => entry.value !== '<unresolved>')
      .map(entry => (entry.unknown ? { ...entry, unknown: false } : entry)),
    ...sensitiveFragments(body, statement, 'powershell-body-fragment')
  ];
}

function nestedCommandOperands(statement, depth = 0) {
  if (depth > 3) return unknownNested(statement, 'command-wrapper-depth');
  const command = commandName(statement);
  if (!SHELL_WRAPPERS.has(command)) return [];
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];

  if (POWERSHELL_WRAPPERS.has(command)) return powershellOperands(statement, argv, depth);

  if (POSIX_SHELL_WRAPPERS.has(command)) {
    let bodyIndex = -1;
    for (let index = 0; index < argv.length; index++) {
      const value = argv[index]?.value;
      if (typeof value !== 'string') return unknownNested(statement, 'shell-body');
      if (SHELL_BODY_OPTIONS.has(value.toLowerCase())) {
        bodyIndex = index + 1;
        break;
      }
    }
    if (bodyIndex < 0 || !argv[bodyIndex] || argv[bodyIndex].static === false) {
      return unknownNested(statement, 'shell-body');
    }
    const inspected = inspectPrivacyCommand(argv[bodyIndex].value);
    if (inspected.status === 'UNKNOWN' && inspected.diagnostics.some(item => item.code === 'INPUT_LIMIT')) {
      return unknownNested(statement, 'shell-body');
    }
    const entries = [];
    for (const nested of inspected.statements || []) {
      entries.push(...commandOperands(nested));
      entries.push(...nestedCommandOperands(nested, depth + 1));
    }
    return entries.length > 0 ? entries : (inspected.status === 'UNKNOWN' ? unknownNested(statement, 'shell-body') : []);
  }

  const wrapper = unwrapCommand(statement);
  if (!wrapper || wrapper.unknown) return unknownNested(statement, 'wrapped-command');
  const directories = wrapper.cwdChanges.map(value => ({ value, field: 'wrapper-cwd', statement }));
  return [...directories, ...commandOperands(wrapper.inner), ...nestedCommandOperands(wrapper.inner, depth + 1)];
}

/**
 * Extract only static file operands. This deliberately does not regex-scan
 * arbitrary command text, so `echo "cat .env"` remains data. Direct fields
 * and assignments are still checked by the same classifier.
 */
function extractPaths(toolInput) {
  const paths = [];
  if (!toolInput || typeof toolInput !== 'object') return paths;
  for (const field of ['file_path', 'path', 'pattern']) {
    if (typeof toolInput[field] === 'string' && toolInput[field].length > 0) {
      paths.push({ value: toolInput[field], field });
    }
  }
  if (typeof toolInput.command === 'string') {
    const inspected = inspectPrivacyCommand(toolInput.command);
    if (inspected.diagnostics.some(item => item.code === 'INPUT_LIMIT')) {
      paths.push({ value: '<unresolved>', field: 'command-limit', unknown: true });
    }
    for (const statement of inspected.statements) {
      paths.push(...commandOperands(statement));
      paths.push(...nestedCommandOperands(statement));
    }
    // For an unsupported statement, preserve a bounded evidence fallback for
    // an explicit sensitive-looking token only. It is never treated as an
    // approval and cannot suppress a separately parsed operand.
    if (inspected.status === 'UNKNOWN') {
      for (const statement of inspected.statements) {
        for (const token of statement.tokens || []) {
          if (!token.static && typeof token.value === 'string' && isPrivacySensitive(token.value)) {
            paths.push({ value: token.value, field: 'command-unknown', statement });
            continue;
          }
          if (!token.static && typeof token.value === 'string') {
            // Opaque expansions such as `$(cat .env)` are intentionally not
            // shell-parsed here; the shared bounded fragment pass keeps the
            // sensitive operand covered instead.
            paths.push(...sensitiveFragments(token.value, statement, 'command-unknown-fragment'));
          }
        }
      }
    }
  }
  return paths.filter(entry => typeof entry.value === 'string' && entry.value.length > 0);
}

/**
 * Format block message with approval instructions
 * @param {string} filePath - Blocked file path
 * @returns {string} Formatted block message
 */
function formatBlockMessage(filePath) {
  const basename = path.basename(filePath);
  return `
\x1b[36mNOTE:\x1b[0m This is not an error - this block protects sensitive data.

\x1b[33mPRIVACY BLOCK\x1b[0m: Sensitive file access requires user approval

  \x1b[33mFile:\x1b[0m ${filePath}

  This file may contain secrets (API keys, passwords, tokens).

  \x1b[34mAction required:\x1b[0m
  Ask user: "I need to read ${basename} which may contain sensitive data. Approve?"

  \x1b[32mIf YES:\x1b[0m Retry with prefix: APPROVED:${filePath}
  \x1b[31mIf NO:\x1b[0m  Do NOT retry. Continue without this file.
`;
}

/**
 * Format approval notice
 * @param {string} filePath - Approved file path
 * @returns {string} Formatted approval notice
 */
function formatApprovalNotice(filePath) {
  return `\x1b[32m✓\x1b[0m Privacy: User-approved access to ${path.basename(filePath)}`;
}

function evaluationError(message) {
  return {
    code: 2,
    stderr: `[privacy-block] Unable to evaluate tool input: ${message}\n`,
    decision: 'error-block'
  };
}

function evaluate(input) {
  // Standalone/unit callers sometimes omit the envelope fields. Such input is
  // not a tool decision, but it is still reported by the shared runner when it
  // is malformed. A real scoped tool event must have an object payload.
  if (!input || typeof input !== 'object') return undefined;
  if (!Object.prototype.hasOwnProperty.call(input, 'tool_input') || input.tool_input == null) {
    return input.tool_name ? evaluationError('tool_input is missing') : undefined;
  }
  const toolInput = input.tool_input;
  if (typeof toolInput !== 'object' || Array.isArray(toolInput)) {
    return input.tool_name ? evaluationError('tool_input is missing or not an object') : undefined;
  }
  if (input.tool_name === 'Bash' && typeof toolInput.command !== 'string') {
    return evaluationError('Bash command is missing or not a string');
  }
  for (const field of ['file_path', 'path', 'pattern', 'notebook_path']) {
    if (toolInput[field] !== undefined && typeof toolInput[field] !== 'string') {
      return input.tool_name ? evaluationError(`${field} must be a string`) : undefined;
    }
  }

  // Check if privacy block is disabled via .ck.json. Invalid configuration is
  // an evaluation failure and the shared runner maps it to a visible block.
  if (isPrivacyBlockDisabled()) return undefined;

  const paths = extractPaths(toolInput);
  const approvalNotices = [];

  // Check each path
  for (const entry of paths) {
    if (entry.unknown) return evaluationError(`Unable to resolve ${entry.field || 'command'} operand safely`);
    const testPath = entry.value;
    const classification = classifySensitivePath(testPath);
    if (!classification.sensitive) continue;

    // Check for approval prefix
    if (hasApprovalPrefix(testPath) && classification.valid) {
      // User approved - allow with notice
      approvalNotices.push(formatApprovalNotice(testPath));
      continue; // Check other paths
    }

    // No approval - block
    return { code: 2, stderr: `${formatBlockMessage(testPath)}\n`, decision: 'block' };
  }

  return approvalNotices.length > 0
    ? { stderr: `${approvalNotices.join('\n')}\n`, decision: 'approval' }
    : undefined;
}

if (require.main === module) {
  runPreToolHookSync('privacy-block', evaluate, {
    inputErrorCode: 2,
    errorExitCode: 2
  });
}

// Export functions for unit testing
if (typeof module !== 'undefined') {
  module.exports = {
    isSafeFile,
    isPrivacyBlockDisabled,
    isPrivacySensitive,
    classifySensitivePath,
    hasApprovalPrefix,
    stripApprovalPrefix,
    extractPaths,
    evaluate,
  };
}
