#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { guidedRoot, claimContext, rememberClaim } = require('../../../hooks/lib/guided-work-claim.cjs');

const MAX_INPUT_BYTES = 4096;

function readRequest() {
    const bytes = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
        const count = fs.readSync(0, bytes, length, bytes.length - length, null);
        if (!count) break;
        length += count;
    }
    if (length > MAX_INPUT_BYTES) throw new Error('Invalid binding size');
    return JSON.parse(bytes.subarray(0, length).toString('utf8'));
}

function run(args) {
    const [command, ...flags] = args;
    const allowed = new Set(['--root', '--session']);
    const options = {};
    for (let i = 0; i < flags.length; i += 2) {
        const [flag, value] = flags.slice(i, i + 2);
        if (!allowed.delete(flag) || !value?.trim()) return { status: 'invalid' };
        options[flag] = value;
    }
    if (!['context', 'remember'].includes(command)) return { status: 'invalid' };
    const root = guidedRoot(options['--root'] || process.cwd());
    const session = options['--session'];
    if (!root) return { status: 'unavailable' };
    if (session && !/^[A-Za-z0-9._:-]{1,512}$/.test(session)) return { status: 'invalid' };
    if (command === 'context') return claimContext(root, session);
    let request;
    try {
        request = readRequest();
    } catch {
        return { status: 'invalid' };
    }
    return rememberClaim(root, session, request);
}

if (require.main === module) {
    let result;
    try {
        result = run(process.argv.slice(2));
    } catch {
        result = { status: 'unavailable' };
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status && result.status !== 'remembered' ? 1 : 0;
}
