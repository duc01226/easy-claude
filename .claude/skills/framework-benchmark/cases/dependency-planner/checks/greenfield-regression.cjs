'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.BENCH_WORKSPACE || '/workspace';
// An empty greenfield has no previous formatting implementation. Once delivered, it must honor the brief.
if (fs.existsSync(path.join(root, 'planner.cjs'))) require('./regression.cjs');
else console.log('Empty greenfield has no pre-existing application behavior');
