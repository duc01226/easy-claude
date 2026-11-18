'use strict';

const path = require('node:path');

const EVENTS = Object.freeze({
    SessionStart: ['SessionStart'],
    PreInvocation: ['UserPromptSubmit', 'UserPromptExpansion'],
    PreToolUse: ['PreToolUse'],
    PostToolUse: ['PostToolUse', 'PostToolUseFailure'],
    Stop: ['Stop']
});
const HOOK_TIMEOUT_SECONDS = 60;

// First field is the native spelling used for an argument newly introduced by a rewrite.
const fileArgs = (...fields) => ({ file_path: [...fields, 'FilePath', 'file_path', 'path'] });
const TOOLS = new Map([
    ['run_command', ['Bash', { command: ['CommandLine', 'command'], cwd: ['Cwd', 'cwd'] }]],
    ['read_file', ['Read', fileArgs('Path', 'AbsolutePath')]],
    ['view_file', ['Read', fileArgs('AbsolutePath', 'Path')]],
    ['write_file', ['Write', fileArgs('Path', 'TargetFile')]],
    ['write_to_file', ['Write', fileArgs('TargetFile', 'Path')]],
    ['edit_file', ['Edit', fileArgs('Path', 'TargetFile')]],
    ['replace_file_content', ['Edit', fileArgs('TargetFile', 'Path')]],
    ['multi_replace_file_content', ['MultiEdit', fileArgs('TargetFile', 'Path')]],
    ['ask_question', ['AskUserQuestion', {}]]
]);

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (object, key) => Object.hasOwn(object, key);

function validateInput(event, input) {
    if (!has(EVENTS, event) || !record(input) || !/^[a-z\d_-]{1,128}$/i.test(input.conversationId ?? '') || typeof input.conversationId !== 'string') {
        throw new Error('Invalid Antigravity event or conversation ID');
    }
    if (input.hookEventName !== undefined && event !== input.hookEventName) throw new Error('Antigravity hook event mismatch');
    if (event === 'PreToolUse' || event === 'PostToolUse') {
        if (
            !record(input.toolCall) ||
            typeof input.toolCall.name !== 'string' ||
            !input.toolCall.name.trim() ||
            (input.toolCall.args !== undefined && !record(input.toolCall.args))
        ) {
            throw new Error('Invalid Antigravity tool call');
        }
    }
}

function argField(args, aliases) {
    return aliases.find(key => has(args, key)) ?? aliases[0];
}

function commandCwd(value, cwd) {
    return typeof value === 'string' && value.trim() ? path.resolve(cwd, value) : cwd;
}

function toolPayload(toolCall, cwd) {
    const { name, args = {} } = toolCall;
    const [toolName, fields] = TOOLS.get(name) ?? [name, {}];
    const toolInput = { ...args };
    for (const [canonical, aliases] of Object.entries(fields)) {
        const value = args[argField(args, aliases)];
        if (value !== undefined) toolInput[canonical] = value;
    }
    if (toolName === 'Bash') {
        if (typeof toolInput.command !== 'string' || !toolInput.command.trim()) throw new Error('Missing Antigravity run_command CommandLine');
        toolInput.cwd = commandCwd(toolInput.cwd, cwd);
    }
    if (has(fields, 'file_path') && (typeof toolInput.file_path !== 'string' || !toolInput.file_path.trim())) {
        throw new Error(`Missing Antigravity ${name} file path`);
    }
    return { tool_name: toolName, tool_input: toolInput, tool_use_id: toolCall.id };
}

function mapRewrite(toolCall, original, updatedInput) {
    if (!record(updatedInput)) throw new Error('Invalid Claude updatedInput');
    const [, fields] = TOOLS.get(toolCall.name) ?? [null, {}];
    const overwrite = {};
    for (const [key, value] of Object.entries(updatedInput)) {
        if (has(fields, key)) {
            if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid updatedInput field: ${key}`);
            if (value !== original[key]) overwrite[argField(toolCall.args, fields[key])] = value;
        } else if (!has(original, key) || JSON.stringify(original[key]) !== JSON.stringify(value)) {
            // No arbitrary untranslated args, and no way to delete arguments via the native shallow merge.
            throw new Error(`Unsupported updatedInput field: ${key}`);
        }
    }
    return overwrite;
}

function payloadFor(input, root, hookEvent, additions) {
    return {
        hook_event_name: hookEvent,
        ck_hook_host: 'antigravity',
        session_id: input.conversationId,
        transcript_path: input.transcriptPath,
        cwd: commandCwd(input.cwd, root),
        ...additions
    };
}

module.exports = { EVENTS, HOOK_TIMEOUT_SECONDS, mapRewrite, payloadFor, record, toolPayload, validateInput };
