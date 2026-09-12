import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const modulePath = path.join(root, ".claude/scripts/lib/workflow-manifest.cjs");
const { resolveWorkflowManifest: resolve, resolveAllWorkflowManifests: resolveAll } = require(modulePath);
const availableSkills = new Set(["investigate", "plan", "spec", "why-review", "workflow-end"]);
const options = { availableSkills };
const occurrence = (id, skill = "spec", extra = {}) => ({ id, skill, ...extra });
const document = (entry = {}) => ({ version: "1.0.0", workflows: { "workflow-test": {
  name: "Synthetic", description: "Fixture", whenToUse: "Fixture", preActions: { injectContext: "Fixture context" },
  sequence: ["investigate", "spec [mode=tests]", "workflow-end"], ...entry,
} } });
const run = (doc, extra = {}) => resolve(doc, "workflow-test", { ...options, ...extra });
const variantDoc = () => document({ defaultMode: "audit", variants: {
  audit: { sequence: [occurrence("inspect", "spec", { args: "[mode=audit]" }), occurrence("close", "workflow-end")] },
  update: { sequence: [occurrence("write", "spec", { args: "[mode=update]" }), occurrence("close", "workflow-end")] },
} });

// TC-HARNESS-007: executable manifest invariants, not instruction-text efficacy.
test("legacy: preserves order, arguments and repeated skill occurrences", () => {
  const result = run(document({ sequence: ["spec [mode=tests]", "spec [mode=sync]", "spec [mode=tests]"] }));
  assert.deepEqual(result.occurrences.map(({ skill, args }) => [skill, args]), [["spec", "[mode=tests]"], ["spec", "[mode=sync]"], ["spec", "[mode=tests]"]]);
  assert.equal(new Set(result.occurrences.map(x => x.id)).size, 3);
  assert.equal(result.mode, "default");
});

test("legacy: IDs and fingerprint repeat, but IDs are version/source scoped", () => {
  const doc = document();
  assert.deepEqual(run(doc), run(structuredClone(doc)));
  const changed = structuredClone(doc); changed.version = "2.0.0";
  assert.notEqual(run(doc).occurrences[0].id, run(changed).occurrences[0].id);
  const inserted = document({ sequence: ["plan", ...doc.workflows["workflow-test"].sequence] });
  assert.notEqual(run(doc).occurrences[0].id, run(inserted).occurrences[1].id);
});

test("legacy: command-key barriers resolve to occurrence IDs and retain conditional members", () => {
  const result = run(document({ parallelGroups: [{ id: "reviewers", members: ["investigate", "spec [mode=tests]"], conditionalMembers: ["spec [mode=tests]"], barrier: true }] }));
  assert.deepEqual(result.parallelGroups[0].members, result.occurrences.slice(0, 2).map(x => x.id));
  assert.equal(result.occurrences[1].barrier, "reviewers");
  assert.notEqual(result.occurrences[1].applicability.when, "always");
  assert.ok(result.occurrences[1].applicability.skipReason);
});

test("variants: selected complete list replaces default and enumerates all modes", () => {
  const doc = variantDoc();
  const original = structuredClone(doc);
  assert.deepEqual(run(doc).sequence, ["spec [mode=audit]", "workflow-end"]);
  assert.deepEqual(run(doc, { mode: "update" }).sequence, ["spec [mode=update]", "workflow-end"]);
  assert.deepEqual(resolveAll(doc, "workflow-test", options).map(x => x.mode), ["audit", "update"]);
  assert.notEqual(run(doc).fingerprint, run(doc, { mode: "update" }).fingerprint);
  assert.deepEqual(doc, original, "resolution must not rewrite the canonical input");
});

test("variants: semantic identity survives unrelated insertion; source changes invalidate resume", () => {
  const doc = variantDoc(); const before = run(doc);
  doc.workflows["workflow-test"].variants.audit.sequence.unshift(occurrence("prepare", "investigate"));
  const after = run(doc);
  assert.equal(before.occurrences[0].id, after.occurrences[1].id);
  assert.notEqual(before.fingerprint, after.fingerprint);
  doc.workflows["workflow-test"].preActions.injectContext = "Changed contract";
  assert.notEqual(after.fingerprint, run(doc).fingerprint);
});

test("variants: preserve conditional tasks and isolate base groups/metadata", () => {
  const doc = variantDoc();
  Object.assign(doc.workflows["workflow-test"], { parallelGroups: [{ id: "base", members: ["investigate", "spec [mode=tests]"], barrier: true }], stepMeta: { investigate: { executionMode: "subagent" } } });
  doc.workflows["workflow-test"].variants.audit.sequence[0].applicability = { when: "target exists", skipReason: "No target" };
  const result = run(doc);
  assert.equal(result.occurrences.length, 2);
  assert.deepEqual(result.occurrences[0].applicability, { when: "target exists", skipReason: "No target" });
  assert.deepEqual(result.parallelGroups, []);
  assert.deepEqual(result.stepMeta, {});
});

test("variants: unknown modes never fall back, including bounded name domain", () => {
  // Domain: all 27 length-three words over a/b/c, plus empty, inherited and malformed keys.
  for (const a of "abc") for (const b of "abc") for (const c of "abc") {
    assert.throws(() => run(variantDoc(), { mode: a + b + c }), /Unknown workflow mode/);
  }
  for (const mode of ["", "default", "constructor", "toString", "../audit", null, 1]) assert.throws(() => run(variantDoc(), { mode }));
  assert.throws(() => run(document(), { mode: "audit" }), /Unknown workflow mode/);
});

test("metadata: preserves both selected fields for legacy repeats and explicit variant IDs", () => {
  // Full command keys target every identical legacy occurrence, not other args.
  for (const executionMode of ["subagent", "inline"]) for (const contextBudget of ["low", "medium", "high", "critical"]) {
    const meta = { executionMode, contextBudget };
    const legacy = run(document({ sequence: ["spec [mode=tests]", "spec [mode=sync]", "spec [mode=tests]"],
      stepMeta: { "spec [mode=tests]": meta } }));
    assert.deepEqual(legacy.stepMeta, { [legacy.occurrences[0].id]: meta, [legacy.occurrences[2].id]: meta });
    const explicit = run(document({ sequence: [occurrence("first"), occurrence("second")], stepMeta: { second: meta } }));
    assert.deepEqual(explicit.stepMeta, { second: meta });
    const doc = variantDoc();
    doc.workflows["workflow-test"].stepMeta = { investigate: { executionMode: "inline" } };
    doc.workflows["workflow-test"].variants.audit.stepMeta = { inspect: meta };
    assert.deepEqual(run(doc).stepMeta, { inspect: meta });
    assert.deepEqual(run(doc, { mode: "update" }).stepMeta, {}, "complete variant must not inherit metadata");
    assert.notEqual(legacy.stepMeta[legacy.occurrences[0].id], meta, "normalization copies metadata");
  }
});

test("invalid metadata: duplicate IDs rejected across bounded insertion positions", () => {
  // Domain: sequence lengths 1..8, each possible duplicate insertion position.
  for (let n = 1; n <= 8; n++) for (let i = 0; i <= n; i++) {
    const sequence = Array.from({ length: n }, (_, j) => occurrence(`step-${j}`));
    sequence.splice(i, 0, occurrence("step-0", "plan"));
    assert.throws(() => run(document({ sequence })), /Duplicate occurrence ID/);
  }
});

test("invalid metadata: reject absent skills, malformed occurrence/applicability/variant fields", () => {
  // Pins the portable declaration; external Ajv execution is separately recorded.
  const preActions = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.schema.json"), "utf8")).definitions.PreActions;
  assert.equal(preActions.additionalProperties, false);
  assert.equal(preActions.properties.domainEntityReferenceRefresh.type, "string");
  const pattern = new RegExp(preActions.properties.domainEntityReferenceRefresh.pattern);
  assert.equal(pattern.test("Refresh when applicable"), true);
  for (const value of ["", " ", "\n"]) assert.equal(pattern.test(value), false);
  for (const step of [null, 42, "", "../spec", occurrence("x", "ghost"), occurrence("x", "../spec"), occurrence("x", "spec", { args: [] }), occurrence("x", "spec", { typo: true }), occurrence("x", "spec", { applicability: { when: "maybe" } })]) {
    assert.throws(() => run(document({ sequence: [step] })));
  }
  for (const entry of [{ sequence: [] }, { sequence: "spec" }, { variants: {} }, { defaultMode: "audit" }, { defaultMode: "wrong", variants: variantDoc().workflows["workflow-test"].variants }, { defaultMode: "audit", variants: { audit: { sequence: ["spec"] } } }, { defaultMode: "audit", variants: { audit: { sequence: [occurrence("x")], patch: [] } } }]) assert.throws(() => run(document(entry)));
  assert.throws(() => run(document({ stepMeta: { ghost: { executionMode: "inline" } } })));
  for (const entry of [{ parallelGroups: null }, { stepMeta: null }]) assert.throws(() => run(document(entry)));
  assert.throws(() => run({ ...document(), version: null }));
});

test("barriers: explicit IDs disambiguate repeated skills, contiguous unordered membership accepted", () => {
  const result = run(document({ sequence: [occurrence("first"), occurrence("second"), occurrence("close", "workflow-end")], parallelGroups: [{ id: "reviews", members: ["second", "first"], barrier: true }] }));
  assert.deepEqual(result.occurrences.map(x => x.barrier), ["reviews", "reviews", null]);
});

test("barriers: reject ambiguity, missing/overlapping/noncontiguous/invalid membership", () => {
  const sequence = [occurrence("one"), occurrence("two"), occurrence("three")];
  const group = { id: "reviews", members: ["one", "two"], barrier: true };
  for (const groups of [[{ ...group, members: ["one", "three"] }], [{ ...group, members: ["one", "ghost"] }], [{ ...group, members: ["one", "one"] }], [{ ...group, members: ["one"] }], [{ ...group, barrier: false }], [{ ...group, conditionalMembers: ["three"] }], [group, { ...group, id: "again" }], [group, group]]) assert.throws(() => run(document({ sequence, parallelGroups: groups })));
  assert.throws(() => run(document({ sequence: ["spec", "spec", "workflow-end"], parallelGroups: [{ ...group, members: ["spec", "workflow-end"] }] })), /ambiguous/i);
});

test("fingerprint: object key order does not change source identity", () => {
  const doc = variantDoc();
  function reverse(value) { return Array.isArray(value) ? value.map(reverse) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)])) : value; }
  assert.equal(run(doc).fingerprint, run(reverse(doc)).fingerprint);
});

function fixture(t, doc = variantDoc()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-manifest-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, ".claude/scripts");
  fs.mkdirSync(path.join(scripts, "codex/tests"), { recursive: true });
  fs.mkdirSync(path.join(scripts, "lib"), { recursive: true });
  fs.copyFileSync(modulePath, path.join(scripts, "lib/workflow-manifest.cjs"));
  fs.copyFileSync(path.join(root, ".claude/scripts/codex/read-workflow-entry.mjs"), path.join(scripts, "codex/read-workflow-entry.mjs"));
  fs.writeFileSync(path.join(dir, ".claude/workflows.json"), JSON.stringify(doc));
  for (const skill of availableSkills) {
    fs.mkdirSync(path.join(dir, ".claude/skills", skill), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude/skills", skill, "SKILL.md"), "---\nname: synthetic\n---\n");
  }
  return { dir, scripts, cli: path.join(scripts, "codex/read-workflow-entry.mjs") };
}

test("CLI: clean copy supports mode/output aliases and preserves entry metadata", t => {
  const { cli, dir } = fixture(t);
  for (const args of [[], ["--mode", "audit"], ["--output=audit"], ["--mode=audit"], ["--output", "audit"]]) {
    const result = spawnSync(process.execPath, [cli, "workflow-test", ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const actual = JSON.parse(result.stdout);
    assert.equal(actual.name, "Synthetic");
    assert.equal(actual.preActions.injectContext, "Fixture context");
    assert.deepEqual(actual.occurrences.map(x => x.id), ["inspect", "close"]);
    assert.deepEqual(actual.sequence, ["spec [mode=audit]", "workflow-end"]);
  }
  for (const args of [["--mode=ghost"], ["--output"], ["--mode="], ["--mode", "audit", "--output", "update"], ["--bogus"], ["--mode", "--output"]]) {
    const result = spawnSync(process.execPath, [cli, "workflow-test", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
  }
});

test("CLI: context/skill validation and hostile workflow keys fail closed", t => {
  const doc = document(); const { dir, cli } = fixture(t, doc);
  for (const id of ["constructor", "toString", "__proto__", "unknown"]) {
    assert.throws(() => resolve(doc, id, options), /Unknown workflow ID/);
    assert.equal(spawnSync(process.execPath, [cli, id]).status, 1);
  }
  fs.rmSync(path.join(dir, ".claude/skills/spec/SKILL.md"));
  assert.match(spawnSync(process.execPath, [cli, "workflow-test"], { encoding: "utf8" }).stderr, /Missing skill/);
  doc.workflows["workflow-test"].preActions.injectContext = " ";
  fs.writeFileSync(path.join(dir, ".claude/workflows.json"), JSON.stringify(doc));
  assert.match(spawnSync(process.execPath, [cli, "workflow-test"], { encoding: "utf8" }).stderr, /injectContext/);
});

test("seeded semantic mutants: existing invariant tests kill fallback, duplicate acceptance and metadata loss", t => {
  const { scripts } = fixture(t);
  const testPath = path.join(scripts, "codex/tests/workflow-manifest.test.mjs");
  fs.copyFileSync(fileURLToPath(import.meta.url), testPath);
  const source = fs.readFileSync(modulePath, "utf8");
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const mutants = [
    ["unknown-mode fallback", "const mode = own(options, \"mode\") ? options.mode : (entry.defaultMode ?? \"default\");", "const mode = modes.includes(options.mode) ? options.mode : (entry.defaultMode ?? \"default\");", "variants: unknown modes", /Missing expected exception/],
    ["duplicate-ID acceptance", "check(!ids.has(record.id), `Duplicate occurrence ID: ${record.id}`);", "/* mutant: accept duplicate identity */", "invalid metadata: duplicate IDs", /Missing expected exception/],
    ["metadata loss", "value: { ...meta }", "value: {}", "metadata: preserves both selected fields", /Expected values to be strictly deep-equal/],
  ];
  for (const [name, before, after, pattern, diagnostic] of mutants) {
    assert.equal(source.split(before).length, 2, `exactly one mutation target: ${name}`);
    fs.writeFileSync(path.join(scripts, "lib/workflow-manifest.cjs"), source.replace(before, after));
    const result = spawnSync(process.execPath, ["--test", `--test-name-pattern=${pattern}`, testPath], { encoding: "utf8", env: childEnv });
    assert.equal(result.status, 1, `${name} must fail the unchanged invariant test\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, diagnostic);
    assert.match(result.stdout, /# fail 1/);
    t.diagnostic(`${name}: KILLED by unchanged ${pattern} test (exit ${result.status})`);
  }
});

test("variants: shipped research/spec/visualize workflows resolve every complete mode", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.json"), "utf8"));
  const expected = {
    "workflow-research": {
      synthesis: ["web-research", "deep-research", "knowledge-synthesis", "knowledge-review", "workflow-end"],
      "business-eval": ["web-research", "deep-research", "market-analysis", "business-evaluation", "knowledge-review", "workflow-end"],
      marketing: ["web-research", "deep-research", "market-analysis", "strategy-builder", "knowledge-review", "workflow-end"],
      course: ["web-research", "deep-research", "course-builder", "knowledge-review", "workflow-end"]
    },
    "workflow-code-to-spec": {
      "init-full": ["investigate", "plan", "plan-review", "plan-validate", "spec [mode=init]", "spec [mode=tests]", "artifact-review --type=spec-tests", "artifact-review", "docs-update", "workflow-end", "watzup"],
      update: ["workflow-review-changes", "spec [mode=update]", "spec [mode=tests]", "artifact-review --type=spec-tests", "spec [mode=sync]", "changes-review", "docs-update", "workflow-end", "watzup"],
      audit: ["investigate", "spec [mode=audit]", "artifact-review", "docs-update", "workflow-end", "watzup"]
    },
    "workflow-visualize": {
      codebase: ["investigate", "excalidraw-diagram", "workflow-end"],
      knowledge: ["web-research", "deep-research", "excalidraw-diagram", "workflow-end"]
    }
  };
  for (const [workflowId, modes] of Object.entries(expected)) {
    const manifests = resolveAll(registry, workflowId, { rootDir: root });
    assert.deepEqual(Object.fromEntries(manifests.map(manifest => [manifest.mode, manifest.sequence])), modes);
    assert.ok(manifests.every(manifest => manifest.fingerprint && manifest.occurrences.every(item => item.id)));
  }
});

test("production workflows declare required and opt-in near-end E2E handoffs", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.json"), "utf8"));
  const cases = [
    ["workflow-greenfield-init", "security-review", true],
    ["workflow-big-feature", "security-review", true],
    ["workflow-feature", "security-review", false],
    ["workflow-bugfix", "changelog", false],
  ];
  for (const [workflowId, nextSkill, required] of cases) {
    const manifest = resolve(registry, workflowId, { rootDir: root });
    const index = manifest.occurrences.findIndex(item => item.skill === "workflow-e2e");
    assert.ok(index > 0, `${workflowId} must include workflow-e2e`);
    assert.equal(manifest.occurrences[index - 1].skill, "workflow-review-changes");
    assert.equal(manifest.occurrences[index].args, "--source=context");
    assert.equal(manifest.occurrences[index + 1].skill, nextSkill);
    if (required) {
      assert.equal(manifest.occurrences[index].applicability.when, "always");
      assert.equal(manifest.occurrences[index].applicability.skipReason, null);
    } else {
      assert.match(manifest.occurrences[index].applicability.when, /explicitly requests E2E/i);
      assert.match(manifest.occurrences[index].applicability.skipReason, /disabled by default/i);
    }
  }
});

test("E2E visual review contracts default on and review generated screenshots", () => {
  const skillFiles = [
    ".claude/skills/e2e-test/SKILL.md",
    ".claude/skills/workflow-e2e/SKILL.md",
    ".claude/skills/workflow-e2e-green/SKILL.md",
    ".claude/skills/e2e-test-verify-loop/SKILL.md",
  ];
  for (const relativePath of skillFiles) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.match(source, /visual (?:screenshot )?review is enabled by default|default true/i, relativePath);
    assert.match(source, /--visual-review=false.*(?:opt-out|opts out)/is, relativePath);
    assert.match(source, /open\/read.*(?:every|each).*image|every generated screenshot/is, relativePath);
    assert.match(source, /experience-review/, relativePath);
  }
});
