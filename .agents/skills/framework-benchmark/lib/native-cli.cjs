'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseStream, claudeUsage } = require('../scripts/container-session.cjs');
const { completedRead } = require('../../../scripts/lib/read-evidence.cjs');
const { contained } = require('./files.cjs');

function failureClass(messages) {
    // These task-budget diagnostics are emitted by the pinned native CLI; unknown failures stay invalid.
    return messages.some(message => /context_length_exceeded|context_window_exceeded|input exceeds the context window|ran out of room in the model['’]s context window|shared rollout token budget exhausted/i.test(String(message))) ? 'task' : 'infrastructure';
}

function ancestorExclusions(workspace) {
    const excluded = [];
    for (let directory = path.dirname(workspace); ; directory = path.dirname(directory)) {
        for (const name of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'AGENTS.override.md', '.claude/CLAUDE.md', '.claude/rules/**']) excluded.push(path.join(directory, name).split(path.sep).join('/'));
        if (path.dirname(directory) === directory) break;
    }
    return excluded;
}

// Same start-of-string rule as the controller's citation check; Claude's structured output enforces
// schema patterns, so a prose-first citation is corrected at submission instead of wasting the pass.
const CITATION_PATTERN = '^(?:EMPTY:1\\s|[^:\\r\\n]+:[1-9][0-9]*(?:-[1-9][0-9]*)?(?:\\s|$))';
function citedReviewSchema(schema) {
    if (!schema?.properties?.scores) return schema;
    const copy = JSON.parse(JSON.stringify(schema));
    const cite = node => { if (node?.type === 'string') node.pattern = CITATION_PATTERN; };
    for (const dimension of Object.values(copy.properties.scores.properties || {})) cite(dimension.properties?.evidence);
    cite(copy.properties.findings?.items?.properties?.evidence);
    cite(copy.properties.decisions?.items?.properties?.reason);
    return copy;
}

function argsFor(runtime, job, { workspace, profile }) {
    const review = job.role === 'review'; const control = review || job.arm === 'raw';
    const model = review ? runtime.judgeModel : runtime.model;
    if (runtime.host === 'claude') {
        const settings = { claudeMdExcludes: ancestorExclusions(workspace), sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: true,
            // Loopback binding lets server-style tasks run real HTTP tests; outbound network stays blocked.
            network: { allowedDomains: [], strictAllowlist: true, allowLocalBinding: true }, credentials: { envVars: [{ name: 'CLAUDE_CODE_OAUTH_TOKEN', mode: 'deny' }] } } };
        const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', model, '--max-turns', String(runtime.maxTurns), '--session-id', job.sessionId,
            '--no-session-persistence', '--setting-sources', 'project', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'acceptEdits', '--permission-prompts', 'none', '--settings', JSON.stringify(settings)];
        // Safe mode still lists the CLI's built-in skills; raw and observers must see none.
        if (control && !job.assessment) args.push('--safe-mode', '--disable-slash-commands');
        else if (!control) args.push('--append-system-prompt', job.treatment);
        if (review) args.push('--tools', job.assessment ? 'Read,Glob,Grep,Bash,Skill,Write,Edit' : 'Read,Glob,Grep', '--json-schema', JSON.stringify(citedReviewSchema(job.reviewSchema)));
        else args.push('--allowedTools', 'Read,Write,Edit,MultiEdit,Bash,Glob,Grep,Skill,Agent,Task,TaskCreate,TaskUpdate,TaskList');
        const budget = review ? runtime.judgeBudgetUsd : runtime.budgetUsd;
        if (budget !== undefined) args.push('--max-budget-usd', String(budget));
        return args;
    }
    const args = ['exec', '--json', '--ignore-user-config', '--sandbox', review && !job.assessment ? 'read-only' : 'workspace-write', '-C', workspace, '--model', model,
        '-c', 'approval_policy="never"', '-c', 'sandbox_workspace_write.network_access=false', '-c', 'sandbox_workspace_write.writable_roots=[]',
        '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true', '-c', 'sandbox_workspace_write.exclude_slash_tmp=true'];
    if (control) args.push('--ignore-rules', '-c', 'project_doc_max_bytes=0');
    else args.push('--dangerously-bypass-hook-trust', '-c', `projects={ ${JSON.stringify(workspace)} = { trust_level = "trusted" } }`, '-c', `developer_instructions=${JSON.stringify(job.treatment)}`);
    if (review) {
        const file = path.join(profile, 'review-schema.json'); fs.writeFileSync(file, JSON.stringify(job.reviewSchema), { mode: 0o600 });
        args.push('--output-schema', file);
    }
    args.push('-'); return args;
}

function events(text) {
    return String(text || '').split(/\r?\n/).flatMap(line => { try { const value = JSON.parse(line); return value && typeof value === 'object' ? [value] : []; } catch { return []; } });
}

function nativeReadPaths(command, cwd, posixReader) {
    const paths = posixReader(command, cwd);
    let text = String(command || '').trim();
    const wrapper = /^(?:"[^"]*(?:powershell|pwsh)(?:\.exe)?"|'[^']*(?:powershell|pwsh)(?:\.exe)?'|[^\s]*(?:powershell|pwsh)(?:\.exe)?)\s+(?:(?:-NoLogo|-NoProfile|-NonInteractive)\s+)*-Command\s+([\s\S]+)$/i.exec(text);
    if (wrapper) {
        text = wrapper[1].trim();
        if (['"', "'"].includes(text[0]) && text.at(-1) === text[0]) text = text.slice(1, -1);
    }
    // Literal PowerShell readers only. Complete output remains independently required below.
    for (const statement of text.split(/\s*(?:;|&&|\|\||\n)\s*/)) {
        if (/[|<>`$(){}]/.test(statement)) continue;
        const words = statement.match(/'[^']*'|"[^"]*"|[^\s]+/g) || [];
        if (!/^(?:get-content|gc|type|cat)$/i.test(words[0] || '')) continue;
        for (let index = 1; index < words.length; index++) {
            const word = words[index].replace(/^(['"])([\s\S]*)\1$/, '$2');
            if (/^-(?:Encoding|TotalCount|ReadCount|Tail|Stream|Filter|Include|Exclude|Delimiter)$/i.test(word)) { index++; continue; }
            if (!word || word.startsWith('-')) continue;
            const relative = path.relative(cwd, path.resolve(cwd, word));
            if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) continue;
            const file = relative.split(path.sep).join('/');
            if (fs.existsSync(path.join(cwd, file)) && fs.statSync(path.join(cwd, file)).isFile() && !paths.includes(file)) paths.push(file);
        }
    }
    return paths;
}

function observedModel(profile, sessionId) {
    const root = path.join(profile, '.codex', 'sessions');
    if (!fs.existsSync(root)) return null;
    const files = []; let count = 0; let bytes = 0;
    const walk = (dir, depth) => {
        if (depth > 8) throw new Error('Native session metadata depth exceeded');
        for (const name of fs.readdirSync(dir)) {
            if (++count > 2048) throw new Error('Native session metadata count exceeded');
            const file = path.join(dir, name); const stat = fs.lstatSync(file);
            if (stat.isSymbolicLink()) throw new Error('Native session metadata cannot be linked');
            if (stat.isDirectory()) walk(file, depth + 1);
            else if (stat.isFile() && name.endsWith('.jsonl')) {
                bytes += stat.size;
                if (bytes > 64 * 1024 * 1024) throw new Error('Native session metadata byte limit exceeded');
                files.push(file);
            }
        }
    };
    walk(root, 0);
    for (const file of files) {
        const rows = events(fs.readFileSync(file, 'utf8'));
        if (!rows.some(row => row.type === 'session_meta' && row.payload?.id === sessionId)) continue;
        const models = [...new Set(rows.filter(row => row.type === 'turn_context' && typeof row.payload?.model === 'string').map(row => row.payload.model))];
        return models.length === 1 ? models[0] : null;
    }
    return null;
}

async function parse(runtime, job, run, workspace, profile) {
    if (runtime.host === 'claude') {
        const observed = parseStream(run.stdout); const result = observed.result;
        const ok = run.exitCode === 0 && result?.subtype === 'success' && result.is_error !== true;
        const pending = new Map(), reads = [];
        for (const event of events(run.stdout)) for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
            if (event.type === 'assistant' && block.type === 'tool_use' && block.name === 'Read' && typeof block.input?.file_path === 'string') pending.set(block.id, block.input.file_path);
            if (event.type !== 'user' || block.type !== 'tool_result') continue;
            const file = pending.get(block.tool_use_id); pending.delete(block.tool_use_id);
            if (!file || block.is_error === true) continue;
            const relative = path.relative(workspace, path.resolve(workspace, file)).split(path.sep).join('/');
            if (!job.requiredReads?.includes(relative)) continue;
            const content = typeof block.content === 'string' ? block.content : Array.isArray(block.content) ? block.content.filter(c => c.type === 'text').map(c => c.text).join('\n') : '';
            // Claude's native Read tool frames each line as a number plus an arrow (older CLIs) or a tab (current).
            // A ranged part ends without a newline; restore it so contiguous parts join at line boundaries.
            const unframed = content.replace(/\r\n/g, '\n').replace(/^[\t ]*\d+(?:→|\t)/gm, '');
            reads.push({ readPaths: [relative], output: unframed.endsWith('\n') ? unframed : `${unframed}\n`, exitCode: 0 });
        }
        return { ...observed, result: undefined, stopReason: result?.subtype || null, ok,
            readReceipts: requiredReadReceipts(reads, job, workspace),
            failureClass: ok ? null : ['error_max_turns', 'error_max_budget_usd'].includes(result?.subtype) ? 'task' : failureClass([...(Array.isArray(result?.errors) ? result.errors : []), result?.result || '']),
            review: result?.structured_output || null, answer: typeof result?.result === 'string' ? result.result.slice(0, 64000) : null,
            ...(({ scope, ...tokens }) => ({ measurements: { ...tokens, costUsd: null }, usageScope: scope }))(claudeUsage(result)),
            billing: { basis: 'native-login; actual subscription charge unreported', apiEquivalentEstimateUsd: result?.total_cost_usd ?? null } };
    }
    const rows = events(run.stdout); const sessionId = rows.find(row => row.type === 'thread.started')?.thread_id;
    const completion = [...rows].reverse().find(row => row.type === 'turn.completed');
    const failed = rows.some(row => ['turn.failed', 'error'].includes(row.type));
    const { shellReadPaths } = await import('../../../scripts/context-evaluation-adapters/adapter-common.mjs');
    const selectedSkills = []; const attemptedSkills = []; const skillReceipts = [];
    const reads = []; const suppliedFiles = new Map();
    for (const row of rows) {
        if (row.type !== 'item.completed' || row.item?.type !== 'command_execution' || row.item.exit_code !== 0) continue;
        const readPaths = nativeReadPaths(row.item.command, workspace, shellReadPaths);
        reads.push({ readPaths, output: typeof row.item.aggregated_output === 'string' ? row.item.aggregated_output.replace(/\r\n/g, '\n') : row.item.aggregated_output, exitCode: row.item.exit_code });
        for (const file of readPaths) {
            const match = /^(?:\.agents|\.claude)\/skills\/([a-z0-9-]+)\/SKILL\.md$/.exec(file);
            if (!match) continue;
            if (!attemptedSkills.includes(match[1])) attemptedSkills.push(match[1]);
            const supplied = path.join(job.frameworkRoot || job.workspace || workspace, file);
            if (!fs.existsSync(supplied)) continue;
            suppliedFiles.set(file, { skill: match[1], body: fs.readFileSync(supplied, 'utf8').replace(/\r\n/g, '\n') });
        }
    }
    for (const [file, { skill, body }] of suppliedFiles) {
        const evidence = body.trim() && completedRead(reads, file, body, reads.length);
        if (evidence.complete) skillReceipts.push({ skill, path: file, completedAt: evidence.completedAt, source: 'successful native reads with complete matching supplied file content' });
    }
    skillReceipts.sort((a, b) => a.completedAt - b.completedAt);
    for (const receipt of skillReceipts) if (!selectedSkills.includes(receipt.skill)) selectedSkills.push(receipt.skill);
    const answer = [...rows].reverse().find(row => row.type === 'item.completed' && row.item?.type === 'agent_message')?.item.text || null;
    let review = null;
    if (job.role === 'review' && answer) { try { review = JSON.parse(answer); } catch { /* strict validation by experiment owner remains authoritative */ } }
    const usage = completion?.usage; const total = usage?.input_tokens; const cache = usage?.cached_input_tokens;
    return { sessionId, rootModel: observedModel(profile, sessionId), selectedSkills, attemptedSkills, skillReceipts, discoveredSkills: [], modelUsage: null,
        readReceipts: requiredReadReceipts(reads, job, workspace),
        ok: run.exitCode === 0 && Boolean(completion) && !failed,
        failureClass: failed ? failureClass(rows.filter(row => ['turn.failed', 'error'].includes(row.type)).map(row => row.error?.message || row.message || '')) : null,
        review, answer: typeof answer === 'string' ? answer.slice(0, 64000) : null,
        engagementEvidence: 'successful native skill-file reads; not workflow completion',
        measurements: { inputTokens: Number.isInteger(total) && Number.isInteger(cache) && total >= cache ? total - cache : null, cacheReadTokens: cache, cacheWriteTokens: usage?.cache_write_input_tokens, outputTokens: usage?.output_tokens, costUsd: null },
        billing: { basis: 'native-login; actual subscription charge unreported', apiEquivalentEstimateUsd: null } };
}

function requiredReadReceipts(reads, job, workspace) {
    return (job.requiredReads || []).flatMap(file => {
        const supplied = contained(job.frameworkRoot || job.workspace || workspace, file);
        if (!fs.existsSync(supplied) || !fs.statSync(supplied).isFile()) return [];
        const body = fs.readFileSync(supplied, 'utf8').replace(/\r\n/g, '\n');
        const proof = body.trim() && completedRead(reads, file, body, reads.length);
        return proof.complete ? [{ path: file, source: 'successful native reads with complete matching supplied content', completedAt: proof.completedAt ?? null }] : [];
    });
}

module.exports = { CITATION_PATTERN, citedReviewSchema, ancestorExclusions, argsFor, events, observedModel, parse, requiredReadReceipts };
