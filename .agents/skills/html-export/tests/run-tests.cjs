#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function compareNames(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function main() {
  let testFiles;
  try {
    testFiles = fs.readdirSync(__dirname)
      .filter((name) => name.endsWith('.test.cjs'))
      .sort(compareNames);
  } catch (error) {
    console.error(`Could not discover html-export tests: ${error.message}`);
    return 1;
  }

  if (testFiles.length === 0) {
    console.error('No html-export *.test.cjs files were found.');
    return 1;
  }

  let failed = false;
  for (const file of testFiles) {
    const testPath = path.join(__dirname, file);
    const result = spawnSync(process.execPath, [testPath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      timeout: 120_000,
    });

    let status;
    if (result.error) {
      status = `ERROR (${result.error.message})`;
    } else if (result.status === null) {
      status = `FAIL (terminated${result.signal ? ` by ${result.signal}` : ''})`;
    } else if (result.status !== 0) {
      status = `FAIL (exit ${result.status})`;
    } else {
      status = 'PASS';
    }

    console.log(`${file}: ${status}`);
    if (result.error || result.status !== 0) failed = true;
  }

  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { compareNames, main };
