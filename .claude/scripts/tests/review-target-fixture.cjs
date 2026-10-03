'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const childProcess = require('node:child_process');

function gitBytes(root, args, input) {
    return childProcess.execFileSync('git', args, { cwd: root, shell: false, timeout: 10000,
        input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
}

function writeOpaqueFile(root, name, bytes) {
    // Windows exercises the Git-output parser boundary, not a native POSIX opaque filename.
    if (process.platform === 'win32') return null;
    const absolute = Buffer.concat([Buffer.from(`${root}${path.sep}`), name]);
    try { fs.writeFileSync(absolute, bytes); return absolute; }
    catch (error) { if (error.code === 'EILSEQ') return null; throw error; }
}

function moveOpaqueMetadata(root, name) {
    if (process.platform === 'win32') return null;
    const absolute = Buffer.concat([Buffer.from(`${root}${path.sep}`), name]);
    try { fs.renameSync(path.join(root, '.git'), absolute); return absolute; }
    catch (error) { if (error.code === 'EILSEQ') return null; throw error; }
}

function indexBlob(root, name, bytes) {
    const id = gitBytes(root, ['hash-object', '-w', '--stdin'], bytes).toString().trim();
    const record = Buffer.concat([Buffer.from(`100644 ${id}\t`), name, Buffer.from([0])]);
    gitBytes(root, ['update-index', '-z', '--index-info'], record);
    return id;
}

function privateSource(relative, dependencies) {
    const filename = path.resolve(__dirname, relative);
    const source = fs.readFileSync(filename);
    const instance = new Module(filename);
    instance.filename = filename;
    instance.paths = Module._nodeModulePaths(path.dirname(filename));
    const ordinaryRequire = Module.createRequire(filename);
    instance.require = name => dependencies.has(name) ? dependencies.get(name) : ordinaryRequire(name);
    // Compile the actual unchanged owner; neither global loader nor require cache is modified.
    instance._compile(source.toString('utf8'), filename);
    return { exports: instance.exports, source, filename };
}

function gitOutputTarget(root, args, output) {
    const hits = [];
    const raw = Buffer.from(output);
    const subprocess = { ...childProcess, execFileSync(command, actualArgs, options) {
        if (command === 'git' && options.cwd === root && actualArgs.length === args.length && actualArgs.every((value, index) => value === args[index])) {
            hits.push({ args: actualArgs.slice(), shell: options.shell });
            return Buffer.from(raw);
        }
        return childProcess.execFileSync(command, actualArgs, options);
    } };
    const owner = privateSource('../lib/review-target.cjs', new Map([['node:child_process', subprocess]]));
    return { target: owner.exports, hits, raw, source: owner.source, filename: owner.filename };
}

function preparationWithTarget(target) {
    return privateSource('../lib/review-preparation.cjs', new Map([['./review-target.cjs', target]])).exports;
}

module.exports = { gitBytes, writeOpaqueFile, moveOpaqueMetadata, indexBlob, gitOutputTarget, preparationWithTarget, privateSource };
