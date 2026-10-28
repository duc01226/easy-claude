#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isInvokedAsScript } = require('../../../scripts/lib/project-root.cjs');
const { prepare, load, run } = require('../lib/experiment.cjs');
const { writeReport } = require('../lib/report.cjs');
const { writeComparison } = require('../lib/compare.cjs');
const docker = require('../lib/docker.cjs');
const host = require('../lib/host.cjs');
let activeRunRoot = null;

function installSignalHandlers(completion = () => Promise.resolve()) {
    let interrupted = false;
    const handlers = new Map();
    for (const signal of ['SIGINT', 'SIGTERM']) {
        const handler = async () => {
            if (interrupted) return;
            interrupted = true;
            const cleanup = await Promise.allSettled([docker.cleanup(), host.cleanup({ cancel: true })]);
            let timer;
            try { await Promise.race([Promise.resolve(completion()).catch(() => {}), new Promise(resolve => { timer = setTimeout(resolve, 5000); })]); }
            finally { clearTimeout(timer); }
            const receipt = { signal, interruptedAt: new Date().toISOString(), cleanup };
            try { if (activeRunRoot) host.persistCollection(path.join(activeRunRoot, 'interruption.json'), receipt); }
            catch (error) { receipt.persistenceError = error.code || 'interruption receipt unavailable'; }
            process.stderr.write(JSON.stringify(receipt) + '\n');
            process.exit(signal === 'SIGINT' ? 130 : 143);
        };
        handlers.set(signal, handler); process.on(signal, handler);
    }
    return () => { for (const [signal, handler] of handlers) process.removeListener(signal, handler); };
}

const HELP = `Framework benchmark (Node18+, native logged-in Claude Code or Codex by default)
  node .claude/skills/framework-benchmark/scripts/benchmark.cjs prepare --case CASE.json [--runtime RUNTIME.json | --host codex|claude --model MODEL --judge-model MODEL] [--project CHECKOUT | --template TEMPLATE_DIRECTORY] [--framework CHECKOUT] [--out PROJECT/tmp/benchmarks]
  node .claude/skills/framework-benchmark/scripts/benchmark.cjs run --run RUN_DIRECTORY
  node .claude/skills/framework-benchmark/scripts/benchmark.cjs report --run RUN_DIRECTORY
  node .claude/skills/framework-benchmark/scripts/benchmark.cjs assess-control --run PREPARED_RUN --candidate ANONYMOUS_ARTIFACT --out PROJECT/tmp/controls
  node .claude/skills/framework-benchmark/scripts/benchmark.cjs compare --runs RUN_DIRECTORY[,RUN_DIRECTORY...] | --campaign DIRECTORY_OF_RUNS [--out PROJECT/tmp/benchmarks/comparison]
Preparation never calls a model. Native runs reuse CLI login in owned worktrees. Docker/image/API-key execution remains optional. Actual subscription billing may be unknown. Reports never claim unmeasured superiority.\n`;

function parseArgs(argv) {
    const [command, ...rest] = argv;
    if (!command || ['help', '--help', '-h'].includes(command)) return { command: 'help' };
    if (!['prepare', 'run', 'report', 'assess-control', 'compare'].includes(command)) throw new Error(HELP);
    const allowed = command === 'prepare' ? ['case', 'runtime', 'host', 'model', 'judge-model', 'project', 'template', 'framework', 'out']
        : command === 'assess-control' ? ['run', 'candidate', 'out'] : command === 'compare' ? ['runs', 'campaign', 'out'] : ['run'];
    const options = { command };
    for (let index = 0; index < rest.length; index += 2) {
        const key = rest[index].replace(/^--/, ''); const value = rest[index + 1];
        if (!rest[index].startsWith('--') || !allowed.includes(key) || !value || value.startsWith('--') || options[key]) throw new Error('Invalid or duplicate option');
        options[key] = value;
    }
    if (command === 'compare') {
        if (Boolean(options.runs) === Boolean(options.campaign)) throw new Error('Use either --runs or --campaign');
    } else if (command === 'prepare' ? !options.case : !options.run) throw new Error('Missing required option');
    if (command === 'assess-control' && !options.candidate) throw new Error('Provide an anonymous control artifact');
    if (options.runtime && ['host', 'model', 'judge-model'].some(key => options[key])) throw new Error('Use either a runtime file or native discovery options');
    if (options.project && options.template) throw new Error('Use either a committed project or a prepared template');
    return options;
}

function outputDirectory(cwd, value) {
    const root = fs.realpathSync(cwd);
    const target = path.resolve(root, value || 'tmp/framework-benchmark');
    const relative = path.relative(root, target);
    if (!/^(?:tmp|temp)(?:[\\/]|$)/.test(relative) || relative.split(path.sep).includes('..')) throw new Error('Output must be under the current project tmp/ or temp/');
    let cursor = root;
    for (const part of relative.split(path.sep)) {
        cursor = path.join(cursor, part);
        if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Output path cannot traverse a symbolic link');
    }
    fs.mkdirSync(target, { recursive: true, mode: 0o700 });
    return target;
}

// Saved runs directly under a campaign folder; unprepared or foreign folders are skipped by name.
function campaignRuns(root) {
    const runs = fs.readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^run-/.test(entry.name) && fs.existsSync(path.join(root, entry.name, 'result.json')))
        .map(entry => path.join(root, entry.name)).sort();
    if (!runs.length) throw new Error('No saved run-* directories with result.json under the campaign');
    return runs;
}

async function main(argv = process.argv.slice(2), { cwd = process.cwd(), log = console.log } = {}) {
    const options = parseArgs(argv);
    if (options.command === 'help') { log(HELP); return 0; }
    if (options.command === 'prepare') {
        const result = prepare({ caseFile: path.resolve(cwd, options.case), runtimeFile: options.runtime ? path.resolve(cwd, options.runtime) : null,
            nativeOptions: { host: options.host, model: options.model, judgeModel: options['judge-model'] },
            projectRoot: options.project ? path.resolve(cwd, options.project) : null,
            templateRoot: options.template ? path.resolve(cwd, options.template) : null,
            frameworkRoot: options.framework ? path.resolve(cwd, options.framework) : path.resolve(__dirname, '../../../..'), outputRoot: outputDirectory(cwd, options.out) });
        log(JSON.stringify(result, null, 2)); return 0;
    }
    if (options.command === 'compare') {
        const directories = options.runs ? options.runs.split(',').filter(Boolean).map(value => path.resolve(cwd, value)) : campaignRuns(path.resolve(cwd, options.campaign));
        const loaded = directories.map(directory => ({ ...load(directory), label: path.relative(cwd, directory).split(path.sep).join('/') }));
        const out = outputDirectory(cwd, options.out || path.join('tmp', 'framework-benchmark', 'comparison'));
        log(JSON.stringify(writeComparison(out, loaded), null, 2)); return 0;
    }
    const directory = path.resolve(cwd, options.run);
    if (options.command === 'assess-control') {
        activeRunRoot = outputDirectory(cwd, options.out);
        const assessed = await require('../lib/controls.cjs').assessControl({ runRoot: directory, candidateRoot: path.resolve(cwd, options.candidate), outputRoot: activeRunRoot });
        log(JSON.stringify(assessed, null, 2)); return assessed.result.phase === 'complete' ? 0 : 1;
    }
    if (options.command === 'report') {
        const loaded = load(directory); log(JSON.stringify(writeReport(loaded.root, loaded.state), null, 2)); return 0;
    }
    activeRunRoot = load(directory).root;
    const state = await run(directory, { log });
    log(`Benchmark ${state.phase}: ${path.join(directory, 'report.md')}`);
    return state.phase === 'complete' ? 0 : 1;
}

if (isInvokedAsScript(process.argv[1], __filename)) {
    let completion;
    installSignalHandlers(() => completion);
    completion = main();
    completion.then(code => { process.exitCode = code; }).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
module.exports = { HELP, parseArgs, outputDirectory, campaignRuns, main, installSignalHandlers };
