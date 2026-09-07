#!/usr/bin/env node
'use strict';
/**
 * Windows Command Detector Hook
 *
 * Detects Windows CMD-specific commands that will fail in Git Bash (MINGW64)
 * and provides Unix equivalents.
 *
 * @hook PreToolUse
 * @matcher Bash
 */

const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { inspectCommand } = require('./lib/command-inspection.cjs');

// Windows commands that fail in Git Bash with their Unix equivalents
const WINDOWS_COMMAND_PATTERNS = [
    {
        pattern: /^dir\s+\/[a-zA-Z]/,
        name: 'dir with flags',
        example: 'dir /b /s path',
        unix: 'find path -type f (recursive) or ls path (basic)',
        reason: 'Git Bash has /usr/bin/dir (GNU coreutils) which interprets /b as a file path'
    },
    {
        pattern: /^type\s+/,
        name: 'type (view file)',
        example: 'type file.txt',
        unix: 'cat file.txt',
        reason: 'type is a Windows CMD builtin, use cat in Git Bash'
    },
    {
        pattern: /^copy\s+/,
        name: 'copy',
        example: 'copy src dst',
        unix: 'cp src dst',
        reason: 'copy is Windows CMD, use cp in Git Bash'
    },
    {
        pattern: /^move\s+/,
        name: 'move',
        example: 'move src dst',
        unix: 'mv src dst',
        reason: 'move is Windows CMD, use mv in Git Bash'
    },
    {
        pattern: /^del\s+/,
        name: 'del',
        example: 'del file.txt',
        unix: 'rm file.txt',
        reason: 'del is Windows CMD, use rm in Git Bash'
    },
    {
        pattern: /^rmdir\s+\/[sS]/,
        name: 'rmdir /s',
        example: 'rmdir /s /q path',
        unix: 'rm -rf path',
        reason: 'rmdir /s is Windows CMD, use rm -rf in Git Bash'
    },
    {
        pattern: /^where\s+/,
        name: 'where',
        example: 'where node',
        unix: 'which node',
        reason: 'where is Windows CMD, use which in Git Bash'
    },
    {
        pattern: /^set\s+\w+=.*/,
        name: 'set (env var)',
        example: 'set VAR=value',
        unix: 'export VAR=value',
        reason: 'set is Windows CMD syntax, use export in Git Bash'
    },
    {
        pattern: /^cls$/,
        name: 'cls',
        example: 'cls',
        unix: 'clear',
        reason: 'cls is Windows CMD, use clear in Git Bash'
    },
    {
        pattern: /^ren\s+/,
        name: 'ren (rename)',
        example: 'ren old.txt new.txt',
        unix: 'mv old.txt new.txt',
        reason: 'ren is Windows CMD, use mv in Git Bash'
    },
    {
        pattern: /^attrib\s+/,
        name: 'attrib',
        example: 'attrib +r file.txt',
        unix: 'chmod 444 file.txt',
        reason: 'attrib is Windows CMD, use chmod in Git Bash'
    },
    {
        pattern: /^findstr\s+/,
        name: 'findstr',
        example: 'findstr pattern file.txt',
        unix: 'grep pattern file.txt',
        reason: 'findstr is Windows CMD, use grep in Git Bash'
    }
];

/**
 * Formats a block warning message for detected Windows command
 */
function formatBlockWarning(command, match) {
    return [
        `## ⚠️ Windows CMD Syntax Detected`,
        '',
        `**Command:** \`${match.name}\``,
        `**Detected:** \`${match.name}\``,
        '',
        '_The command body is omitted from diagnostics so secrets and file contents are not copied into the hook transcript._',
        '',
        `### Why This Fails`,
        match.reason,
        '',
        `### Fix`,
        `- **Windows (won't work):** \`${match.example}\``,
        `- **Unix (use this):** \`${match.unix}\``,
        '',
        `Claude Code runs in Git Bash (MINGW64), not Windows CMD.`,
        `See CLAUDE.md "Platform (Windows)" section for full command mapping.`
    ].join('\n');
}

// Only model value-free Node options here. Unknown options may consume -e as
// their value, so the advisory rewrite leaves those invocations untouched.
const NODE_VALUE_FREE_OPTIONS = new Set(['--experimental-vm-modules', '--no-warnings', '--trace-warnings']);

// Returns every eligible argument, in source order. Each statement is modeled
// independently, so a compound command must not be left half repaired: stopping at
// the first match leaves later invocations with the invalid escape intact.
function findNodeEvalArguments(command) {
    const inspected = inspectCommand(command);
    // Node is intentionally opaque to the general inspector; all other
    // diagnostics (expansion, incomplete syntax, heredocs, limits) forbid edits.
    if (inspected.diagnostics.some(item => item.code !== 'UNSUPPORTED_COMMAND')) return [];
    const found = [];
    for (const statement of inspected.statements) {
        const [executable, ...args] = statement.argv;
        if (!executable?.static || !/^(?:.*[\\/])?node(?:\.exe)?$/.test(executable.value)) continue;
        let index = 0;
        while (args[index]?.static && NODE_VALUE_FREE_OPTIONS.has(args[index].value)) index++;
        if (!args[index]?.static || args[index].value !== '-e') continue;
        const argument = args[index + 1];
        if (!argument?.static || argument.parts.length !== 1 || argument.parts[0].quote !== 'double') continue;
        if (argument.raw.includes('\\!')) found.push(argument);
    }
    return found;
}

function evaluate(input) {
    // Only process Bash tool calls.
    if (!input || input.tool_name !== 'Bash') return undefined;

    const toolInput = input.tool_input && typeof input.tool_input === 'object' && !Array.isArray(input.tool_input)
        ? input.tool_input
        : {};
    const rawCommand = typeof toolInput.command === 'string' ? toolInput.command : '';
    const command = rawCommand.trimStart();

    // Fix \! escaping in node -e double-quoted commands.
    // Claude escapes ! for bash history safety, but Node.js treats \! as invalid unicode escape.
    // Rewrite last-first: each replacement shifts only the bytes after its own span,
    // so descending order keeps every remaining start/end offset valid.
    const nodeArguments = findNodeEvalArguments(rawCommand);
    if (nodeArguments.length > 0) {
        const fixed = [...nodeArguments].reverse().reduce(
            (text, argument) => `${text.slice(0, argument.start)}${argument.raw.replace(/\\!/g, '!')}${text.slice(argument.end)}`,
            rawCommand);
        return {
            stdout: `${JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    // updatedInput replaces the complete tool_input object;
                    // preserve every field and leave permission evaluation to the host.
                    updatedInput: { ...toolInput, command: fixed }
                }
            })}\n`,
            decision: 'rewrite'
        };
    }

    const match = WINDOWS_COMMAND_PATTERNS.find(p => p.pattern.test(command));
    if (match) {
        return { code: 2, stderr: `${formatBlockWarning(command, match)}\n`, decision: 'block' };
    }

    return undefined;
}

if (require.main === module) {
    runPreToolHookSync('windows-command-detector', evaluate, {
        inputErrorCode: 0,
        errorExitCode: 0
    });
}

module.exports = { formatBlockWarning, evaluate };
