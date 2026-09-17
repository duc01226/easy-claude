#!/usr/bin/env node
/**
 * test-full-flow-edge-cases.js - Edge case validation for full hook flow
 */

// Drives the REAL gate. This file used to carry its own copy of a whole-command
// regex allowlist and assert against that copy, so it could not fail however the
// shipped hook behaved — and its copy had already drifted further from the live
// code than the sibling allowlist test's. The live gate does not classify whole
// commands at all: it tokenizes, extracts operands, and treats a build operation
// as a command word (scout-block/path-extractor.cjs isBuildOperationToken). The
// question these cases actually protect is "does this command reach a blocked
// path?", which is what `isAllowed` now asks.
const { evaluate } = require('../../scout-block.cjs');

function isAllowed(command) {
  const result = evaluate({ tool_name: 'Bash', tool_input: { command } });
  return !(result && result.decision === 'block');
}

console.log('=== FULL FLOW EDGE CASE VALIDATION ===\n');

const tests = [
  // Should be ALLOWED (bypass path extraction)
  { cmd: 'go build ./...', expect: true, desc: 'go build basic' },
  { cmd: 'cargo build', expect: true, desc: 'cargo build basic' },
  { cmd: 'make build', expect: true, desc: 'make build' },
  { cmd: 'make -j4', expect: true, desc: 'make with flags' },
  { cmd: 'mvn clean install', expect: true, desc: 'maven' },
  { cmd: 'gradle build', expect: true, desc: 'gradle' },
  { cmd: 'dotnet build', expect: true, desc: 'dotnet' },
  { cmd: 'npm run build', expect: true, desc: 'npm run build' },
  { cmd: 'go test ./...', expect: true, desc: 'go test' },

  // ALLOWED, and these two changed when the assertions moved onto the live gate.
  // Both were `false` under the old inline regex — not because allowing them was
  // wrong, but because a start-anchored whole-command regex could not see past the
  // first word. The token-level extractor can, so it reaches the right answer:
  { cmd: 'docker build .', expect: true, desc: 'docker build — `.` is not a blocked path' },
  { cmd: 'cd proj && go build', expect: true, desc: 'chained with cd first — each segment is classified' },

  // BLOCKED. A command-word prefix (env assignment, sudo, time) makes the segment's
  // first executable something other than a build tool, so `build` is no longer read
  // as a build operation and is extracted as a path — where it matches the blocked
  // `build` directory. This is a KNOWN limitation, carried over from the regex era
  // and listed under EDGE CASES below; it is asserted here so it cannot change
  // unnoticed, NOT endorsed.
  { cmd: 'GOOS=linux go build', expect: false, desc: 'env var prefix' },
  { cmd: 'sudo go build', expect: false, desc: 'sudo prefix' },
  { cmd: 'time go build', expect: false, desc: 'time prefix' },

  // BLOCKED, and correctly so — these genuinely name the build directory.
  { cmd: 'ls build', expect: false, desc: 'ls build dir' },
  { cmd: 'cd build', expect: false, desc: 'cd build dir' },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = isAllowed(t.cmd);
  const success = result === t.expect;

  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${t.desc}: "${t.cmd}" → ${result}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${t.desc}: "${t.cmd}" → ${result} (expected ${t.expect})`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Additional edge case analysis
console.log('\n=== EDGE CASES REQUIRING ATTENTION ===\n');

const edgeCases = [
  { cmd: 'docker build .', issue: 'docker not in TOOL_COMMAND_PATTERN - should it be?' },
  { cmd: 'cd proj && go build', issue: 'Chained commands: first segment checked, not individual commands' },
  { cmd: 'GOOS=linux go build', issue: 'Env var prefix breaks regex start anchor' },
  { cmd: 'php artisan build', issue: 'php/artisan not in patterns' },
  { cmd: 'bundle exec build', issue: 'ruby bundler not in patterns' },
];

console.log('Known edge cases that may cause UX issues:\n');
for (const ec of edgeCases) {
  const allowed = isAllowed(ec.cmd);
  console.log(`  ${allowed ? '✓' : '⚠'} "${ec.cmd}"`);
  console.log(`     Issue: ${ec.issue}\n`);
}

process.exit(failed > 0 ? 1 : 0);
