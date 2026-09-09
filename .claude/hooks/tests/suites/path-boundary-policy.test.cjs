'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { inspectCommand } = require('../../lib/command-inspection.cjs');
const { evaluateBoundary, unwrapCommand } = require('../../lib/path-boundary-policy.cjs');

const ROOT = path.resolve(__dirname, '../../..', '..');
const HOOK = path.resolve(__dirname, '../../path-boundary-block.cjs');

function lexicalResolver() {
  return { resolve(value, base) { return path.resolve(base, value); } };
}

function evaluate(command, extra = {}) {
  return evaluateBoundary({
    toolName: 'Bash',
    toolInput: command === undefined ? {} : { command },
    eventCwd: ROOT,
    projectRoot: ROOT,
    allowlist: [],
    inspect: inspectCommand,
    resolver: lexicalResolver(),
    ...extra
  });
}

function runHook(command, toolInput = { command }, event = {}) {
  const input = { tool_name: 'Bash', cwd: ROOT, ...event, tool_input: toolInput };
  return spawnSync(process.execPath, [HOOK], {
    cwd: ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 10000
  });
}

const tests = [
  {
    name: 'mixed command and structured write paths cannot bypass the boundary gate',
    fn() {
      const outside = path.join(path.dirname(ROOT), 'boundary-mixed-input.txt');
      const cases = [
        ['empty command + file_path', 'Write', { command: '', file_path: outside }],
        ['read command + file_path', 'Write', { command: 'echo safe', file_path: outside }],
        ['read command + path', 'Write', { command: 'echo safe', path: outside }],
        ['read command + notebook_path', 'Write', { command: 'echo safe', notebook_path: outside }],
        ['read command + MCP paths', 'mcp__filesystem__edit_multiple_files', { command: 'echo safe', paths: [outside] }]
      ];

      for (const [label, toolName, toolInput] of cases) {
        const result = runHook(undefined, toolInput, { tool_name: toolName });
        assert.equal(result.status, 2, `${label} must be denied: ${result.stderr}`);
        assert.match(result.stderr, /Path outside project boundary/, label);
      }
    }
  },
  {
    name: 'R05 wrapper grammar is explicit, bounded and preserves child scope',
    fn() {
      for (const prefix of ['env', 'env.exe -i', 'env --ignore-environment', 'env -0', 'env --null', 'env -u NAME', 'env -uNAME', 'env --unset=NAME', 'env NAME=value', 'env --', 'sudo', 'sudo -n -E -H', 'sudo --non-interactive --preserve-env --set-home', 'sudo -u user', 'sudo -uuser', 'sudo --user=user', 'sudo -gstaff', 'sudo --group staff', 'command -p', 'builtin', 'exec -c -l -a name', 'env sudo -g staff']) {
        assert.equal(evaluate(`${prefix} cat ../outside.txt`).status, 'BLOCK', prefix);
        assert.equal(evaluate(`${prefix} cat README.md`).status, 'ALLOW', prefix);
      }
      for (const command of ['env', 'env -u', 'env -C "" cat README.md', 'env --chdir . --chdir . cat README.md', 'sudo -g "$GROUP" cat README.md', 'env "$COMMAND" README.md', 'env -S "cat README.md"', 'env --split-string="cat README.md"', 'env -i env -i env -i env -i env cat README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
      }
      const wrapper = unwrapCommand(inspectCommand('env --chdir=docs cat README.md > result.txt').statements[0]);
      assert.deepEqual(wrapper.cwdChanges, ['docs']);
      assert.equal(wrapper.inner.command.value, 'cat');
      assert.equal(wrapper.inner.redirects[0].target.value, 'result.txt');
      assert.equal(unwrapCommand(inspectCommand('echo data').statements[0]), null);
      const nested = evaluate('env -C docs git -C .. diff -- README.md; cat CLAUDE.md');
      assert.equal(nested.status, 'ALLOW');
      assert.equal(path.relative(ROOT, nested.paths.find(row => row.role === 'git-diff-pathspec').resolved), 'README.md');
      assert.equal(evaluate('env -C .. echo ok').status, 'BLOCK', 'cwd itself stays boundary checked');
      assert.equal(evaluate('env cat README.md > ../outside.txt').status, 'BLOCK', 'outer redirect remains checked');
      assert.equal(evaluate('env -C docs cat README.md > ../outside.txt').status, 'BLOCK', 'outer redirect precedes chdir');
      assert.equal(evaluate('env -C docs cat README.md > result.txt').paths.find(row => row.role === 'output-redirect').resolved.toLowerCase(), path.join(ROOT, 'result.txt').toLowerCase());
      assert.equal(evaluate('env -C docs cat README.md > "$OUTPUT"').status, 'UNKNOWN');
    }
  },
  {
    name: 'R03-R06 command roles preserve directory transitions, optional values and wrapper operands',
    fn() {
      for (const option of ['--unified', '--abbrev', '--color', '--word-diff', '--ignore-submodules', '--relative', '--submodule']) {
        assert.equal(evaluate(`git diff --no-index ${option} ../outside.txt README.md`).status, 'BLOCK', option);
        assert.equal(evaluate(`git diff --no-index ${option} README.md CLAUDE.md`).status, 'ALLOW', option);
      }
      const outsideForms = [
        'tar -c -f archive.tar -C .. outside.txt',
        'tar -c -f archive.tar --directory=.. outside.txt',
        'git diff --no-index --color ../outside.txt README.md',
        'git diff --no-index --word-diff ../outside.txt README.md',
        'bash.exe -c "cat ../outside.txt"',
        'sudo -g staff cat ../outside.txt',
        'env --chdir .. cat outside.txt',
        'env -C.. cat outside.txt'
      ];
      for (const command of outsideForms) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
      }
      // The HOOK adds a write-only gate ahead of this policy: a command that cannot create, modify
      // or delete a file is allowed wherever it points, because a read outside the root commits no
      // accident the hook exists to prevent. So the end-to-end assertion runs the same grammar
      // forms twice — once mutating (must reach exit 2) and once reading (must NOT). Dropping the
      // read half would hide the over-blocking this model was written to remove.
      for (const command of [
        'tar -c -f archive.tar -C .. outside.txt',
        'tar -c -f archive.tar --directory=.. outside.txt',
        'git -C .. diff --output=patch.diff',
        'bash.exe -c "rm ../outside.txt"',
        'sudo -g staff rm ../outside.txt',
        'env --chdir .. rm outside.txt',
        'env -C.. rm outside.txt'
      ]) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of outsideForms.filter(form => !form.startsWith('tar'))) {
        assert.equal(runHook(command).status, 0, `read-only form must not be denied: ${command}`);
      }
      for (const command of [
        'tar -c -f archive.tar -C . README.md',
        'tar -c -f archive.tar --directory=. README.md',
        'git diff --no-index --color README.md CLAUDE.md',
        'git diff --no-index --color=always README.md CLAUDE.md',
        'bash.exe -c "cat README.md"',
        'sudo -g staff cat README.md',
        'env --chdir . cat README.md',
        'env -C. cat README.md'
      ]) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      const scoped = evaluate('tar -c -f archive.tar -C docs one.txt -C .. README.md; cat CLAUDE.md');
      assert.equal(scoped.status, 'ALLOW');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.role === 'tar-archive').resolved), 'archive.tar');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('one.txt')).resolved), path.join('docs', 'one.txt'));
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('README.md')).resolved), 'README.md');
      assert.equal(path.relative(ROOT, scoped.paths.find(row => row.resolved?.endsWith('CLAUDE.md')).resolved), 'CLAUDE.md');
      for (const command of ['env -S "cat ../outside.txt"', 'env -S "cat README.md"', 'sudo --unknown staff cat README.md', 'tar -c -f archive.tar -C "$DIR" README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
      }
      // Unresolvable scope still fails CLOSED at the hook — but only for a statement that can write.
      // An unfollowable `-C "$DIR"` around a read loses nothing, so it is not worth a denial.
      for (const command of ['tar -c -f archive.tar -C "$DIR" README.md', 'env -S "rm ../outside.txt"']) {
        assert.equal(runHook(command).status, 2, command);
      }
      assert.equal(runHook('env -S "cat ../outside.txt"').status, 0, 'unknown scope around a read is not a boundary risk');
    }
  },
  {
    name: 'R06 inspector resource uncertainty cannot be an empty allow',
    fn() {
      for (const length of [65535, 65536]) assert.equal(evaluate(' '.repeat(length)).status, 'ALLOW');
      for (const command of [' '.repeat(65537), ' '.repeat(65536) + 'cat ../outside.txt', ' '.repeat(65536) + 'rm ../outside.txt']) {
        const result = evaluate(command);
        assert.equal(result.status, 'UNKNOWN');
        assert.ok(result.diagnostics.some(item => item.code === 'INPUT_LIMIT'));
      }
      // An over-long command reaches the policy — and its fail-closed exit 2 — only when it can
      // mutate a file. The inspector has already given up at this size, so the hook's literal
      // fallback scan is what has to see the mutator; that is exactly what this pins.
      assert.equal(runHook(' '.repeat(65536) + 'rm ../outside.txt').status, 2);
      assert.equal(runHook(' '.repeat(65536) + 'cat ../outside.txt').status, 0);
      assert.equal(evaluate('echo hi', { inspect: () => ({ status: 'UNKNOWN', statements: [], diagnostics: [] }) }).status, 'UNKNOWN');
    }
  },
  {
    name: 'R2-05 Git global cwd options scope every diff operand',
    fn() {
      const outside = path.dirname(ROOT).replace(/\\/g, '/');
      for (const command of [`git -C "${outside}" diff -- README.md`, 'git -C .. diff -- README.md', 'git -C . -C .. diff -- README.md', 'git -C.. diff -- README.md', 'bash -c \'git -C .. diff -- README.md\'', 'git -C .. diff --output=patch.diff']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
      }
      // `git diff` reads; `git diff --output=<file>` materializes one. The hook's write-only gate
      // splits them, so the same out-of-tree `-C` scoping denies for the writer and allows the
      // reader. `--output` is the ONLY git form this hook treats as a write — every other git
      // mutation targets the work tree, which is `git-commit-block.cjs`'s subject, not this one's.
      for (const command of [`git -C "${outside}" diff --output=patch.diff`, 'git -C .. diff --output=patch.diff', 'git -C.. diff --output=patch.diff']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of [`git -C "${outside}" diff -- README.md`, 'git -C .. diff -- README.md', 'bash -c \'git -C .. diff -- README.md\'']) {
        assert.equal(runHook(command).status, 0, `read-only diff must not be denied: ${command}`);
      }
      for (const command of ['git diff -- README.md', 'git -C . diff -- README.md', 'git -C docs -C .. diff -- README.md', 'git -C "" diff -- README.md']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      assert.equal(evaluate('git -C "$DIR" diff -- README.md').status, 'UNKNOWN');
      assert.equal(runHook('git -C "$DIR" diff --output=patch.diff').status, 2);
      for (const command of ['git -c core.worktree=.. diff -- README.md', 'git --work-tree=.. diff -- README.md']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(`${command.replace(' -- README.md', '')} --output=patch.diff`).status, 2, command);
      }
      assert.equal(evaluate('git -C docs diff -- README.md; cat README.md').status, 'ALLOW');
      const scoped = evaluate('git -C docs diff -- README.md; cat README.md');
      assert.equal(path.relative(path.resolve(ROOT, 'docs', 'README.md'), scoped.paths.find(item => item.role === 'git-diff-pathspec').resolved), '');
      assert.equal(path.relative(path.resolve(ROOT, 'README.md'), scoped.paths.find(item => item.role === 'operand').resolved), '');
      const missingCwd = evaluate('git -C absent diff -- README.md', { resolver: { resolve() { throw new Error('missing cwd'); } } });
      assert.equal(missingCwd.status, 'UNKNOWN');
    }
  },
  {
    name: 'TC-HARNESS-016 relative read and input redirect are classified',
    fn() {
      assert.equal(evaluate('cat ../../outside.txt').status, 'BLOCK');
      assert.equal(evaluate('cat < ../../outside.txt').status, 'BLOCK');
      assert.equal(evaluate('cat docs/project-reference/docs-index-reference.md').status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-017 cwd transition cannot re-scope later relative access',
    fn() {
      const navigation = evaluate('cd D:/outside');
      assert.equal(navigation.status, 'ALLOW');
      const access = evaluate('cd D:/outside && cat secret.txt');
      assert.equal(access.status, 'UNKNOWN');
      assert.ok(access.diagnostics.some(item => item.code === 'CWD_TRANSITION_UNKNOWN'));
      for (const command of [
        'bash -c "cd ../../outside && cat secret.txt"',
        'sh -c "pushd ../../outside; cat secret.txt"',
        'bash -c "popd; cat secret.txt"',
        'bash -c \'sh -c "cd ../../outside && cat secret.txt"\''
      ]) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
      }
      // An unfollowable `cd` fails CLOSED at the hook when the statement can write — including
      // through a NESTED `-c` payload, where the mutator lives inside a single argv token and only
      // parsing that token can see it. A read after the same unfollowable `cd` loses no data.
      for (const command of [
        'bash -c "cd ../../outside && rm secret.txt"',
        'sh -c "pushd ../../outside; rm secret.txt"',
        'bash -c "popd; rm secret.txt"',
        'bash -c \'sh -c "cd ../../outside && rm secret.txt"\''
      ]) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 2, command);
      }
      assert.equal(runHook('bash -c "cd ../../outside && cat secret.txt"').status, 0, 'a read after an unknown cd is not a boundary risk');
      assert.equal(evaluate('bash -c "cat README.md"').status, 'ALLOW');
      assert.equal(runHook('bash -c "cat README.md"').status, 0);
      assert.equal(evaluate('bash -c "cd ../../outside"; cat README.md').status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-018 visible bind sources are host paths',
    fn() {
      assert.equal(evaluate('docker run -v D:/outside:/data alpine').status, 'BLOCK');
      assert.equal(evaluate(`docker run -v ${ROOT.replace(/\\/g, '/')}/tmp:/data alpine`).status, 'ALLOW');
    }
  },
  {
    name: 'TC-HARNESS-019 container exec without host metadata is unknown',
    fn() {
      assert.equal(evaluate('docker exec container cat /etc/passwd').status, 'UNKNOWN');
      assert.equal(evaluate('kubectl exec pod -- cat /etc/passwd').status, 'UNKNOWN');
    }
  },
  {
    // Regression: shell and container operand collection reads argv only, so both returned
    // before the redirect loop. A fully covered nested body then suppressed the legacy
    // fallback and the outer target escaped the boundary unchecked.
    name: 'invocation-scope redirects survive shell and container operand collection',
    fn() {
      for (const command of [
        'bash -c "cat README.md" > ../outside.txt',
        'sh -c "echo hi" > ../outside.txt',
        'bash -c "cat README.md" >> ../outside.txt',
        'bash -c "cat README.md" < ../outside.txt',
        'docker run --rm alpine > ../outside.txt',
        `docker run -v ${ROOT.replace(/\\/g, '/')}/tmp:/data alpine > ../outside.txt`
      ]) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
      }
      // An OUTPUT redirect is a write no matter what command precedes it, so every `>`/`>>` form
      // above reaches exit 2 end-to-end. The INPUT redirect is the one exception: `< ../outside.txt`
      // only reads that file, so the hook's write-only gate allows it while the policy still
      // classifies it as outside — the layers disagree on purpose, and this pins both halves.
      for (const command of [
        'bash -c "cat README.md" > ../outside.txt',
        'sh -c "echo hi" > ../outside.txt',
        'bash -c "cat README.md" >> ../outside.txt',
        'docker run --rm alpine > ../outside.txt',
        `docker run -v ${ROOT.replace(/\\/g, '/')}/tmp:/data alpine > ../outside.txt`
      ]) {
        assert.equal(runHook(command).status, 2, command);
      }
      assert.equal(runHook('bash -c "cat README.md" < ../outside.txt').status, 0, 'an input redirect only reads its source');
      // The redirect is resolved in the invocation scope, never the nested body's scope.
      assert.equal(evaluate('bash -c "cd docs && cat README.md" > result.txt').paths
        .find(row => row.role === 'output-redirect').resolved.toLowerCase(),
      path.join(ROOT, 'result.txt').toLowerCase());
      assert.equal(evaluate('bash -c "cat README.md" > "$OUTPUT"').status, 'UNKNOWN');
      // Control: an in-project target stays allowed, so the guard adds no false denials.
      assert.equal(evaluate('bash -c "cat README.md" > result.txt').status, 'ALLOW');
      assert.equal(evaluate('docker run --rm alpine > result.txt').status, 'ALLOW');
      assert.equal(runHook('bash -c "cat README.md" > result.txt').status, 0);
    }
  },
  {
    name: 'TC-HARNESS-020 aggregation is outside-wins over unknown',
    fn() {
      const value = evaluate('cat ../../outside.txt && ${UNKNOWN_PATH}');
      assert.equal(value.status, 'BLOCK');
      assert.ok(value.paths.some(item => item.outcome === 'OUTSIDE'));
    }
  },
  {
    name: 'TC-HARNESS-021 invalid protected context is unknown while malformed envelope is visible and fail-closed',
    fn() {
      assert.equal(evaluate('cat file.txt', { eventCwd: 'relative/cwd' }).status, 'UNKNOWN');
      const malformed = runHook(undefined, null);
      assert.equal(malformed.status, 2, malformed.stderr);
      assert.ok(malformed.stderr.length > 0, 'malformed envelope must be visible');
    }
  },
  {
    // REGRESSION CORPUS — the defect class this suite could not previously see.
    //
    // Every ALLOW assertion here pairs a REAL, everyday flag form with an INSIDE
    // path. The suite already exercised the arity deny-branch, but only with an
    // INVENTED flag (`--unknown-arity`) against an OUTSIDE path, so the assertion
    // passed for the wrong reason and could never distinguish "unmodeled flag"
    // from "outside path". Result: 499 green tests coexisted with a harness that
    // blocked `ls -la`, `mkdir -p`, `grep -rn`, `head -3` and `git diff --numstat`.
    //
    // The BLOCK half is the load-bearing half. Before the cluster fix these same
    // commands returned UNKNOWN — denied by accident, before the boundary ever
    // parsed the path. They must now deny for the RIGHT reason (OUTSIDE_PROJECT),
    // which is what proves the fix widened parsing without widening access.
    name: 'everyday flag forms resolve inside the project and still deny outside it',
    fn() {
      const insideAllow = [
        'ls -la', 'ls -la .claude/hooks/lib', 'ls -a -l .claude/hooks/lib',
        'mkdir -p plans/x/y', 'mkdir -p a b',
        'rm -rf .claude/tmp', 'cp -r .claude/hooks plans/backup',
        'grep -rn needle .claude', 'grep -rln needle .claude',
        'head -3 README.md', 'tail -25 README.md', 'head -n 3 README.md',
        'git diff --numstat HEAD', 'git diff --compact-summary HEAD',
        'git diff -U0 HEAD', 'git diff -U 0 HEAD', 'git diff --unified=0 HEAD'
      ];
      for (const command of insideAllow) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
      }

      // Same flag forms, outside path — must BLOCK on the boundary, not bail as UNKNOWN.
      const outsideBlock = [
        'ls -la ../../outside', 'mkdir -p ../../outside/x', 'rm -rf ../../outside',
        'cp -r .claude ../../outside', 'grep -rn needle ../../outside',
        'head -3 ../../outside.txt', 'tail -25 ../../outside.txt'
      ];
      for (const command of outsideBlock) {
        const result = evaluate(command);
        assert.equal(result.status, 'BLOCK', command);
        assert.ok(
          result.diagnostics.some(d => d.code === 'OUTSIDE_PROJECT'),
          `${command} must deny as OUTSIDE_PROJECT, not by failing to parse the option`
        );
      }

      // Conservative decomposition holds its line: an unmodeled letter still denies,
      // and a clustered letter that TAKES a value still denies. Widening either of
      // these would reclassify a real operand as a flag.
      for (const command of ['tar -xzf a.tgz', 'head -qn 3 README.md', 'grep -rA needle .claude']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
      }
    }
  },
  {
    // PRESERVATION CORPUS — the boundary bypass this suite could not see.
    //
    // `covered` decides whether the legacy regex path extractor is suppressed,
    // so it must mean "operand-role classification MODELED this command", not
    // merely "some path row exists". While the two were conflated, `covered` was
    // `paths.length > 0` — and the ROW is what armed it, not any property of a
    // redirect. That distinction is the whole finding: a redirect target is
    // simply the only row collectable from a command whose operands are not
    // modeled, so appending one was the cheapest way to manufacture the row that
    // suppressed the fallback catching the real operand, and the statement was
    // ALLOWED. 518 green tests coexisted with an open path boundary, because the
    // nearest case only covered the NESTED-body variant
    // (`bash -c "…" > ../outside.txt`), never plain command + redirect.
    //
    // Measured, so the mechanism is not mis-stated: `cat README.md 2>&1` ALLOWs
    // with covered=true and two path rows — a redirect on a MODELED command is
    // ordinary, correctly covered work, and was never the bypass. Post-fix,
    // `curl -o /etc/passwd https://x > out.txt` reports covered=false with one
    // path row, which is the row-vs-modeled split this corpus locks.
    name: 'an in-project redirect never launders an unmodeled command past the boundary',
    fn() {
      // ASSERT AT THE LAYER THAT OWNS THE INVARIANT. The structured policy never
      // claimed to BLOCK these — it does not model `curl`'s operands at all, and
      // that is legitimate. What it MUST NOT do is claim `covered`, because the
      // block hook reads `covered` as "the policy understood this command" and
      // suppresses the legacy regex extractor on the strength of it. So the
      // policy-level assertion is on coverage, and the end-to-end verdict is
      // asserted through the real hook entrypoint below.
      const bypassAttempts = [
        'curl -o /etc/passwd https://x > out.txt',
        'sudo curl -o /etc/passwd https://x > out.txt',
        'curl -o /etc/passwd https://x >> out.txt',
        'wget -O /etc/shadow https://x > log.txt',
        'sort /etc/passwd > out.txt'
      ];
      for (const command of bypassAttempts) {
        assert.equal(
          evaluate(command).covered,
          false,
          `${command} is unmodeled — claiming coverage suppresses the fallback that catches it`
        );
        assert.equal(
          runHook(command).status,
          2,
          `${command} must not become allowed by appending an in-project redirect`
        );
      }

      // The bare forms are denied too. That is what makes the cases above a
      // BYPASS claim rather than a coincidence: the same command was already
      // denied without a redirect, so the redirect added nothing but the path row
      // that used to suppress the fallback. Both forms must land on the same
      // verdict, from the same layer — the legacy fallback's "Path outside
      // project boundary", measured through the real hook, not the policy.
      for (const command of ['curl -o /etc/passwd https://x', 'shred /etc/passwd']) {
        const bare = runHook(command);
        assert.equal(bare.status, 2, command);
        assert.match(
          bare.stderr,
          /Path outside project boundary/,
          `${command} must be denied by the fallback's boundary verdict, not by an unrelated guard`
        );
        assert.match(
          runHook(`${command} > out.txt`).stderr,
          /Path outside project boundary/,
          `${command} must reach the SAME verdict with a redirect appended`
        );
      }

      // The counterexample that keeps the comment above honest: a redirect on a
      // MODELED command is ordinary work. If this ever starts reporting covered
      // false — or gets denied — the fix has drifted from "was this command
      // modelled?" back toward "does this statement redirect?".
      const modelledRedirect = evaluate('cat README.md 2>&1');
      assert.equal(modelledRedirect.covered, true, 'a modelled command stays covered when it redirects');
      assert.equal(runHook('cat README.md 2>&1').status, 0, 'an in-project redirect on a modelled command is allowed');

      // A traversal operand on an unmodeled command is caught the same way: the
      // policy never collects it (it does not model `sort`'s operands), so the
      // whole defence rests on `covered` staying false and the fallback running.
      // This one was open with NO redirect at all: the fallback modeled absolute
      // paths and a fixed read-command list, but had no relative-traversal rule,
      // so an unmodeled command's `../` operand escaped both layers.
      for (const command of [
        'shred ../../outside.txt',
        'shred ../../outside.txt > out.txt',
        'sort ../../outside.txt > out.txt',
        'curl -o ../../outside.txt https://x'
      ]) {
        assert.equal(evaluate(command).covered, false, command);
        assert.equal(runHook(command).status, 2, command);
      }

      // The same unmodeled command READING that operand is allowed. `sort ../../outside.txt` and
      // `shred ../../outside.txt` are identical to both layers except for the write-only gate, so
      // this pair is what proves the gate — not the fallback — is deciding, and that it decides on
      // "can this destroy something?" rather than "did the policy understand this?".
      for (const command of ['sort ../../outside.txt', 'sort /etc/passwd', 'curl https://x/../../outside.txt']) {
        assert.equal(runHook(command).status, 0, `read-only unmodeled command must not be denied: ${command}`);
      }

      // The traversal rule must stay narrow. `..` outside a path context — commit
      // ranges, numeric ranges — is not a path, and `..` that resolves back inside
      // the project is not a boundary crossing.
      for (const command of [
        'git log HEAD~2..HEAD',
        'git diff 049dcc9..HEAD',
        'cat .claude/../README.md'
      ]) {
        assert.equal(runHook(command).status, 0, command);
      }

      // The fix must not deny ordinary redirecting work inside the project.
      for (const command of ['cat README.md > out.txt', 'echo hi > out.txt']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
    }
  },
  {
    // A POSIX cluster and its split form are the SAME command. Any verdict that
    // differs between them is a bug in the decomposer, not a security property:
    // grep's own switches (-o/-E/-F/-s) live in the per-command role table while
    // the cluster check consulted only the generic no-arg table, so `grep -no`
    // denied while `grep -n -o` allowed.
    name: 'clustered short options agree with their split form, in both directions',
    fn() {
      const equivalent = [
        ['grep -no needle README.md', 'grep -n -o needle README.md'],
        ['grep -iE needle README.md', 'grep -i -E needle README.md'],
        ['grep -rF needle .claude', 'grep -r -F needle .claude'],
        ['grep -ns needle README.md', 'grep -n -s needle README.md']
      ];
      for (const [clustered, split] of equivalent) {
        assert.equal(
          evaluate(clustered).status,
          evaluate(split).status,
          `${clustered} must resolve identically to ${split}`
        );
        assert.equal(evaluate(clustered).status, 'ALLOW', clustered);
      }

      // Widening the cluster must not widen access: the boundary still applies.
      for (const command of ['grep -no needle /etc/passwd', 'grep -iE needle ../../outside.txt']) {
        const result = evaluate(command);
        assert.equal(result.status, 'BLOCK', command);
        assert.ok(
          result.diagnostics.some(d => d.code === 'OUTSIDE_PROJECT'),
          `${command} must deny as OUTSIDE_PROJECT`
        );
      }
    }
  },
  {
    name: 'entrypoint denies relative traversal and container scope without executing payloads',
    fn() {
      assert.equal(runHook('rm ../../outside.txt').status, 2);
      assert.equal(runHook('cat docs/project-reference/docs-index-reference.md').status, 0);

      // Container scope stays unknowable to the policy, but the hook spends a denial on it only
      // where a HOST file is reachable: a mutating payload, or the bind mount that is the ONLY way
      // anything inside a container touches the host filesystem at all. `docker logs` reaches
      // neither, which is why it must run.
      assert.equal(evaluate('docker exec c cat /etc/passwd').status, 'UNKNOWN');
      assert.equal(runHook('docker exec c rm -rf /data').status, 2, 'a mutating container payload still denies');
      assert.equal(runHook('kubectl cp pod:/a /etc/b').status, 2, 'a container copy onto a host path still denies');
      assert.equal(runHook('docker run -v D:/outside:/data alpine').status, 2, 'an outside bind mount still denies');
      assert.equal(runHook('docker exec c cat /etc/passwd').status, 0, 'a read inside a container is not a host write');
      assert.equal(runHook('docker logs -f --tail 100 api').status, 0, 'container diagnostics must run');

      // The operand-role grammar below is the POLICY's contract; the hook's write-only gate sits in
      // front of it and lets every one of these readers through. Both halves are asserted: the
      // policy still resolves the operand outside the root, and the hook still runs the command.
      for (const command of ['cat -n ../../outside.txt', 'cat -v ../../outside.txt', 'grep -n needle ../../outside.txt', 'grep -e needle ../../outside.txt', 'grep --regexp=needle ../../outside.txt', 'grep -f ../../outside.txt README.md', 'grep -o needle ../../outside.txt', 'awk -F: x ../../outside.txt', 'grep -F needle ../../outside.txt']) {
        assert.equal(evaluate(command).status, 'BLOCK', command);
        assert.equal(runHook(command).status, 0, `read-only command must not be denied: ${command}`);
      }
      for (const command of ['cat -n README.md', 'cat -v README.md', 'grep -e ../../outside.txt README.md', 'grep --regexp=../../outside.txt README.md', 'head -n 2 README.md', 'grep -o needle README.md', 'awk -F: x README.md', 'grep -F needle README.md']) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
      // The mutating twins of the same operand shapes still reach exit 2 end-to-end.
      for (const command of ['rm -f ../../outside.txt', 'cp README.md ../../outside.txt', 'mv ../../outside.txt README.md', 'truncate -s 0 ../../outside.txt']) {
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['grep --unknown-arity needle ../../outside.txt', 'awk --unknown-arity x ../../outside.txt', 'find . -exec cat ../../outside.txt \\;', 'grep needle "$FILE"', 'grep -e "$PATTERN" "$FILE"', 'awk x "$FILE"']) {
        assert.equal(evaluate(command).status, 'UNKNOWN', command);
        assert.equal(runHook(command).status, 0, `unresolvable scope around a read must not be denied: ${command}`);
      }
      // Unresolvable scope is still fail-closed for a writer — that is where guessing costs data.
      for (const command of ['rm "$FILE"', 'cp README.md "$FILE"', 'mv --unknown-arity x ../../outside.txt']) {
        assert.equal(runHook(command).status, 2, command);
      }
      for (const command of ['grep "$PATTERN" README.md', 'grep -e "$PATTERN" README.md', 'awk "$PROGRAM" README.md', 'grep -c "<!-- /SYNC:" README.md 2>/dev/null', "grep -c '<!-- /SYNC:' README.md"]) {
        assert.equal(evaluate(command).status, 'ALLOW', command);
        assert.equal(runHook(command).status, 0, command);
      }
    }
  },
  {
    name: 'file-capable interpreter bodies and Git diff file options remain boundary-protected',
    fn() {
      assert.equal(evaluate("python -c \"open('/etc/passwd').read()\"").status, 'UNKNOWN');
      assert.equal(evaluate("node -e \"require('fs').readFileSync('/etc/passwd')\"").status, 'UNKNOWN');
      assert.equal(evaluate("node -e \"console.log('/v2/users')\"").status, 'ALLOW');
      assert.equal(evaluate("bash -c 'cat /etc/passwd'").status, 'BLOCK');
      assert.equal(evaluate('bash -c "$SCRIPT"').status, 'UNKNOWN');
      assert.equal(evaluate('git diff --no-index D:/outside/one.txt README.md').status, 'BLOCK');
      assert.equal(evaluate('git diff --output D:/outside/patch.diff README.md').status, 'BLOCK');
      assert.equal(evaluate('git diff -- README.md').status, 'ALLOW');
    }
  },
  {
    name: 'read paths that do not exist are unknown, while new structured writes stay compatible',
    fn() {
      const missingAwareResolver = {
        resolve(value, base, metadata) {
          if (metadata?.requiresExisting) throw new Error('missing path');
          return path.resolve(base, value);
        }
      };
      assert.equal(evaluate('cat .review-link/secret.txt', { resolver: missingAwareResolver }).status, 'UNKNOWN');
      const write = evaluate(undefined, { toolName: 'Write', toolInput: { file_path: 'new-file.txt' } });
      assert.equal(write.status, 'ALLOW');
    }
  },
  {
    name: 'same-command link mutation cannot race a later relative read',
    fn() {
      const result = evaluate('rm -f .review-link && ln -s ../../outside .review-link && cat .review-link/secret.txt');
      assert.equal(result.status, 'UNKNOWN');
      assert.ok(result.diagnostics.some(item => item.code === 'LINK_MUTATION_UNSUPPORTED'));
    }
  },
  {
    name: 'structured path input is bounded and fails closed',
    fn() {
      const tooLong = evaluate(undefined, { toolName: 'Read', toolInput: { file_path: 'x'.repeat(4097) } });
      assert.equal(tooLong.status, 'UNKNOWN');
      const tooMany = evaluate(undefined, { toolName: 'mcp__filesystem__read_multiple_files', toolInput: { paths: Array.from({ length: 257 }, () => 'inside.txt') } });
      assert.equal(tooMany.status, 'UNKNOWN');
    }
  },
  {
    name: 'entrypoint honors synthetic config root instead of the caller checkout',
    fn() {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-policy-root-'));
      try {
        fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
        fs.writeFileSync(path.join(root, '.claude', '.ck.json'), JSON.stringify({ pathBoundary: true }));
        // Isolate root selection from intentional global temp allowlisting;
        // CI checkouts themselves may live under /tmp. The real hook callback,
        // transport, config resolver and path resolver still run unchanged.
        const boot = `require(${JSON.stringify(path.resolve(__dirname, '../../lib/ck-path-utils.cjs'))}).buildBoundaryAllowlist = () => []; require(${JSON.stringify(path.resolve(__dirname, '../../lib/hook-runner.cjs'))}).runPreToolHookSync('path-boundary-block', require(${JSON.stringify(HOOK)}).evaluate, { inputErrorCode: 2, errorExitCode: 2 });`;
        const invoke = filePath => spawnSync(process.execPath, ['-e', boot], {
          cwd: ROOT,
          env: { ...process.env, CLAUDE_PROJECT_DIR: root },
          input: JSON.stringify({ tool_name: 'Write', cwd: ROOT, tool_input: { file_path: filePath } }),
          encoding: 'utf8',
          timeout: 10000
        });
        const inside = invoke(path.join(root, 'inside.txt'));
        assert.equal(inside.status, 0, inside.stderr);
        assert.equal(inside.stdout, '');
        // The checkout operand is outside the explicit fixture root, with no
        // allowlist escape. Substituting caller cwd would allow it.
        const outside = invoke(path.join(ROOT, 'README.md'));
        assert.equal(outside.status, 2, outside.stderr);
        assert.match(outside.stderr, /Path outside project boundary/);
        assert.equal(outside.stdout, '');
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'invalid explicit project metadata is visible and denied closed',
    fn() {
      const result = spawnSync(process.execPath, [HOOK], {
        cwd: ROOT,
        env: { ...process.env, CLAUDE_PROJECT_DIR: 'relative-project-root' },
        input: JSON.stringify({ tool_name: 'Bash', cwd: ROOT, tool_input: { command: 'echo hi' } }),
        encoding: 'utf8',
        timeout: 10000
      });
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /Unable to resolve project root/);
    }
  },
  {
    // `dd` takes no dashed options — every operand is a bare `key=value` — so it
    // matched no rule in either layer and `dd if=/etc/passwd of=/tmp/stolen.img`
    // was ALLOWED. The token starts with `i`, so the absolute-path and traversal
    // fallbacks miss it as well. Asserted end-to-end through the hook, because
    // the whole point is that BOTH layers were blind to it.
    name: 'dd key=value operands are modeled, in both directions',
    fn() {
      for (const command of [
        'dd if=/etc/passwd of=/tmp/stolen.img',
        'dd if=/etc/passwd',
        'dd of=/etc/cron.d/evil',
        'dd if=../../outside.txt of=out.img',
        'dd if=/etc/passwd of=out.img bs=512 count=1'
      ]) {
        assert.equal(runHook(command).status, 2, `expected BLOCK: ${command}`);
      }
      // In-project operands still resolve and allow — the fix must not turn dd
      // into a blanket denial.
      for (const command of ['dd if=README.md of=copy.img', 'dd if=README.md of=copy.img bs=4M conv=notrunc', 'dd']) {
        assert.equal(runHook(command).status, 0, `expected ALLOW: ${command}`);
      }
      // An operand shape the model does not recognize denies rather than being
      // skipped, so a dd key added later cannot smuggle a path through.
      assert.equal(runHook('dd wat=/etc/passwd').status, 2, 'unrecognized dd key must deny');
      assert.equal(runHook('dd /etc/passwd').status, 2, 'bare dd operand must deny');
    }
  },
  {
    // Twelve reachable diagnostic codes rendered the same terminal sentence,
    // so the operator could not tell which layer denied or why. This asserts
    // the PROSE, not the map: any code that still falls through to the generic
    // fallback fails here. The list is literal on purpose — deriving it from
    // DIAGNOSTIC_REASONS would only ask the implementation what it contains.
    name: 'every reachable diagnostic code explains itself specifically',
    fn() {
      const { explainDiagnostic } = require('../../path-boundary-block.cjs');
      const GENERIC = 'the boundary policy denied this input';
      const REACHABLE = [
        'OUTSIDE_PROJECT', 'PATH_UNRESOLVABLE', 'STATEMENT_UNKNOWN', 'DYNAMIC_PATH_OPERAND',
        'DYNAMIC_PATH_OPTION', 'REDIRECT_UNKNOWN', 'REDIRECT_TARGET_UNKNOWN', 'HEREDOC_UNSUPPORTED',
        'CWD_TRANSITION_UNKNOWN', 'UNSUPPORTED_OPTION_ARITY', 'POLICY_EXCEPTION', 'INVALID_CONTEXT',
        'INPUT_LIMIT', 'INVALID_INPUT', 'MISSING_REDIRECT_TARGET', 'MISSING_STATEMENT',
        'SHELL_INSPECTION_FAILED', 'STRUCTURED_PATH_INVALID', 'STRUCTURED_PATH_LIMIT',
        'STRUCTURED_PATH_TOO_LONG', 'TRAILING_ESCAPE', 'UNEXPECTED_SEPARATOR',
        'UNTERMINATED_HEREDOC', 'UNTERMINATED_QUOTE', 'UNSUPPORTED_DD_OPERAND',
        'CONTAINER_SCOPE_UNKNOWN', 'INLINE_INTERPRETER_SCOPE_UNKNOWN', 'SHELL_SCOPE_UNKNOWN',
        'WRAPPER_SCOPE_UNKNOWN', 'UNSUPPORTED_COMMAND', 'LINK_MUTATION_UNSUPPORTED'
      ];
      for (const code of REACHABLE) {
        const prose = explainDiagnostic(code);
        assert.notEqual(prose, GENERIC, `${code} degrades to the generic sentence`);
        assert.ok(prose && prose.length > 20, `${code} has no usable explanation`);
      }
      // The fallback itself must survive for a code nobody has met yet — the map
      // is a precision layer, never the correctness layer.
      assert.equal(explainDiagnostic('A_CODE_INVENTED_BY_A_FUTURE_CHANGE'), GENERIC);
    }
  },
  {
    // A Write/Edit denial has no shell command at all, yet it printed
    // `Command: (no command in this tool input)` above a remedy telling the
    // reader to "split a compound statement, drop the pipe or redirection".
    // Advice with no referent reads as a malfunction.
    name: 'a commandless tool denial does not offer a shell rewrite',
    fn() {
      // An OUTSIDE path takes the 'outside' branch and names the path, which was
      // never the defect. The undetermined branch — the one that used to print a
      // shell remedy — is reached when a structured path field cannot be read at
      // all, so that is what must be exercised here.
      // Every tool here must be one the write-only gate lets through to the policy — a read tool is
      // allowed before its path field is ever examined, so it could never reach this branch.
      for (const [tool, toolInput] of [
        ['Write', { file_path: 12345, content: 'x' }],
        ['Edit', { file_path: 12345 }],
        ['mcp__filesystem__edit_multiple_files', { paths: [12345] }]
      ]) {
        const result = runHook(undefined, toolInput, { tool_name: tool });
        assert.equal(result.status, 2, result.stderr);
        assert.match(result.stderr, /Tool input paths could not be determined/);
        assert.doesNotMatch(result.stderr, /no command in this tool input/);
        assert.doesNotMatch(result.stderr, /drop the pipe or redirection/);
      }

      // A real Bash denial must KEEP the shell remedy — the branch has to
      // discriminate, not simply delete the advice for everyone.
      const shell = runHook('rm -rf "$TARGET"');
      assert.equal(shell.status, 2, shell.stderr);
      assert.match(shell.stderr, /drop the pipe or redirection/);
    }
  }
];

module.exports = { name: 'path-boundary-policy', tests };
