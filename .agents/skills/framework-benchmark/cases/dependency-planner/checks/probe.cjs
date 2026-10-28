'use strict';
// Candidate execution lives in this disposable child. Trusted assertions stay in the parent.
const fs = require('node:fs');
const path = require('node:path');
const steps = JSON.parse(fs.readFileSync(0, 'utf8'));
const stringify = JSON.stringify;
const parse = JSON.parse;
const clone = value => value === undefined ? null : parse(stringify(value));
const send = fs.writeSync.bind(fs);
const api = require(path.join(process.env.BENCH_WORKSPACE || '/workspace', 'planner.cjs'));
const values = Object.create(null);
const observations = Object.create(null);
let planner;
const resolve = value => value && typeof value === 'object' && '$ref' in value ? values[value.$ref] : value;
for (const step of steps) {
    try {
        let value;
        if (step.op === 'store') { values[step.save] = step.value; continue; }
        if (step.op === 'create') { planner = api.createPlanner(...(step.args || []).map(resolve)); value = null; }
        else if (step.op === 'format') value = api.formatOrder(...step.args.map(resolve));
        else if (step.op === 'read') value = resolve(step.value);
        else if (step.op === 'call') value = planner[step.method](...(step.args || []).map(resolve));
        else if (step.op === 'mutate') {
            const target = step.path.reduce((object, key) => object[key], values[step.target]);
            target[step.method](...step.args);
        } else if (step.op !== 'create') throw new Error('Unsupported probe operation');
        if (step.save) values[step.save] = value;
        if (step.id) observations[step.id] = { value: clone(value) };
    } catch (error) {
        if (step.id) observations[step.id] = { error: error.code || error.name };
        // Mutating an immutable returned copy may throw; the later state observation still must hold.
    }
}
send(3, stringify(observations));
