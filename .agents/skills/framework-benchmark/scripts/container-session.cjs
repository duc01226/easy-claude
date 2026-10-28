#!/usr/bin/env node
'use strict';

// Runs INSIDE the pinned disposable container. The host never executes candidate code.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function exportedDelta(base, current, { sha }) {
    const initial = new Map(base.map(row => [row.path, sha(row.data)]));
    const remaining = new Set(current.map(row => row.path));
    const changed = current.filter(row => initial.get(row.path) !== sha(row.data));
    if (changed.reduce((sum, row) => sum + row.data.length, 0) > 32 * 1024 * 1024) throw new Error('Candidate patch exceeds 32 MiB');
    return { entries: changed.map(row => ({ path: row.path, base64: row.data.toString('base64'), executable: row.executable })), deleted: base.filter(row => !remaining.has(row.path)).map(row => row.path) };
}

function parseStream(text) {
    const events = text.split(/\r?\n/).filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
    const result = [...events].reverse().find(event => event.type === 'result');
    const init = events.find(event => event.type === 'system' && event.subtype === 'init');
    const requested = new Map();
    const attemptedSkills = [];
    const selectedSkills = [];
    // The framework's canonical activation is `start-workflow <workflow-id>`; record which workflow it started.
    const activations = new Map(); const activatedWorkflows = [];
    const engagedSkills = []; // successful loads in order, plus each activated workflow at its activation point
    for (const event of events) {
        for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
            if (event.type === 'assistant' && block.type === 'tool_use' && block.name === 'Skill') {
                if (typeof block.input?.skill === 'string' && /^[a-z0-9-]{1,64}$/.test(block.input.skill)) {
                    if (typeof block.id === 'string') requested.set(block.id, block.input.skill);
                    attemptedSkills.push(block.input.skill);
                    const workflow = block.input.skill === 'start-workflow' && typeof block.input.args === 'string' ? /^\s*(workflow-[a-z0-9-]{1,55})(?:\s|$)/.exec(block.input.args)?.[1] : null;
                    if (workflow && typeof block.id === 'string') activations.set(block.id, workflow);
                }
            } else if (event.type === 'user' && block.type === 'tool_result') {
                const skill = requested.get(block.tool_use_id);
                if (skill && (block.is_error === false || block.is_error === undefined)) {
                    selectedSkills.push(skill); engagedSkills.push(skill);
                    if (activations.has(block.tool_use_id)) { activatedWorkflows.push(activations.get(block.tool_use_id)); engagedSkills.push(activations.get(block.tool_use_id)); }
                }
                requested.delete(block.tool_use_id); activations.delete(block.tool_use_id);
            }
        }
    }
    return { result, rootModel: init?.model || null, sessionId: result?.session_id || init?.session_id, selectedSkills: [...new Set(selectedSkills)], attemptedSkills: [...new Set(attemptedSkills)], activatedWorkflows: [...new Set(activatedWorkflows)], engagedSkills: [...new Set(engagedSkills)], discoveredSkills: init?.skills || [], modelUsage: result?.modelUsage || null };
}

// Claude's result `usage` covers the main session only; `modelUsage` adds every model and subagent.
// Per field, prefer the all-session sum when per-model usage reports it, else the main-session value,
// so delegated work is counted and an observed zero never becomes unknown.
const USAGE_FIELDS = [['inputTokens', 'inputTokens', 'input_tokens'], ['outputTokens', 'outputTokens', 'output_tokens'],
    ['cacheReadTokens', 'cacheReadInputTokens', 'cache_read_input_tokens'], ['cacheWriteTokens', 'cacheCreationInputTokens', 'cache_creation_input_tokens']];
function claudeUsage(result) {
    const rows = result?.modelUsage && typeof result.modelUsage === 'object' ? Object.values(result.modelUsage).filter(row => row && typeof row === 'object') : [];
    const tokens = {}; const fallback = [];
    for (const [name, modelKey, usageKey] of USAGE_FIELDS) {
        const values = rows.map(row => row[modelKey]).filter(Number.isFinite);
        if (values.length) tokens[name] = values.reduce((a, b) => a + b, 0);
        else { tokens[name] = Number.isFinite(result?.usage?.[usageKey]) ? result.usage[usageKey] : null; if (tokens[name] !== null) fallback.push(name); }
    }
    const measured = Object.values(tokens).some(value => value !== null);
    const scope = !measured ? null : !fallback.length ? 'all models and subagents' : `main session only for ${fallback.join(', ')}`;
    return { ...tokens, scope };
}

function argsFor(job) {
    const review = job.role === 'review';
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', review ? job.runtime.judgeModel : job.runtime.model,
        '--max-turns', String(job.runtime.maxTurns), '--max-budget-usd', String(review ? job.runtime.judgeBudgetUsd : job.runtime.budgetUsd), '--session-id', job.sessionId,
        '--setting-sources', 'project', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'acceptEdits',
        '--allowedTools', review ? 'Read,Glob,Grep' : 'Read,Write,Edit,MultiEdit,Bash,Glob,Grep,Skill,Agent,Task,TaskCreate,TaskUpdate,TaskList'];
    if (review) args.push('--tools', 'Read,Glob,Grep');
    if (review || job.arm === 'raw') args.push('--bare');
    else args.push('--append-system-prompt', job.treatment);
    if (review) args.push('--json-schema', JSON.stringify(job.reviewSchema));
    return args;
}

function executeSession(job, ports = {}) {
    const fileTools = ports.files || require('/runner-lib/files.cjs');
    const { inventory, materialize, disposable, secretFile, agentSurface, projectInstruction, runtimeControl, sha, contained, fingerprint } = fileTools;
    const workspace = ports.workspace || '/workspace';
    const env = ports.env || process.env;
    const runCommand = ports.runCommand || spawnSync;
    const emit = ports.emit || emitPacket;
    const source = inventory(ports.input || '/input');
    if (fingerprint(source) !== job.inputHash) throw new Error('Mounted input does not match the frozen host snapshot');
    materialize(workspace, source);
    const isContext = file => (job.contextRoots || []).some(root => file === root || file.startsWith(`${root}/`));
    const application = file => !disposable(file) && !secretFile(file) && !agentSurface(file) && !isContext(file);
    fs.mkdirSync(env.HOME, { recursive: true });
    if (job.role === 'check') {
        const check = runCommand(job.argv[0], job.argv.slice(1), { cwd: workspace, env, encoding: 'utf8', timeout: job.timeoutMs, maxBuffer: 4 * 1024 * 1024 });
        return { isCheck: true, stdout: check.stdout || '', stderr: check.stderr || '', exitCode: check.error || check.signal ? 125 : check.status ?? 125 };
    }
    for (const name of ['/CLAUDE.md', '/AGENTS.md', '/.claude', '/.agents', '/.codex']) if (fs.existsSync(name)) throw new Error('Image contains ancestor agent instructions');
    if (job.role === 'solve') {
        // One synthetic baseline, no source history, remotes, hooks or author identity.
        const gitEnv = { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: require('node:path').join(env.HOME, 'no-git-config'),
            GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' };
        for (const args of [['init', '-q'], ['add', '--all'], ['-c', 'user.name=Benchmark', '-c', 'user.email=benchmark@example.invalid', 'commit', '--allow-empty', '-qm', 'Frozen task input']]) {
            const git = runCommand('git', ['-c', 'core.hooksPath=/tmp/bench-home/no-hooks', ...args], { cwd: workspace, env: gitEnv, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
            if (git.status !== 0) throw new Error('Cannot initialize isolated task baseline');
        }
    }
    const version = runCommand('claude', ['--version'], { env, encoding: 'utf8', timeout: 15000 });
    if (version.status !== 0 || !String(version.stdout).trim().startsWith(`${job.runtime.claudeVersion} `)) throw new Error('Pinned Claude CLI version not available');
    if (job.role === 'probe') {
        const help = runCommand('claude', ['--help'], { env, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
        const git = runCommand('git', ['--version'], { env, encoding: 'utf8', timeout: 15000 });
        const flags = ['--bare', '--session-id', '--max-budget-usd', '--json-schema', '--tools', '--setting-sources', '--strict-mcp-config'];
        const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
        if (nodeMajor < 18 || (nodeMajor === 18 && nodeMinor < 19) || git.status !== 0 || help.status !== 0 || flags.some(flag => !help.stdout.includes(flag))) throw new Error('Required Node/Git/Claude CLI capabilities unavailable');
        return { ok: true, hostVersion: String(version.stdout).trim(), node: process.version, git: git.stdout.trim(), flags };
    }
    emit({ type: 'started', sessionId: job.sessionId, hostVersion: String(version.stdout).trim() });
    const run = runCommand('claude', argsFor(job), { cwd: workspace, env, input: job.prompt, encoding: 'utf8', timeout: job.runtime.timeoutMs - 500, maxBuffer: 32 * 1024 * 1024 });
    const trace = job.role === 'solve' ? (ports.journey || require('/runner-lib/journey.cjs')).collect('claude', run.stdout || '', { exitCode: run.status, failure: run.error?.code || run.signal || null }) : undefined;
    const observed = parseStream(run.stdout || '');
    if (trace) Object.assign(trace.manifest, { sessionId: observed.sessionId, observedModel: observed.rootModel, selectedSkills: observed.selectedSkills, attemptedSkills: observed.attemptedSkills, workflowGateCompletion: 'unknown unless evidenced by public actions' });
    const result = observed.result;
    const snapshot = inventory(workspace, { filter: file => !disposable(file) });
    // Preserve the export walk's secret-ancestor pruning while observing every native control.
    const finalFiles = snapshot.filter(row => row.path.split('/').every(part => !secretFile(part)));
    if (env.ANTHROPIC_API_KEY && finalFiles.some(row => row.data.includes(Buffer.from(env.ANTHROPIC_API_KEY)))) throw new Error('Candidate artifact contains the provider credential');
    const current = finalFiles.filter(row => application(row.path));
    const controls = snapshot.filter(row => !isContext(row.path) && runtimeControl(row.path));
    const expectedControls = new Set(source.filter(row => runtimeControl(row.path) && !isContext(row.path)).map(row => row.path));
    const treatmentChanges = controls.filter(row => !expectedControls.has(row.path)).map(row => row.path);
    for (const row of source.filter(row => agentSurface(row.path) && !projectInstruction(row.path) && !isContext(row.path))) {
        const file = contained(workspace, row.path);
        if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || sha(fs.readFileSync(file)) !== sha(row.data)) treatmentChanges.push(row.path);
    }
    const treatmentIntact = treatmentChanges.length === 0;
    return {
        ...observed, result: undefined, ok: run.status === 0 && result?.subtype === 'success' && result?.is_error !== true,
        journey: trace,
        hostVersion: String(version.stdout).trim(),
        ...(({ scope, ...tokens }) => ({ measurements: { ...tokens, costUsd: result?.total_cost_usd ?? null }, usageScope: scope }))(claudeUsage(result)),
        review: job.role === 'review' ? result?.structured_output ?? null : undefined,
        delta: job.role === 'solve' ? exportedDelta(source.filter(row => application(row.path)), current, fileTools) : undefined,
        setupDelta: job.role === 'solve' && job.arm === 'framework' ? exportedDelta([], finalFiles.filter(row => isContext(row.path)), fileTools) : undefined,
        treatmentIntact, treatmentChanges,
        candidateIntact: fingerprint(source.filter(row => application(row.path))) === fingerprint(current),
        answer: typeof result?.result === 'string' ? result.result.slice(0, 64000) : null,
        failureClass: run.error?.code === 'ETIMEDOUT' || ['success', 'error_max_turns', 'error_max_budget_usd'].includes(result?.subtype) ? 'task' : 'infrastructure',
        error: run.error?.code || (run.status !== 0 ? `cli-exit:${run.status}` : result?.subtype !== 'success' ? result?.subtype || 'missing-result' : null)
    };
}

function emitPacket(packet) { process.stdout.write(JSON.stringify(packet) + '\n'); }

function main(job = JSON.parse(fs.readFileSync(0, 'utf8')), ports = {}) {
    const packet = executeSession(job, ports);
    if (packet.isCheck) {
        (ports.stdout || (value => process.stdout.write(value)))(packet.stdout);
        (ports.stderr || (value => process.stderr.write(value)))(packet.stderr);
        return packet.exitCode;
    }
    (ports.emit || emitPacket)(packet);
    return 0;
}

if (require.main === module) {
    try { process.exitCode = main(); } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 125; }
}
module.exports = { exportedDelta, parseStream, claudeUsage, argsFor, executeSession, main };
