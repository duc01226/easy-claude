import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

// Locks the content-loss guard in generate-claude-md.cjs `updateMarkedSections`. `--mode update`
// REPLACES each managed section's body with builder output; this session it silently dropped two
// hand-curated callouts (the Windows-Python note + a Design-routing note) with NO verifier catching
// it — the only drift in the class that was invisible. The guard converts that silent drop into a
// visible WARN. These tests fail if the guard is removed or its low-noise heuristic regresses.

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const generatorPath = path.join(repoRoot, ".claude", "skills", "claude-md-init", "scripts", "generate-claude-md.cjs");
const buildersPath = path.join(path.dirname(generatorPath), "section-builders.cjs");

// Importing the generator must NOT regenerate CLAUDE.md (require.main guard). If the guard were
// missing, requiring it here would run main() against the test runner's argv and mutate the repo.
const gen = require(generatorPath);

const section = (key, ...bodyLines) =>
  [`<!-- SECTION:${key} -->`, "", ...bodyLines, "", `<!-- /SECTION:${key} -->`].join("\n");

const callout = "**Platform (Windows):** invoke Python via `py -3` — NEVER `python3`.";

test("TC-CLG-001 module exports updateMarkedSections without running main() on import", () => {
  assert.equal(typeof gen.updateMarkedSections, "function");
  assert.ok(gen.CURATED_CALLOUT instanceof RegExp);
});

test("TC-CLG-002 WARNs when a curated callout in the old body is not reproduced by the builder", () => {
  const existing = section("dev-commands", "```bash", "node test # all", "```", "", callout);
  const warns = [];
  gen.updateMarkedSections(existing, { "dev-commands": "```bash\nnode test # all\n```" }, m => warns.push(m));
  assert.equal(warns.length, 1, "dropping a curated callout must WARN");
  assert.match(warns[0], /SECTION:dev-commands/);
  assert.match(warns[0], /Platform \(Windows\)/);
  assert.match(warns[0], /project-config\.json/, "WARN must point at the durable (config-sourced) home");
});

test("TC-CLG-003 stays silent when the builder reproduces the callout (e.g. via commandsNote)", () => {
  const existing = section("dev-commands", "```bash", "node test # all", "```", "", callout);
  const newBody = "```bash\nnode test # all\n```\n\n" + callout;
  const warns = [];
  gen.updateMarkedSections(existing, { "dev-commands": newBody }, m => warns.push(m));
  assert.equal(warns.length, 0, "no warning when the callout survives in the new content");
});

test("TC-CLG-004 low-noise: dropping a plain (non-callout) line does NOT warn", () => {
  const existing = section("doc-lookup", "| a | b |", "| plain row | no bold |");
  const warns = [];
  gen.updateMarkedSections(existing, { "doc-lookup": "| a | b |" }, m => warns.push(m));
  assert.equal(warns.length, 0, "plain table/command lines are not curated callouts and must not warn");
});

test("TC-CLG-006 escape-insensitive: prettier-escaped old line vs unescaped builder output does NOT warn", () => {
  // The committed CLAUDE.md is prettier-managed, so it escapes markdown punctuation
  // (`_SharedCommon` -> `\_SharedCommon`). The data-driven builders emit the raw form. The guard
  // must treat these as the same content, else regenerating a prettier-formatted file falsely
  // reports the Apps/Services callout as dropped on every run.
  const escaped = "> **Apps/Services:** Alpha, \\_SharedLib, Sample.Platform, demo\\_domain.";
  const unescaped = "> **Apps/Services:** Alpha, _SharedLib, Sample.Platform, demo_domain.";
  const existing = section("tldr", escaped);
  const warns = [];
  gen.updateMarkedSections(existing, { tldr: unescaped }, m => warns.push(m));
  assert.equal(warns.length, 0, "escaping-only differences must not be reported as content loss");
});

test("TC-CLG-005 unmanaged sections (no builder content) never warn", () => {
  // A section the update isn't rebuilding (not in the sections map) keeps its body verbatim — no drop.
  const existing = section("static-prose", callout);
  const warns = [];
  assert.equal(gen.updateMarkedSections(existing, {}, m => warns.push(m)), existing);
  assert.equal(warns.length, 0, "sections without builder output are preserved, not dropped");
});

test("TC-CLG-007 init mode bakes former hook guidance into CLAUDE.md static carrier", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-md-init-hookless-"));

  try {
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify(
        {
          project: { name: "Hookless Test", description: "Temporary hookless init fixture." },
          framework: { languages: ["typescript"] },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              whenToUse: "user wants to verify changes",
              sequence: ["test"],
              preActions: { injectContext: "Use the selected workflow context." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [generatorPath, "--mode", "init"], {
      cwd: tempRoot, env: { ...process.env, CLAUDE_PROJECT_DIR: tempRoot },
    });

    const claudeMd = await fs.readFile(path.join(tempRoot, "CLAUDE.md"), "utf8");
    for (const expected of [
      "<!-- CK:UNIVERSAL-GUIDES v6 -->",
      "<!-- CK:WORKFLOW-GATE -->",
      ".claude/workflows.json",
      "<!-- CK:CRITICAL-THINKING -->",
      "<!-- CK:AI-MISTAKE-PREVENTION -->",
      "## Continuous Improvement — Lesson Extraction Gate",
      "docs/project-reference/lessons.md",
    ]) {
      assert.ok(claudeMd.includes(expected), `CLAUDE.md init output must include ${expected}`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("TC-CLG-007 isolation ignores an inherited synthetic project selector", async t => {
  const ambient = await fs.mkdtemp(path.join(os.tmpdir(), "root-test-ambient-"));
  t.after(() => fs.rm(ambient, { recursive: true, force: true }));
  await fs.mkdir(path.join(ambient, "docs"));
  await fs.writeFile(path.join(ambient, "docs/project-config.json"), "{}");
  const sentinels = { "CLAUDE.md": "# Synthetic ambient root\r\nKEEP λ\r\n", ".claude-md.backup": "synthetic existing backup" };
  for (const [name, value] of Object.entries(sentinels)) await fs.writeFile(path.join(ambient, name), value);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: ambient };
  delete env.NODE_TEST_CONTEXT;
  // Select the actual older entry-point test, not this regression (no recursion).
  // Even a regression can only target this owned synthetic ambient project.
  let result, failure;
  try {
    result = await execFileAsync(process.execPath, ["--test", "--test-name-pattern=^TC-CLG-007 init mode", fileURLToPath(import.meta.url)],
      { cwd: ambient, env, timeout: 15000 });
  } catch (error) { failure = error; }
  for (const [name, value] of Object.entries(sentinels)) assert.equal(await fs.readFile(path.join(ambient, name), "utf8"), value, `${name}: ambient bytes unchanged`);
  if (failure) throw failure;
  assert.match(result.stdout, /# pass 1\b/);
  assert.match(result.stdout, /# fail 0\b/);
});

function assertSectionOwnership(generator) {
  // Inherited strings expose a missing own-property check even when types are guarded.
  for (const key of ["custom", "constructor", "toString", "__proto__"]) {
    const input = section(key, callout, "retain λ  ");
    for (const sections of [{}, Object.create({ [key]: "inherited replacement" })]) {
      const warnings = [];
      assert.equal(generator.updateMarkedSections(input, sections, m => warnings.push(m)), input);
      assert.deepEqual(warnings, []);
    }
    for (const value of ["", null, false, 42, {}, { length: 1 }, () => "not a builder string"]) {
      const sections = Object.defineProperty({}, key, { value, enumerable: true });
      let actual;
      assert.doesNotThrow(() => { actual = generator.updateMarkedSections(input, sections); });
      assert.equal(actual, input, `${key}: non-builder preserved`);
    }
    const sections = Object.defineProperty({}, key, { value: "own replacement", enumerable: true });
    assert.equal(generator.updateMarkedSections(section(key, "original"), sections), section(key, "own replacement"));
  }
}

function assertConfiguredConventions(buildDecisionQuickRef) {
  const heading = "**Decision Quick-Ref:**\n\n| Task | Pattern |\n|---|---|\n";
  let cases = 0;
  // Framework identity never supplies an architecture; configured paths do.
  for (const name of [undefined, "SampleFramework", "OtherBackend"]) {
    const config = { modules: [{ name: "hooks" }], framework: name ? { name } : {} };
    assert.equal(buildDecisionQuickRef(config), null);
    cases++;
    for (const doc of ["docs/backend-a.md", "docs/custom conventions.md"]) {
      const actual = buildDecisionQuickRef({ ...config, framework: { ...config.framework, backendPatternsDoc: doc } });
      assert.equal(actual, heading + `| Backend conventions | Read \`${doc}\` |`);
      cases++;
    }
  }
  for (const config of [{}, { modules: [], framework: { backendPatternsDoc: "docs/unused.md" } }]) {
    assert.equal(buildDecisionQuickRef(config), null);
    cases++;
  }
  for (const [extra, row] of [
    [{ databases: { primary: "store" } }, "| Data access | Service-specific repository |"],
    [{ messaging: { broker: "queue" } }, "| Cross-service sync | Entity Event Consumer (queue) |"],
    [{ modules: [{ name: "hooks", meta: { repository: "NamedRepo" } }] }, "| hooks repository | `NamedRepo` |"],
  ]) {
    assert.equal(buildDecisionQuickRef({ modules: [{ name: "hooks" }], framework: { name: "FrameworkOnly" }, ...extra }), heading + row);
    cases++;
  }
  return cases;
}

test("TC-HARNESS-008/015 project conventions require configured evidence, not framework identity", () => {
  assert.equal(assertConfiguredConventions(require(buildersPath).buildDecisionQuickRef), 14);
});

test("TC-HARNESS-008/015 convention-row mutants fail the same independent mapping oracle", async () => {
  const source = (await fs.readFile(buildersPath, "utf8")).replace(/\r\n/g, "\n");
  const Module = require("node:module");
  assert.equal(assertConfiguredConventions(require(buildersPath).buildDecisionQuickRef), 14);
  const guard = "// Framework identity alone does not establish an application architecture.\n    if (config.framework?.backendPatternsDoc)";
  for (const [before, after] of [
    [guard, guard.replace("config.framework?.backendPatternsDoc", "config.framework?.name")],
    ["| Backend conventions | Read", "| New API endpoint | Controller + CQRS Command"],
  ]) {
    assert.equal(source.split(before).length, 2, "unique convention mutation target");
    const mutant = new Module(buildersPath);
    mutant.filename = buildersPath;
    mutant.paths = Module._nodeModulePaths(path.dirname(buildersPath));
    mutant._compile(source.replace(before, after), buildersPath);
    assert.equal(typeof mutant.exports.buildDecisionQuickRef, "function", "syntax-valid exported mutant");
    assert.throws(() => assertConfiguredConventions(mutant.exports.buildDecisionQuickRef), { code: "ERR_ASSERTION" });
  }
});

test("TC-HARNESS-015 only own nonempty string builders can replace section bodies", () => {
  assertSectionOwnership(gen);
});

test("TC-HARNESS-015 ownership and type-check mutants fail the same preservation oracle", async () => {
  assertSectionOwnership(gen);
  const source = await fs.readFile(generatorPath, "utf8");
  const Module = require("node:module");
  const mutations = [
    ["Object.prototype.hasOwnProperty.call(sections, key)", "true"],
    ["typeof sections[key] === 'string'", "true"],
  ];
  for (const [before, after] of mutations) {
    assert.equal(source.split(before).length, 2, "exactly one guard target");
    const mutant = new Module(generatorPath);
    mutant.filename = generatorPath;
    mutant.paths = Module._nodeModulePaths(path.dirname(generatorPath));
    mutant._compile(source.replace(before, after), generatorPath);
    assert.equal(typeof mutant.exports.updateMarkedSections, "function", "syntax-valid exported mutant");
    assert.throws(() => assertSectionOwnership(mutant.exports), { code: "ERR_ASSERTION" });
  }
});

const ROOT_SENTINELS = [
  /Never commit, push, or stage.*unless the user explicitly asks/i,
  /Never `git commit --amend`/,
  /Branch before committing on the default branch/,
  /Preserve unrelated\/user work/,
  /Never hand-edit.*\.agents\/.*\.codex\/.*AGENTS\.md/,
  /Never auto-run.*sync-codex/,
  /required quality gates.*cannot be waived/i,
  /before investigating, planning, or coding/,
  /docs\/project-reference\/lessons\.md/,
  /all-return barrier/,
  /workflow-review-changes.*INLINE/,
  /Graph Intelligence/,
];

function assertRootContract(text) {
  for (const sentinel of ROOT_SENTINELS) assert.match(text, sentinel);
  assert.equal((text.match(/\[WORKFLOW-GATE\]/g) || []).length, 1);
  assert.equal((text.match(/<!-- CK:CRITICAL-THINKING -->/g) || []).length, 1);
  assert.equal((text.match(/<!-- CK:AI-MISTAKE-PREVENTION -->/g) || []).length, 1);
  assert.doesNotMatch(text, /ask.*whether to activate|MANDATORY FIRST ACTION|invoke.*Skill tool/i);
  assert.ok(Buffer.byteLength(text) <= 32768, "operational root fits 32 KiB without truncating");
}

async function fixture(t, config = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "compact-root-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "docs"));
  await fs.writeFile(path.join(root, "docs/project-config.json"), JSON.stringify(config));
  return {
    root,
    run: (args, executable = generatorPath) => execFileAsync(process.execPath, [executable, ...args], {
      cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    }),
    read: () => fs.readFile(path.join(root, "CLAUDE.md"), "utf8"),
  };
}

test("TC-HARNESS-008 root preserves inline authority and quality with one automatic router", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  assertRootContract(await f.read());
  const { extractSyncBody } = require(path.join(repoRoot, ".claude/scripts/lib/extract-sync-block.cjs"));
  const canonical = await fs.readFile(path.join(repoRoot, ".claude/skills/shared/sync-inline-versions.md"), "utf8");
  for (const tag of ["critical-thinking-mindset:full", "ai-mistake-prevention:full"]) {
    const expected = extractSyncBody(canonical, tag).split("\n")
      .filter(line => !line.includes("[MANDATORY FIRST ACTION]")).join("\n");
    assert.ok((await f.read()).includes(expected), `${tag}: every non-routing invariant remains inline`);
  }
  t.diagnostic(`minimal generated root: ${Buffer.byteLength(await f.read())} bytes`);
});

test("TC-HARNESS-015 unmanaged custom domain survives update (24 bounded cases)", () => {
  // Domain: 2 line endings × 3 custom payloads × 4 marker keys. No universal claim.
  for (const eol of ["\n", "\r\n"]) for (const body of ["plain custom rule", callout, "λ \"quote\" | table |"])
    for (const key of ["custom", "unknown-rule", "tldr", "dev-commands"]) {
      const input = ["# Custom", section(key, body), "tail preserved"].join("\n").replaceAll("\n", eol);
      assert.equal(gen.updateMarkedSections(input, {}), input);
    }
});

test("TC-HARNESS-015 project map retains every configured context path and note", async t => {
  const f = await fixture(t, {
    project: { name: "Synthetic", languages: ["javascript"] },
    contextGroups: [{ name: "surface", pathRegexes: ["alpha/.*", "beta/.*"], guideDoc: "docs/custom-guide.md" }],
    testing: { commands: { verify: "node synthetic-test.cjs" }, commandsNote: "Platform-specific invocation stays here." },
  });
  await f.run(["--mode", "init"]);
  const text = await f.read();
  for (const value of ["alpha/.*", "beta/.*", "docs/custom-guide.md", "node synthetic-test.cjs", "Platform-specific invocation stays here."])
    assert.ok(text.includes(value), value);
});

test("TC-CLG-008 init and update materialize config-sourced E2E guidance", async t => {
  const config = {
    project: { name: "E2E generation fixture", description: "Synthetic E2E config." },
    e2eTesting: {
      framework: "playwright",
      guideDoc: "docs/project-reference/e2e-test-reference.md",
    },
  };

  const fresh = await fixture(t, config);
  await fresh.run(["--mode", "init"]);
  const initialized = await fresh.read();
  assert.match(initialized, /SECTION:e2e-testing/);
  assert.match(initialized, /e2e-test-reference\.md/);

  const existing = await fixture(t, config);
  const custom = "# Existing root\n\n" + section("tldr", "keep this root") + "\n\n## Custom rule\nretain me\n";
  await fs.writeFile(path.join(existing.root, "CLAUDE.md"), custom, "utf8");
  await existing.run(["--mode", "update"]);
  const updated = await existing.read();
  assert.match(updated, /SECTION:e2e-testing/);
  assert.match(updated, /e2e-test-reference\.md/);
  assert.match(updated, /retain me/);
  assert.equal((updated.match(/<!-- SECTION:e2e-testing -->/g) || []).length, 1);
});

test("TC-HARNESS-008 secret-shaped infrastructure credentials never enter generated root", async t => {
  const sentinel = "password=synthetic-never-rendered-7f4d";
  const f = await fixture(t, {
    project: { name: "Credential fixture" },
    modules: [{ name: "database", kind: "infrastructure", meta: { port: 5432, credentials: sentinel } }],
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Existing root\n\n<!-- SECTION:infra-ports -->\nold\n<!-- /SECTION:infra-ports -->\n");
  await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.doesNotMatch(text, new RegExp(sentinel));
  assert.match(text, /REDACTED.*secret-manager reference/);
});

test("TC-HARNESS-008 credential references survive without raw table injection", async t => {
  const f = await fixture(t, {
    project: { name: "Reference fixture" },
    modules: [{ name: "database", kind: "infrastructure", meta: { port: 5432, credentials: "vault://team/database" } }],
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Existing root\n\n<!-- SECTION:infra-ports -->\nold\n<!-- /SECTION:infra-ports -->\n");
  await f.run(["--mode", "update"]);
  assert.match(await f.read(), /vault:\/\/team\/database/);
});

test("TC-HARNESS-008 R2-11 structured credentials cannot leak into generated root", async t => {
  // Invariant: serialization is not a credential safety check. Unknown fields
  // and quoted/escaped JSON keys must not smuggle synthetic secret material.
  const payloads = [
    { password: "synthetic-object-7f4d" },
    { nested: [{ token: "synthetic-nested-7f4d" }] },
    { arbitrary: "synthetic-unknown-7f4d" },
    ["synthetic-array-7f4d"],
    '{"password":"synthetic-json-7f4d"}',
    '{"pass\\u0077ord":"synthetic-escaped-7f4d"}',
    '"password": "synthetic-fragment-7f4d"',
    { reference: "vault://team/database", value: "synthetic-extra-7f4d" },
    { reference: "synthetic-fake-reference-7f4d" },
  ];
  const f = await fixture(t, {
    project: { name: "Synthetic structured credentials" },
    modules: payloads.map((credentials, i) => ({ name: `service-${i}`, kind: "infrastructure", meta: { port: 5432, credentials } })),
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), section("infra-ports", "old"));
  await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.doesNotMatch(text, /synthetic-[a-z-]+-7f4d/);
  assert.equal((text.match(/REDACTED/g) || []).length, payloads.length);
});

test("TC-HARNESS-008 R2-11 safe references and harmless prose remain readable", async t => {
  const values = ["vault://team/database", "Ask the operator for access", { reference: "op://team/database/password" },
    '{"reference":"vault://team/database"}', "See the runbook | access section"];
  const f = await fixture(t, {
    project: { name: "Synthetic safe credentials" },
    modules: values.map((credentials, i) => ({ name: `safe-${i}`, kind: "infrastructure", meta: { port: 5432, credentials } })),
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), section("infra-ports", "old"));
  await f.run(["--mode", "update"]);
  const text = await f.read();
  for (const expected of ["vault://team/database", "op://team/database/password", "Ask the operator for access", "See the runbook \\| access section"])
    assert.ok(text.includes(expected), expected);
  assert.doesNotMatch(text, /REDACTED/);
});

test("TC-HARNESS-008 missing detail contract directs repair without inventing content", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const text = await f.read();
  assert.match(text, /missing or stale.*\/project-init/);
  assert.match(text, /required detail.*unavailable.*stop.*report/i);
  assert.match(text, /docs\/project-reference\/docs-index-reference\.md/);
});

test("TC-HARNESS-015 oversized custom prose survives CLI update with explicit overflow", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = "\n## My custom operating rule\n" + "λ: preserve this plain custom text.\n".repeat(1400);
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  const result = await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.ok(text.includes(custom.trimEnd()), "custom prose must survive byte-for-byte");
  assert.match(result.stdout + result.stderr, /ROOT_OVERFLOW.*bytes.*32768/);
  assert.ok(Buffer.byteLength(text) > 32768, "overflow must not silently truncate");
});

test("TC-HARNESS-015 malformed section boundaries refuse instead of losing custom text", () => {
  for (const input of ["<!-- SECTION:custom -->\nretain", "<!-- /SECTION:custom -->",
    "<!-- SECTION:a -->\n<!-- /SECTION:b -->", "<!-- SECTION:a -->\n<!-- SECTION:b -->"])
    assert.throws(() => gen.updateMarkedSections(input, { a: "replacement" }), /SECTION/);
});

test("TC-HARNESS-015 R3-01 owned backup captures pre-update bytes; legacy destination untouched (8 cases)", async t => {
  for (const mode of ["init", "update"]) for (const form of ["separated", "equals"]) for (const oldExists of [false, true]) {
    const f = await fixture(t);
    const original = Buffer.from("# Synthetic root\r\n" + section("custom", "λ: retain") + "\r\n");
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    const legacy = path.join(f.root, ".claude-md.backup");
    if (oldExists) await fs.writeFile(legacy, "old synthetic backup");
    const owned = path.join(f.root, "owned backup = λ.md");
    const option = form === "equals" ? [`--backup-path=${owned}`] : ["--backup-path", owned];
    await f.run([...option, "--mode", mode]);
    assert.deepEqual(await fs.readFile(owned), original, "owned backup must exist and equal pre-write bytes");
    if (oldExists) assert.equal(await fs.readFile(legacy, "utf8"), "old synthetic backup");
    else await assert.rejects(fs.stat(legacy), { code: "ENOENT" });
    assert.notDeepEqual(await fs.readFile(path.join(f.root, "CLAUDE.md")), original, "control proves root really updated");
  }
});

test("TC-HARNESS-015 R3-01 invalid/colliding destinations refuse before root/backup writes", async t => {
  // Bounded domain: 11 invalid forms × init/update = 22 cases, plus valid controls above.
  for (const mode of ["init", "update"]) for (const kind of ["missing", "empty", "relative", "directory", "occupied",
    "duplicate", "default", "root", "missing-parent", "option-value", "whitespace"]) {
    const f = await fixture(t);
    const original = "# Synthetic existing\n" + section("custom", "retain me");
    const legacy = path.join(f.root, ".claude-md.backup");
    const owned = path.join(f.root, "owned.md");
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    await fs.writeFile(legacy, "old backup");
    await fs.writeFile(owned, "occupied owned backup");
    const options = {
      missing: ["--backup-path"], empty: ["--backup-path="], relative: ["--backup-path=relative.md"],
      directory: [`--backup-path=${f.root}`], occupied: [`--backup-path=${owned}`],
      duplicate: [`--backup-path=${owned}`, `--backup-path=${owned}`], default: [`--backup-path=${legacy}`],
      root: [`--backup-path=${path.join(f.root, "CLAUDE.md")}`],
      "missing-parent": [`--backup-path=${path.join(f.root, "absent", "backup")}`],
      "option-value": ["--backup-path", "--detect"], whitespace: ["--backup-path", "   "],
    };
    await assert.rejects(f.run(["--mode", mode, ...options[kind]]), e => e.code === 1, `${mode}/${kind}`);
    assert.equal(await f.read(), original, `${mode}/${kind}: root unchanged`);
    assert.equal(await fs.readFile(legacy, "utf8"), "old backup");
    assert.equal(await fs.readFile(owned, "utf8"), "occupied owned backup");
  }
});

test("TC-HARNESS-015 legacy backup invocation stays compatible", async t => {
  for (const mode of ["init", "update"]) {
    const f = await fixture(t);
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Original\n" + section("custom", "keep"));
    const original = await f.read();
    await fs.writeFile(path.join(f.root, ".claude-md.backup"), "old backup");
    await f.run(["--mode", mode]);
    assert.equal(await fs.readFile(path.join(f.root, ".claude-md.backup"), "utf8"), original);
  }
});

test("TC-HARNESS-008 current root COPY updates with one router and owned backup; no live writes", async t => {
  const f = await fixture(t, JSON.parse(await fs.readFile(path.join(repoRoot, "docs/project-config.json"), "utf8")));
  const liveBytes = await fs.readFile(path.join(repoRoot, "CLAUDE.md"));
  const custom = "\n\n\n## Synthetic user prose\r\nretain exact λ spacing  \r\n\r\n\r\ncustom tail\r\n";
  const original = Buffer.concat([liveBytes, Buffer.from(custom)]);
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
  const owned = path.join(f.root, "owned.md");
  const result = await f.run(["--mode", "update", "--backup-path", owned]);
  const updated = await f.read();
  assert.ok(updated.includes(custom), "genuine custom prose/whitespace preserved");
  assert.doesNotMatch(updated, /ask via `AskUserQuestion` whether to activate/);
  assert.equal((updated.match(/\[WORKFLOW-GATE\]/g) || []).length, 1);
  assert.equal((updated.match(/<!-- CK:AI-MISTAKE-PREVENTION -->/g) || []).length, 1);
  assert.deepEqual(await fs.readFile(owned), original);
  assert.deepEqual(await fs.readFile(path.join(repoRoot, "CLAUDE.md")), liveBytes, "live root untouched");
  const hash = input => createHash("sha256").update(input).digest("hex");
  const ckBlocks = Object.fromEntries([...updated.matchAll(/<!-- CK:([A-Z-]+) -->[\s\S]*?<!-- \/CK:\1 -->/g)]
    .map(m => [m[1], Buffer.byteLength(m[0])]));
  const sectionBytes = [...updated.matchAll(/<!-- SECTION:([^\s]+) -->[\s\S]*?<!-- \/SECTION:\1 -->/g)]
    .reduce((sum, m) => sum + Buffer.byteLength(m[0]), 0);
  t.diagnostic(JSON.stringify({ liveRootBytes: liveBytes.length, fixtureInputBytes: original.length,
    updatedBytes: Buffer.byteLength(updated), inputSha256: hash(original), updatedSha256: hash(updated),
    ckBlocks, sectionBytes, unmarkedBytes: Buffer.byteLength(updated) - sectionBytes - Object.values(ckBlocks).reduce((a, b) => a + b, 0),
    overflowReported: /ROOT_OVERFLOW/.test(result.stdout + result.stderr) }));
});

async function copiedGenerator(f, changes = {}) {
  const files = [
    ".claude/skills/claude-md-init/scripts/generate-claude-md.cjs",
    ".claude/skills/claude-md-init/scripts/section-builders.cjs",
    ".claude/skills/claude-md-init/references/claude-md-template.md",
    ".claude/skills/shared/workflow-first-gate.md",
    ".claude/skills/shared/sync-inline-versions.md",
    ".claude/scripts/lib/extract-sync-block.cjs",
  ];
  for (const file of files) {
    let text = await fs.readFile(path.join(repoRoot, file), "utf8");
    if (changes[file]) {
      const changed = changes[file](text);
      assert.notEqual(changed, text, `mutant must change ${file}`);
      text = changed;
    }
    await fs.mkdir(path.dirname(path.join(f.root, file)), { recursive: true });
    await fs.writeFile(path.join(f.root, file), text);
  }
  return path.join(f.root, files[0]);
}

test("TC-HARNESS-008 missing canonical router refuses before owned backup/root write", async t => {
  const f = await fixture(t);
  const executable = await copiedGenerator(f);
  await fs.unlink(path.join(f.root, ".claude/skills/shared/workflow-first-gate.md"));
  const original = "# My original root\n";
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
  const owned = path.join(f.root, "owned.md");
  await assert.rejects(f.run(["--mode", "init", "--backup-path", owned], executable),
    e => e.code === 1 && /Required workflow detail unavailable/.test(e.stderr));
  assert.equal(await f.read(), original);
  await assert.rejects(fs.stat(owned), { code: "ENOENT" });
});

test("TC-HARNESS-008 missing shared protocol cannot stamp false completeness on init/update", async t => {
  for (const mode of ["init", "update"]) {
    const f = await fixture(t);
    const executable = await copiedGenerator(f);
    await f.run(["--mode", "init"], executable);
    await fs.unlink(path.join(f.root, ".claude/skills/shared/sync-inline-versions.md"));
    const result = await f.run(["--mode", mode], executable);
    assert.match(result.stderr, /Shared protocol source unavailable/);
    assert.doesNotMatch(await f.read(), /CK:UNIVERSAL-GUIDES/);
  }
});

test("TC-HARNESS-015 automatic update and idempotence keep custom tail and backup bytes", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = "\n## Custom prose\nthree newlines\n\n\nkeep spaces  \n";
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  const before = await f.read();
  const firstOwned = path.join(f.root, "first-owned.md");
  await f.run(["--backup-path", firstOwned]);
  assert.equal(await fs.readFile(firstOwned, "utf8"), before);
  const once = await f.read();
  await f.run([`--backup-path=${path.join(f.root, "second-owned.md")}`]);
  assert.equal(await f.read(), once, "second update is byte-idempotent");
  assert.ok(once.includes(custom));
});

test("TC-HARNESS-015 malformed markers and absent source refuse before reserving explicit backup", async t => {
  for (const source of [null, "<!-- SECTION:custom -->\nretain unterminated"] ) {
    const f = await fixture(t);
    const owned = path.join(f.root, "owned.md");
    if (source !== null) await fs.writeFile(path.join(f.root, "CLAUDE.md"), source);
    await assert.rejects(f.run(["--mode", "update", "--backup-path", owned]), e => e.code === 1);
    await assert.rejects(fs.stat(owned), { code: "ENOENT" });
    if (source !== null) assert.equal(await f.read(), source);
  }
});

test("TC-HARNESS-015 explicit init cannot invent a pre-update backup; legacy fresh init stays valid", async t => {
  const f = await fixture(t);
  const owned = path.join(f.root, "owned.md");
  await assert.rejects(f.run(["--mode", "init", "--backup-path", owned]), e => e.code === 1);
  await assert.rejects(fs.stat(owned), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(f.root, "CLAUDE.md")), { code: "ENOENT" });
  await f.run(["--mode", "init"]);
  assertRootContract(await f.read());
});

test("TC-HARNESS-008 exact legacy route migration preserves changed user-owned lookalikes", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = ["\n## Custom routing illustration",
    "1. Explicit slash command (e.g. `/plan`, `/feature-implement`) → execute it.",
    "2. Custom business rule: matching a workflow needs a documented reason.",
    "3. No matching workflow AND prompt would modify files → MUST invoke `/plan <prompt>` first.",
    "4. No matching workflow AND prompt is read-only/conversational → answer directly.\n"].join("\n");
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  await f.run(["--mode", "update"]);
  assert.ok((await f.read()).includes(custom), "heading/keywords are not ownership proof");
});

test("TC-HARNESS-008/015 semantic mutants are killed by observable output/backup assertions", async t => {
  const generator = ".claude/skills/claude-md-init/scripts/generate-claude-md.cjs";
  const template = ".claude/skills/claude-md-init/references/claude-md-template.md";
  for (const mutation of ["ignored-backup-option", "nonexclusive-backup", "authority-loss", "preservation-loss", "quality-gate-loss"]) {
    const f = await fixture(t);
    const changes = mutation === "ignored-backup-option" ? { [generator]: s => s.replaceAll("createBackup(backupPath);", "createBackup();") }
      : mutation === "nonexclusive-backup" ? { [generator]: s => s.replace("fs.constants.COPYFILE_EXCL", "0") }
      : { [template]: s => s.replace(mutation === "authority-loss"
        ? "Never commit, push, or stage" : mutation === "preservation-loss" ? "Preserve unrelated/user work" : "Required quality gates and native host permissions cannot be waived",
      "REMOVED INVARIANT") };
    const executable = await copiedGenerator(f, changes);
    await execFileAsync(process.execPath, ["--check", executable]);
    const original = "# Original synthetic root\n";
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    const owned = path.join(f.root, "owned.md");
    if (mutation === "nonexclusive-backup") await fs.writeFile(owned, "occupied original backup");
    await f.run(["--mode", "init", "--backup-path", owned], executable);
    if (mutation === "ignored-backup-option") {
      await assert.rejects(fs.readFile(owned), { code: "ENOENT" }, "semantic oracle: required owned backup missing");
      assert.equal(await fs.readFile(path.join(f.root, ".claude-md.backup"), "utf8"), original,
        "mutant reached legacy write; no syntax-based kill");
    } else if (mutation === "nonexclusive-backup") {
      assert.notEqual(await fs.readFile(owned, "utf8"), "occupied original backup", "collision preservation oracle kills mutant");
    } else {
      assert.throws(() => assertRootContract(require("node:fs").readFileSync(path.join(f.root, "CLAUDE.md"), "utf8")),
        { code: "ERR_ASSERTION" }, "runtime root invariant oracle kills mutant");
    }
    t.diagnostic(`${mutation}: KILLED (syntax valid, semantic assertion)`);
  }
});
