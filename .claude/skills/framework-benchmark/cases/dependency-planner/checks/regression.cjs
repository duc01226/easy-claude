'use strict';
const assert = require('node:assert/strict');
const observe = require('./observe.cjs');
const result = observe([
    { op: 'store', save: 'ids', value: ['build', 'test'] },
    { id: 'normal', op: 'format', args: [{ $ref: 'ids' }] }, { id: 'after', op: 'read', value: { $ref: 'ids' } },
    { id: 'empty', op: 'format', args: [[]] }, { id: 'badArray', op: 'format', args: [null] },
    { id: 'badElement', op: 'format', args: [[42]] }, { id: 'mixed', op: 'format', args: [['a', null]] }
]);
assert.deepEqual(result, { normal: { value: 'build -> test' }, after: { value: ['build', 'test'] }, empty: { value: '' }, badArray: { error: 'TypeError' }, badElement: { error: 'TypeError' }, mixed: { error: 'TypeError' } });
console.log('Frozen formatting and input-ownership regression passed');
