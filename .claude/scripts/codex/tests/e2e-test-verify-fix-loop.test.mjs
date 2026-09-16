import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// The retired standalone E2E convergence skill now lives as `e2e-test-verify --fix-loop`.
// These oracles pin (a) the opt-in flag contract, (b) every convergence gate the retired skill
// carried, (c) a default pass that stays report-only for its report-only callers, and (d) that the
// retired directory and its registry wiring stay gone. The old name is assembled from parts so a
// repository residue grep for it stays at zero.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const RETIRED = ["e2e-test-verify", "loop"].join("-");
const SKILL = ".claude/skills/e2e-test-verify/SKILL.md";
const MODE_BLOCK = /<!-- FIX-LOOP-MODE:START -->([\s\S]*?)<!-- FIX-LOOP-MODE:END -->/g;

const read = (rel) => fs.readFileSync(path.join(repoRoot, ...rel.split("/")), "utf8").replace(/\r\n/g, "\n");

function modeText(text) {
  return [...text.matchAll(MODE_BLOCK)].map((match) => match[1]).join("\n");
}

function defaultText(text) {
  return text.replace(MODE_BLOCK, "");
}

// Every convergence gate the retired skill enforced must survive inside the delimited mode.
const MODE_GATES = [
  /--visual-review=true\|false/,
  /The default is `true`; an invalid or ambiguous value is a blocker/,
  /Only an explicit `--visual-review=false` opts out/,
  /`e2eTesting\.execution`/,
  /`surfaceIds\[\]` → `experienceVerification\.surfaces\[\]` → `localRun`/,
  /Goal Contract whose required criterion/,
  /consecutive-green requirement \(default 2\)/,
  /round cap \(default 3\)/,
  /`SOURCE-WRONG` — /,
  /`TEST-WRONG` — /,
  /`TEST-NOT-OPTIMAL` — /,
  /`ENVIRONMENT-BLOCKED` — /,
  /`AMBIGUOUS` — /,
  /invoke `\/debug-investigate` inline/,
  /invoke `\/fix` at that owning layer \(`--target=ui`/,
  /invoke `\/changes-review` inline, report-only/,
  /Round Integrity Check/,
  /`\/experience-review --rounds=0`/,
  /open the configured browser visibly when human-QC is requested/,
  /wait exactly \*\*500ms\*\*/,
  /a non-shrinking failure or visual-blocker count across two rounds/,
  /`CONVERGED`, `N\/A`, `ENVIRONMENT-BLOCKED`, `NOT-CONVERGED`, or `ACCEPTANCE-PENDING`/,
  /Run the default pass \(Steps 0–4\) INLINE, WITHOUT `--fix-loop`/,
  /NEVER self-invoke with the flag/,
  /Report-only callers \(`\/changes-review` Phase 3\.9 and the `\/workflow-review-changes` step-1 E2E route\) invoke the default pass and NEVER pass `--fix-loop`/,
  /<!-- SYNC:e2e-visual-design-contract -->|resolved `uiStateCapture\.mode`/,
];

function assertModeGates(mode) {
  for (const gate of MODE_GATES) assert.match(mode, gate);
}

test("TC-E2EFL-001: e2e-test-verify advertises --fix-loop and --visual-review in delimited regions", () => {
  const text = read(SKILL);
  const frontmatter = text.split("\n---\n")[0];
  assert.match(frontmatter, /^version: 1\.1\.0$/m);
  assert.match(frontmatter, /^description: '[^'\n]*--fix-loop[^'\n]*--visual-review=\{true\|false\}[^'\n]*'$/m);
  // Summary bullet · mode detection · mode section · closing reminders.
  assert.equal(text.split("<!-- FIX-LOOP-MODE:START -->").length - 1, 4, "four mode openers");
  assert.equal(text.split("<!-- FIX-LOOP-MODE:END -->").length - 1, 4, "four mode closers");
  const blocks = [...text.matchAll(MODE_BLOCK)];
  assert.equal(blocks.length, 4, "openers and closers pair up");
  for (const block of blocks) assert.match(block[1], /--fix-loop/, "every delimited block belongs to the flag");
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("**Workflow:**"));
  assert.match(summary, /OPTIONAL `--fix-loop` MODE \(opt-in; absent flag = everything above unchanged\)/);
  const closing = text.slice(text.indexOf("## Closing Reminders"));
  assert.match(closing, /IMPORTANT MUST ATTENTION `--fix-loop` \(OPTIONAL mode — only when the flag is passed\)/);
  assert.match(closing, /--visual-review=false` as the explicit opt-out/);
});

test("TC-E2EFL-002: --fix-loop carries every retired convergence gate and no gate can be dropped silently", () => {
  const mode = modeText(read(SKILL));
  assertModeGates(mode);
  for (const [from, to] of [
    ["Only an explicit `--visual-review=false` opts out", "Visual review may be skipped"],
    ["Round Integrity Check", "round summary"],
    ["WITHOUT `--fix-loop`", "with `--fix-loop`"],
    ["invoke `/debug-investigate` inline", "patch the failing line"],
  ]) {
    assert.ok(mode.includes(from), `mutant anchor present: ${from}`);
    assert.throws(() => assertModeGates(mode.split(from).join(to)), { code: "ERR_ASSERTION" }, `dropping "${from}" must fail`);
  }
});

test("TC-E2EFL-003: without the flag the default pass stays report-only", () => {
  const defaults = defaultText(read(SKILL));
  assert.match(defaults, /The default pass is report-only/);
  assert.match(defaults, /Do not repair failures in this default pass/);
  assert.match(defaults, /run the configured full command for the fixed scope/);
  assert.match(defaults, /`PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED`/);
  assert.doesNotMatch(defaults, /`\/fix`|`\/debug-investigate`|`\/changes-review`|Goal Contract/, "repair routing lives only inside the mode");
  const reviewer = read(".claude/skills/changes-review/SKILL.md");
  assert.match(reviewer, /Invoke `\/e2e-test-verify` report-only/);
  assert.doesNotMatch(reviewer, /e2e-test-verify --fix-loop/, "report-only caller never passes the flag");
});

test("TC-E2EFL-004: the retired skill stays gone and workflow-e2e converges through the flag", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, ".claude", "skills", RETIRED)), false, "retired skill directory stays deleted");
  const raw = read(".claude/workflows.json");
  assert.equal(raw.includes(RETIRED), false, "workflow registry has no retired reference");
  const { resolveWorkflowManifest } = require(path.join(repoRoot, ".claude/scripts/lib/workflow-manifest.cjs"));
  const manifest = resolveWorkflowManifest(JSON.parse(raw), "workflow-e2e", { rootDir: repoRoot });
  const converge = manifest.occurrences.find((item) => item.id === "e2e-converge");
  assert.ok(converge, "convergence occurrence exists");
  assert.equal(converge.skill, "e2e-test-verify");
  assert.equal(converge.args, "--fix-loop");
  assert.deepEqual(manifest.sequence.slice(1, 4), ["e2e-test", "e2e-test-verify --fix-loop", "docs-update"]);
  const workflowSkill = read(".claude/skills/workflow-e2e/SKILL.md");
  assert.match(workflowSkill, /\*\*IMPORTANT MANDATORY Steps:\*\* \/investigate -> \/e2e-test -> \/e2e-test-verify --fix-loop -> \/docs-update/);
  for (const rel of [
    ".claude/skills/workflow-e2e/SKILL.md",
    ".claude/skills/shared/e2e-quality-protocol.md",
    ".claude/skills/shared/ui-state-capture-protocol.md",
    ".claude/scripts/inject_review_skill_blocks.py",
    ".claude/scripts/skills_data.yaml",
    ".claude/SKILLS.yaml",
  ]) {
    assert.equal(read(rel).includes(RETIRED), false, `${rel} has no retired reference`);
  }
  assert.match(read(".claude/scripts/inject_review_skill_blocks.py"), /E2E_VISUAL_DESIGN = \[[^\]]*"e2e-test-verify"/);
});
