#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { EVENTS, HOOK_TIMEOUT_SECONDS, mapRewrite, payloadFor, record, toolPayload, validateInput } = require('./contract.cjs');
const { boundMessages, conversationState } = require('./conversation-state.cjs');

const ROOT = fs.realpathSync(path.resolve(__dirname, '../../..'));
const CLAUDE_NODE_HOOK = /^\s*node\s+"?\$(?:\{CLAUDE_PROJECT_DIR\}|CLAUDE_PROJECT_DIR)"?[\\/](\.claude[\\/]hooks(?:[\\/][a-z\d_-]+)+\.cjs)\s*$/i;
const READ_CONDITION = /^\s*Read\(\s*(\S(?:.*\S)?)\s*\)\s*$/;
const TYPED_SKILL = /^\s*[/$]([a-z\d][a-z\d-]*)(?=\s|$)/;
const DEFAULT_HANDLER_SECONDS = 25;

function diagnostic(message) {
    process.stderr.write(`[antigravity-hooks] ${message}\n`);
}

function matchGroup(matcher, value) {
    if (value === undefined || !matcher || matcher === '*') return true;
    return new RegExp(`^(?:${matcher})$`).test(value);
}

function conditionHolds(condition, payload, root) {
    if (!condition) return true;
    const match = READ_CONDITION.exec(condition);
    if (!match) throw new Error('Unsupported Claude hook condition');
    if (payload.tool_name !== 'Read' || typeof payload.tool_input.file_path !== 'string') return false;
    const { globToRegExp } = require('../../hooks/lib/file-conventions.cjs');
    const glob = globToRegExp(match[1]);
    const file = payload.tool_input.file_path;
    const relative = path.relative(root, path.resolve(payload.cwd, file));
    return [file, relative].some(value => glob.test(value.replaceAll('\\', '/')));
}

function onDiskHook(hook, root) {
    const match = hook.type === 'command' && CLAUDE_NODE_HOOK.exec(hook.command);
    if (!match) throw new Error('Expected a project-root Node hook command in .claude/settings.json');
    const hookRoot = path.join(root, '.claude', 'hooks');
    const file = fs.realpathSync(path.resolve(root, match[1].replaceAll('\\', '/')));
    const relative = path.relative(hookRoot, file);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error('Claude hook path escapes .claude/hooks');
    }
    return file;
}

function decodeOutput(stdout) {
    const text = stdout.trim();
    if (!text) return {};
    try {
        const value = JSON.parse(text);
        return record(value) ? value : { additionalContext: typeof value === 'string' ? value : undefined };
    } catch {
        // Several canonical prompt hooks intentionally emit plaintext.
        return { additionalContext: text };
    }
}

function hookRunner(root, registry) {
    const deadline = performance.now() + (HOOK_TIMEOUT_SECONDS - 5) * 1000;
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
    return function* run(payload) {
        const groups = registry[payload.hook_event_name] ?? [];
        if (!Array.isArray(groups)) throw new Error('Expected an array of Claude hook groups');
        for (const group of groups) {
            if (!matchGroup(group.matcher, payload.tool_name ?? payload.source)) continue;
            if (!Array.isArray(group.hooks)) throw new Error('Expected an array of Claude hook handlers');
            for (const hook of group.hooks) {
                if (!conditionHolds(hook.if, payload, root)) continue;
                const file = onDiskHook(hook, root);
                const seconds = Number.isFinite(hook.timeout) && hook.timeout > 0 ? hook.timeout : DEFAULT_HANDLER_SECONDS;
                const remaining = deadline - performance.now();
                if (remaining < 1) throw new Error('Antigravity hook time budget exhausted');
                const result = spawnSync(process.execPath, [file], {
                    cwd: root,
                    env,
                    input: JSON.stringify(payload),
                    encoding: 'utf8',
                    maxBuffer: 256 * 1024,
                    timeout: Math.ceil(Math.min(seconds * 1000, remaining)),
                    killSignal: 'SIGKILL',
                    windowsHide: true
                });
                const name = path.basename(file);
                if (result.error || (result.status !== 0 && result.status !== 2)) {
                    const error = `Claude hook ${name} failed (${result.error?.code ?? result.signal ?? result.status})`;
                    if (payload.hook_event_name === 'PreToolUse') throw new Error(error);
                    diagnostic(error);
                    continue;
                }
                yield { name, output: decodeOutput(result.stdout), status: result.status, stderr: result.stderr.trim() };
            }
        }
    };
}

function collect(messages, { output, stderr }) {
    for (const message of [output.systemMessage, output.additionalContext, output.hookSpecificOutput?.additionalContext, stderr]) {
        if (typeof message === 'string' && message.trim()) messages.push(message);
    }
}

function denial(result) {
    const { status, stderr, output, name } = result;
    const specific = output.hookSpecificOutput;
    if (status !== 2 && specific?.permissionDecision !== 'deny' && output.decision !== 'block' && output.continue !== false) return null;
    return {
        decision: 'deny',
        reason: stderr || specific?.permissionDecisionReason || output.reason || output.stopReason || `Claude hook ${name} blocked the action.`
    };
}

function preToolUse(input, root, run) {
    const current = { ...input.toolCall, args: { ...input.toolCall.args } };
    const overwrite = {};
    const messages = [];
    let confirmation;
    // Revalidate the final native arguments against every gate if any handler changes them.
    for (const rechecking of [false, true]) {
        const event = payloadFor(input, root, 'PreToolUse');
        const payload = { ...event, ...toolPayload(current, event.cwd) };
        for (const result of run(payload)) {
            const blocked = denial(result);
            if (blocked) return { response: blocked, messages };
            collect(messages, result);
            const specific = result.output.hookSpecificOutput;
            if (specific?.permissionDecision === 'ask') {
                confirmation = { decision: 'force_ask', reason: specific.permissionDecisionReason };
            }
            if (specific?.updatedInput !== undefined) {
                const patch = mapRewrite(current, payload.tool_input, specific.updatedInput);
                if (!Object.keys(patch).length) continue;
                if (rechecking) throw new Error('Claude hook rewrite did not stabilize');
                Object.assign(overwrite, patch);
                Object.assign(current.args, patch);
                payload.tool_input = toolPayload(current, event.cwd).tool_input;
            }
        }
        if (rechecking || !Object.keys(overwrite).length) break;
    }
    return {
        response: { ...(confirmation ?? { decision: 'allow' }), ...(Object.keys(overwrite).length && { overwrite }) },
        messages
    };
}

function inject(messages) {
    const deliver = boundMessages(messages);
    return deliver.length ? { injectSteps: deliver.map(systemMessage => ({ systemMessage: { systemMessage } })) } : {};
}

function runAdvisory(run, payload, messages) {
    for (const result of run(payload)) collect(messages, result);
}

function handleEvent(event, input, root) {
    validateInput(event, input);
    const settings = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'));
    if (!record(settings) || (settings.hooks !== undefined && !record(settings.hooks))) throw new Error('Invalid Claude hook settings');
    const run = hookRunner(root, settings.hooks ?? {});
    const state = conversationState(root, input.conversationId);
    const messages = [];

    if (event === 'PreToolUse') {
        const { response, messages: pending } = preToolUse(input, root, run);
        try {
            state.enqueue(pending);
        } catch (error) {
            diagnostic(`could not queue advisory context (${error.code ?? error.message})`);
        }
        return response;
    }

    if (event === 'PreInvocation') {
        messages.push(...state.drain());
        const prompt = input.lastUserInput;
        if (state.isNewPrompt(prompt, input.invocationNum)) {
            for (const result of run(payloadFor(input, root, 'UserPromptSubmit', { prompt }))) {
                const blocked = denial(result);
                if (blocked) {
                    state.clearTurn();
                    return {
                        terminationBehavior: 'terminate',
                        injectSteps: [...(inject(messages).injectSteps ?? []), { errorMessage: { userMessage: blocked.reason } }]
                    };
                }
                collect(messages, result);
            }
            const typed = TYPED_SKILL.exec(prompt);
            if (typed) {
                runAdvisory(run, payloadFor(input, root, 'UserPromptExpansion', { command_name: typed[1], prompt }), messages);
            }
        }
        return inject(messages);
    }

    if (event === 'PostToolUse') {
        const [, failureEvent] = EVENTS.PostToolUse;
        const error = typeof input.error === 'string' && input.error.trim() ? input.error : null;
        const payload = payloadFor(input, root, error ? failureEvent : event);
        runAdvisory(run, { ...payload, ...toolPayload(input.toolCall, payload.cwd), ...(error && { error }) }, messages);
        state.enqueue(messages);
        return {};
    }

    if (event === 'Stop') {
        if (input.fullyIdle === false) return { decision: 'stop' };
        try {
            state.clearTurn();
        } catch (error) {
            diagnostic(`could not clear turn marker (${error.code ?? error.message})`);
        }
        runAdvisory(run, payloadFor(input, root, event), messages);
        return { decision: 'stop' };
    }

    runAdvisory(run, payloadFor(input, root, event, { source: 'startup' }), messages);
    return inject(messages);
}

function main(event) {
    let response;
    try {
        response = handleEvent(event, JSON.parse(fs.readFileSync(0, 'utf8')), ROOT);
    } catch (error) {
        diagnostic(error.message);
        if (event === 'PreToolUse') {
            response = { decision: 'deny', reason: 'easy-claude could not evaluate its workspace hooks. Check the Antigravity hook logs.' };
        } else {
            response = event === 'Stop' ? { decision: 'stop' } : {};
        }
    }
    process.stdout.write(`${JSON.stringify(response)}\n`);
}

main(process.argv[2]);
