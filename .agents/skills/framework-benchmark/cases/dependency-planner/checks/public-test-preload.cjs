'use strict';

const fs = require('node:fs');
// Initialize native reporting even for a normally completed file registering zero tests.
require('node:test').before(() => {});
// This marker is conjunctive with reporter completion and exit0, never sufficient alone.
process.once('beforeExit', () => {
    fs.writeSync(3, JSON.stringify({ event: 'completed' }) + '\n');
});
