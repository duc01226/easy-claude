'use strict';

const fs = require('node:fs');
module.exports = async function* report(source) {
    let passed = 0, failed = 0;
    const active = value => value !== undefined && value !== false;
    for await (const event of source) {
        const data = event.data;
        // Node18 ordinary tests omit type; newer releases label them 'test'.
        if (data?.details?.type !== undefined && data.details.type !== 'test') continue;
        if (active(data?.skip) || active(data?.todo)) continue;
        if (event.type === 'test:pass') passed++;
        if (event.type === 'test:fail') {
            failed++;
            process.stderr.write(`Public test failed: ${String(data.name).slice(0, 200)} ${String(data.details?.error?.message || '').slice(0, 1000)}\n`);
        }
    }
    fs.writeSync(3, JSON.stringify({ event: 'tests', complete: true, passed, failed }) + '\n');
};
