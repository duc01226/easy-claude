#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { isInvokedAsScript } = require('../../../scripts/lib/project-root.cjs');
const { outputDirectory, installSignalHandlers } = require('./benchmark.cjs');
const templates = require('../lib/templates.cjs');

const HELP = `Reusable benchmark templates (Node18+ and Git; trusted public sources)
  node .claude/skills/framework-benchmark/scripts/templates.cjs fetch --recipe RECIPE.json [--framework CHECKOUT] [--out PROJECT/tmp/templates]
  node .claude/skills/framework-benchmark/scripts/templates.cjs configure --template TEMPLATE_DIRECTORY [--runtime RUNTIME.json | --host codex|claude --model MODEL] [--framework CHECKOUT]
Fetch pins source without inference. Configure makes one native account-backed generic project-init/project-config/scan-all attempt, retains setup investment and verifies application bytes before packaging. Prepare comparisons with benchmark.cjs --template. No remote publication.\n`;

function parseArgs(argv) {
    const [command, ...args] = argv;
    if (!command || ['help', '--help', '-h'].includes(command)) return { command: 'help' };
    const allowed = command === 'fetch' ? ['recipe', 'framework', 'out'] : command === 'configure' ? ['template', 'runtime', 'host', 'model', 'framework'] : null;
    if (!allowed) throw new Error(HELP);
    const options = { command };
    for (let index = 0; index < args.length; index += 2) {
        const key = args[index].replace(/^--/, ''), value = args[index + 1];
        if (!args[index].startsWith('--') || !allowed.includes(key) || !value || value.startsWith('--') || options[key]) throw new Error('Invalid or duplicate template option');
        options[key] = value;
    }
    if (command === 'fetch' ? !options.recipe : !options.template) throw new Error('Missing required template option');
    if (options.runtime && (options.host || options.model)) throw new Error('Choose a runtime file or native discovery');
    return options;
}

async function main(argv = process.argv.slice(2), { cwd = process.cwd(), log = console.log } = {}) {
    const options = parseArgs(argv);
    if (options.command === 'help') { log(HELP); return 0; }
    const frameworkRoot = options.framework ? path.resolve(cwd, options.framework) : path.resolve(__dirname, '../../../..');
    const result = options.command === 'fetch'
        ? templates.fetchTemplate({ recipeFile: path.resolve(cwd, options.recipe), frameworkRoot, outputRoot: outputDirectory(cwd, options.out || 'tmp/framework-benchmark-templates') })
        : await templates.configureTemplate({ templateRoot: path.resolve(cwd, options.template), frameworkRoot,
            runtimeFile: options.runtime ? path.resolve(cwd, options.runtime) : null, nativeOptions: { host: options.host, model: options.model } });
    log(JSON.stringify({ root: result.root, status: result.manifest.status, manifest: path.join(result.root, 'template.json') }, null, 2));
    return 0;
}

if (isInvokedAsScript(process.argv[1], __filename)) {
    let completion;
    installSignalHandlers(() => completion);
    completion = main();
    completion.then(code => { process.exitCode = code; }).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
module.exports = { HELP, parseArgs, main };
