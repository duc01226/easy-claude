'use strict';
const assert = require('node:assert/strict');
const { formatOrder } = require('./planner.cjs');
const ids = ['prepare', 'build'];
assert.equal(formatOrder(ids), 'prepare -> build');
assert.deepEqual(ids, ['prepare', 'build']);
assert.equal(formatOrder([]), '');
assert.throws(() => formatOrder('build'), TypeError);
console.log('Existing formatting behavior preserved');
