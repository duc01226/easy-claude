'use strict';
const assert = require('node:assert/strict');
const observe = require('./observe.cjs');
const ref = name => ({ $ref: name });
const input = [{ id: 'deploy', requires: ['test', 'build'] }, { id: 'test', requires: ['build'] }, { id: 'build' }, { id: 'audit' }];
const steps = [
    { op: 'store', save: 'input', value: input }, { id: 'init', op: 'create', args: [ref('input')] },
    { id: 'inputAfter', op: 'read', value: ref('input') },
    { id: 'all', op: 'call', method: 'plan' }, { id: 'closure', op: 'call', method: 'plan', args: [['deploy']] },
    { id: 'empty', op: 'call', method: 'plan', args: [[]] }, { id: 'snapshot', op: 'call', method: 'snapshot', save: 'copy' },
    { op: 'mutate', target: 'copy', path: [0, 'requires'], method: 'push', args: ['deploy'] },
    { op: 'mutate', target: 'copy', path: [], method: 'pop', args: [] },
    { id: 'afterCopy', op: 'call', method: 'plan' },
    { op: 'store', save: 'added', value: { id: 'ship', requires: ['deploy'] } },
    { id: 'add', op: 'call', method: 'add', args: [ref('added')] },
    { op: 'mutate', target: 'added', path: ['requires'], method: 'splice', args: [0] },
    { id: 'afterInputMutation', op: 'call', method: 'plan', args: [['ship']] }
];
const invalid = [
    ['add', [{ id: 'build' }], 'DUPLICATE_TASK'], ['add', [{ id: 'new', requires: ['missing'] }], 'UNKNOWN_TASK'],
    ['add', [{ id: 'new', requires: ['build', 'build'] }], 'DUPLICATE_TASK'], ['add', [{ id: 'self', requires: ['self'] }], 'CYCLE'],
    ['remove', ['build'], 'IN_USE'], ['remove', ['missing'], 'UNKNOWN_TASK'], ['plan', [['missing']], 'UNKNOWN_TASK'],
    ['add', [{ id: '' }], 'INVALID_TASK'], ['plan', ['deploy'], 'INVALID_TASK']
];
invalid.forEach(([method, args], i) => steps.push({ id: `before${i}`, op: 'call', method: 'snapshot' }, { id: `bad${i}`, op: 'call', method, args }, { id: `after${i}`, op: 'call', method: 'snapshot' }));
steps.push({ id: 'remove', op: 'call', method: 'remove', args: ['ship'] }, { id: 'afterRemove', op: 'call', method: 'plan' });
const malformed = [null, {}, [null], [{ id: '1bad' }], [{ id: 'a'.repeat(65) }], [{ id: 'ok', requires: null }], [{ id: 'ok', requires: [4] }]];
malformed.forEach((value, i) => steps.push({ id: `invalid${i}`, op: 'create', args: [value] }));
for (const [id, value] of [['duplicate', [{ id: 'a' }, { id: 'a' }]], ['cycle', [{ id: 'a', requires: ['b'] }, { id: 'b', requires: ['a'] }]], ['unknown', [{ id: 'a', requires: ['none'] }]]]) steps.push({ id, op: 'create', args: [value] });
steps.push({ id: 'default', op: 'create' }, { id: 'emptySnapshot', op: 'call', method: 'snapshot' });
for (let size = 1; size <= 32; size++) {
    // Every newly-ready b must precede already-ready z; permutations cannot change the answer.
    const tasks = [{ id: 'z' }, ...Array.from({ length: size }, (_, i) => ({ id: `b${String(i).padStart(3, '0')}`, requires: [i ? `b${String(i - 1).padStart(3, '0')}` : 'a'] })), { id: 'a' }];
    steps.push({ id: `init${size}`, op: 'create', args: [size % 2 ? tasks.reverse() : tasks] }, { id: `order${size}`, op: 'call', method: 'plan' });
}
const chain = Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}`, requires: i ? [`t${i - 1}`] : [] }));
steps.push({ id: 'large', op: 'create', args: [chain] }, { id: 'largeOrder', op: 'call', method: 'plan', args: [['t999']] });
const result = observe(steps);
const value = key => result[key].value;
assert.equal(value('init'), null); assert.deepEqual(value('inputAfter'), input);
const order = ['audit', 'build', 'test', 'deploy'];
assert.deepEqual(value('all'), order); assert.deepEqual(value('closure'), ['build', 'test', 'deploy']); assert.deepEqual(value('empty'), []);
assert.deepEqual(value('snapshot'), [{ id: 'audit', requires: [] }, { id: 'build', requires: [] }, { id: 'deploy', requires: ['build', 'test'] }, { id: 'test', requires: ['build'] }]);
assert.deepEqual(value('afterCopy'), order); assert.deepEqual(value('afterInputMutation'), ['build', 'test', 'deploy', 'ship']);
invalid.forEach(([, , expected], i) => { assert.equal(result[`bad${i}`].error, expected); assert.deepEqual(value(`before${i}`), value(`after${i}`)); });
assert.deepEqual(value('afterRemove'), order); malformed.forEach((_, i) => assert.equal(result[`invalid${i}`].error, 'INVALID_TASK'));
assert.equal(result.duplicate.error, 'DUPLICATE_TASK'); assert.equal(result.cycle.error, 'CYCLE'); assert.equal(result.unknown.error, 'UNKNOWN_TASK'); assert.deepEqual(value('emptySnapshot'), []);
for (let size = 1; size <= 32; size++) assert.deepEqual(value(`order${size}`), ['a', ...Array.from({ length: size }, (_, i) => `b${String(i).padStart(3, '0')}`), 'z']);
assert.deepEqual(value('largeOrder'), Array.from({ length: 1000 }, (_, i) => `t${i}`));
console.log('Frozen API, atomicity, ownership, canonical sorting and branching properties passed');
