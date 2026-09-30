import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, promises as fs, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const { getDocsRoot } = require("../../../hooks/lib/project-config-loader.cjs");

async function read(rel) {
  return fs.readFile(path.join(repoRoot, ...rel.split("/")), "utf8");
}

// A skill's contract is its SKILL.md plus every `references/*.md` (sorted), read as one text, so a
// pinned phrase holds wherever the skill keeps it (a mode section may move to a point-of-use reference).
async function readSkillContract(name) {
  const dir = path.join(repoRoot, ".claude", "skills", name);
  const texts = [await fs.readFile(path.join(dir, "SKILL.md"), "utf8")];
  const refs = await fs.readdir(path.join(dir, "references")).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  for (const file of refs.filter((entry) => entry.endsWith(".md")).sort()) {
    texts.push(await fs.readFile(path.join(dir, "references", file), "utf8"));
  }
  return texts.join("\n");
}

async function readIfExists(rel) {
  try {
    return await read(rel);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

test("orchestrator tier includes every proven direct-dispatch skill (CR-089)", async () => {
  const source = await read(".claude/scripts/sync-hooks-to-skills.py");
  for (const skill of ["architecture-design", "demo-guide", "feature-presentation", "test"]) {
    assert.match(source, new RegExp(`(?:^|[,\\s])\\"${skill}\\"(?:[,\\s]|$)`));
  }
  assert.match(source, /ORCHESTRATOR_SKILL_BLOCK_ORDER = SKILL_BLOCK_ORDER \+ \["parallel-subagent-dispatch"\]/);
});

test("large ideas use embedded decomposition and ordinary workflows do not add a roadmap writer", async () => {
  const [contract, ideaToPbi, ideaToSpec, specToPbi, presentation, mockup, roadmap] = await Promise.all([
    read(".claude/skills/shared/product-roadmap-contract.md"),
    read(".claude/skills/workflow-idea-to-pbi/SKILL.md"),
    read(".claude/skills/workflow-idea-to-spec/SKILL.md"),
    read(".claude/skills/workflow-spec-to-pbi/SKILL.md"),
    read(".claude/skills/feature-presentation/SKILL.md"),
    read(".claude/skills/pbi-mockup/SKILL.md"),
    read(".claude/skills/product-roadmap/SKILL.md"),
  ]);
  for (const content of [contract, ideaToPbi, ideaToSpec, specToPbi]) {
    assert.match(content, /isLargeIdea/);
    assert.match(content, /large_idea_decomposition/);
    assert.match(content, /outcome_slices/);
    assert.match(content, /deferred_work_owner/);
  }
  assert.match(presentation, /all-PBI presentation/i);
  assert.match(presentation, /Decomposition & boundaries/i);
  assert.match(mockup, /Decomposition boundary/);
  assert.match(roadmap, /explicitly requested/i);
  assert.match(roadmap, /do not create.*docs\/product-roadmap\.md/i);
});

test("shared-protocol maintenance documents both skill tiers without fixed inventory counts (CR-095)", async () => {
  const skill = await read(".claude/skills/sync-skills-shared-protocols/SKILL.md");
  assert.match(skill, /ORCHESTRATOR_SKILL_BLOCK_ORDER/);
  assert.match(skill, /on-disk target inventory/);
  assert.doesNotMatch(skill, /all 163 skills|all 29 agents|183 updated/);
});

test("plan and plan-review keep decision-boundary altitude and verify-last order (CR-092, CR-093)", async () => {
  const [plan, review] = await Promise.all([
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/skills/plan-review/SKILL.md"),
  ]);
  assert.match(plan, /Important technical decisions/);
  assert.match(plan, /Areas and owners to touch/);
  assert.match(plan, /Discovery before edit/);
  assert.match(plan, /After all implementation: run one whole-change static review/);
  assert.match(review, /Plan altitude/);
  assert.match(review, /Verify-last/);
});

test("docs-update reserves spec and generated-doc paths to canonical child skills (CR-096)", async () => {
  const skill = await read(".claude/skills/docs-update/SKILL.md");
  assert.match(skill, /MUST NOT own any `docs\/specs\/\*\*`/);
  assert.match(skill, /explicitly reserved to its child skill/);
  assert.match(skill, /Exclude `docs\/specs\/\*\*`/);
});

const NO_STAMP_POLICY_INDEX_FIXTURE = "# Docs index\n\nNo applicable stamp rule is declared.\n";
const EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE =
  "# Docs index\n\n## Narrow edits\nImpact-scoped patches add `<!-- Last verified: YYYY-MM-DD -->`.\n";

function hasImpactScopedLastVerifiedRule(localDocsIndex) {
  return localDocsIndex
    .replace(/\r\n/g, "\n")
    .split("\n")
    .some((line) => /impact-scoped/i.test(line) && /Last verified/i.test(line));
}

function assertDocsUpdateStampPolicy(skillInput, localDocsIndexFixture) {
  const skill = skillInput.replace(/\r\n/g, "\n");
  const start = skill.indexOf("### Step 1.6: Stamp Discipline (BLOCKING)");
  const end = skill.indexOf("### Step 1.7: Phase 1 Output", start);
  assert.ok(start >= 0 && end > start, "docs-update must keep its bounded Step 1.6 stamp policy");
  const stampPolicy = skill.slice(start, end);

  assert.match(stampPolicy, /Resolve and read `docs-index-reference\.md`[\s\S]*`docsRoots\.projectReference\.path`/);
  assert.match(stampPolicy, /Only a full scan may[^\n.]*Last scanned/i);
  assert.match(stampPolicy, /If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified/i);
  assert.match(stampPolicy, /Follow any applicable explicit stamp rule exactly, including its scope, format, and placement/i);
  assert.match(stampPolicy, /otherwise write NO tracked date stamp/i);
  assert.match(stampPolicy, /if no applicable explicit rule exists, the portable default is NO tracked date stamp/i);
  assert.match(stampPolicy, /record the pass in the untracked local ledger: `node \.claude\/hooks\/lib\/doc-stamp-guard\.cjs --record-verified/);
  assert.match(stampPolicy, /impact-scoped pass MUST NOT add, update, or move `Last scanned`/i);
  assert.match(stampPolicy, /A verify pass that changes nothing writes nothing, regardless of any local stamp rule/i);
  assert.match(stampPolicy, /When the applicable rule does not allow this stamp[\s\S]*remove a pre-existing `Last verified` line only as part of an otherwise-required content patch, never in a stamp-only write/i);
  assert.match(stampPolicy, /doc-stamp-guard\.cjs --check <doc> --candidate <file>/);
  assert.match(stampPolicy, /exit 3 = no-op/);

  if (hasImpactScopedLastVerifiedRule(localDocsIndexFixture)) {
    assert.match(stampPolicy, /If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified/i);
  } else {
    assert.match(stampPolicy, /if the local docs-index is missing or has no applicable explicit rule, write NO tracked date stamp/i);
  }
  assert.match(skill, /Stamps: .*`Last verified`.*local docs-index rule/);
  assert.match(
    skill,
    /\| "I updated the doc, so I'll refresh `Last scanned`" \|[^\n]*Last scanned[^\n]*Last verified[^\n]*local docs-index/i,
    "anti-rationalization text must use the same local-policy rule",
  );

  assert.doesNotMatch(skill, /NEVER write .*Last verified.*tracked doc/i, "there must be no absolute Last verified prohibition");
  assert.doesNotMatch(skill, /(?:every|all) impact-scoped[^\n.]{0,120}(?:must|shall|always|required)[^\n.]{0,80}Last verified/i, "there must be no universal Last verified mandate");
  assert.doesNotMatch(skill, /Last verified[^\n.]{0,100}(?:must|shall|always|required)[^\n.]{0,80}(?:every|all) impact-scoped/i, "there must be no universal Last verified mandate");
}

test("docs-update keeps local stamp rules optional and the no-rule default portable (TC-FIT-026)", async () => {
  const skill = await read(".claude/skills/docs-update/SKILL.md");

  assert.equal(hasImpactScopedLastVerifiedRule(NO_STAMP_POLICY_INDEX_FIXTURE), false);
  assert.equal(hasImpactScopedLastVerifiedRule(EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE), true);
  assertDocsUpdateStampPolicy(skill, NO_STAMP_POLICY_INDEX_FIXTURE);
  assertDocsUpdateStampPolicy(skill, EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE);

  for (const forbiddenRule of [
    "NEVER write `<!-- Last verified: YYYY-MM-DD -->` into a tracked doc.",
    "Every impact-scoped patch must write `Last verified`.",
  ]) {
    assert.throws(
      () => assertDocsUpdateStampPolicy(`${skill}\n${forbiddenRule}`, EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE),
      { code: "ERR_ASSERTION" },
    );
  }

  const lastScannedMutant = skill.replaceAll(
    "An impact-scoped pass MUST NOT add, update, or move `Last scanned`.",
    "An impact-scoped pass MAY update `Last scanned`.",
  );
  assert.notEqual(lastScannedMutant, skill, "Last-scanned mutation anchor exists");
  assert.throws(() => assertDocsUpdateStampPolicy(lastScannedMutant, NO_STAMP_POLICY_INDEX_FIXTURE), { code: "ERR_ASSERTION" });
});

test("the configured docs-index Last verified rule is honored when present (TC-FIT-026 local integration)", async (t) => {
  const configInput = await readIfExists("docs/project-config.json");
  if (configInput === null) {
    t.skip("adopter has no docs/project-config.json; portable fixture contract still runs");
    return;
  }

  const config = JSON.parse(configInput);
  const referenceRoot = getDocsRoot("projectReference", config).replace(/\/+$/, "");
  const [skill, localDocsIndex] = await Promise.all([
    read(".claude/skills/docs-update/SKILL.md"),
    readIfExists(`${referenceRoot}/docs-index-reference.md`),
  ]);
  if (localDocsIndex === null) {
    t.skip("adopter has no resolved docs-index-reference.md; portable fixture contract still runs");
    return;
  }

  assertDocsUpdateStampPolicy(skill, localDocsIndex);
  if (!hasImpactScopedLastVerifiedRule(localDocsIndex)) return;

  const stampRule = localDocsIndex
    .replace(/\r\n/g, "\n")
    .split("\n")
    .find((line) => /impact-scoped/i.test(line) && /Last verified/i.test(line));
  if (!stampRule || !/impact-scoped patch adds `<!-- Last verified: YYYY-MM-DD -->` on following line/i.test(stampRule)) {
    return;
  }

  assert.match(stampRule, /only full `scan --target=<key>` may move `<!-- Last scanned: -->`/i);
  assert.match(stampRule, /files with no scan stamp \(`CLAUDE\.md`, `\.claude\/\*\*`\) get \*\*no\*\* stamp/i);
});

test("docs-manager follows the docs-update local stamp contract", async () => {
  const role = (await read(".claude/agents/docs-manager.md")).replace(/\r\n/g, "\n");
  const stampRule = role.split("\n").find((line) => /Stamp discipline:/i.test(line));

  assert.ok(stampRule, "docs-manager must keep one explicit stamp rule");
  assert.match(stampRule, /follow Step 1\.6 of `\.claude\/skills\/docs-update\/SKILL\.md`/i);
  assert.match(stampRule, /update `Last verified` only when the resolved local docs-index explicitly requires it/i);
  assert.match(stampRule, /Preserve explicit no-stamp paths such as `CLAUDE\.md` and `\.claude\/\*\*`/);
  assert.match(stampRule, /record the pass in the untracked ledger/i);
  assert.doesNotMatch(stampRule, /impact-scoped patch writes NO stamp at all/i);
});

test("parallel and adjudication contracts retain fixed-order and exact artifact semantics (CR-024, CR-099..101)", async () => {
  const [canonical, protocol, guide, understand, scale] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    read(".claude/scripts/lib/hookless-prompt-protocol.cjs"),
    read(".claude/skills/shared/sub-agent-selection-guide.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
  ]);
  for (const content of [canonical, protocol]) assert.match(content, /skill or workflow explicitly fixes/i);
  assert.match(guide, /unique exact artifact/i);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /`[^`]*G\{n\}\.\{axis\}\.md`/);
  for (const verdict of ["SOURCE-WRONG", "TEST-WRONG", "TEST-NOT-OPTIMAL", "ENVIRONMENT-BLOCKED", "AMBIGUOUS"]) {
    assert.match(canonical, new RegExp(verdict));
  }
  assert.match(canonical, /verdict before trace\/edit|provisional verdict[\s\S]{0,160}before touching/i);
});

// CR-017 carrier predicate. The one round-eligibility predicate lives in SYNC:double-round-trip-review;
// a converted skill carries that protocol as a guide line (shared P25 recognizer, never a copied
// line format) and the text lives in its projection file `shared/protocols/<tag>.md`.
const BLOCKING_PREDICATE_TAG = "double-round-trip-review";
const BLOCKING_PREDICATE_RE = /blocking_findings\(round, findings\)/;
const guideCarrier = require("../../lib/protocol-guide-carrier.cjs");
function carriesBlockingPredicate(content, projectionText, { acceptGuide }) {
  if (BLOCKING_PREDICATE_RE.test(content)) return true;
  return acceptGuide && projectionText != null && guideCarrier.hasGuideEntry(content, BLOCKING_PREDICATE_TAG) &&
    BLOCKING_PREDICATE_RE.test(projectionText);
}

test("review convergence uses one blocking predicate and byte-identical low-only exit (CR-017, CR-018)", async () => {
  const [canonical, loop] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    // The outer zero-fix loop is workflow-review-changes' optional `--fix-loop` mode (references/fix-loop.md).
    readSkillContract("workflow-review-changes"),
  ]);
  assert.match(canonical, /blocking_findings\(round, findings\)/);
  assert.match(canonical, /binary gate/i);
  assert.match(loop, /ALL LOW/i);
  assert.match(loop, /byte-identical/i);
  assert.match(loop, /changed fingerprint.*re-review/i);

  const reviewCarriers = [
    ".claude/skills/architecture-review-full/SKILL.md",
    ".claude/skills/architecture-review/SKILL.md",
    ".claude/skills/artifact-review/SKILL.md",
    ".claude/skills/changes-review/SKILL.md",
    ".claude/skills/code-quality-review/SKILL.md",
    ".claude/skills/domain-entities-review/SKILL.md",
    ".claude/skills/knowledge-review/SKILL.md",
    ".claude/skills/performance-review/SKILL.md",
    ".claude/skills/production-readiness-review/SKILL.md",
    ".claude/skills/security-audit/SKILL.md",
    ".claude/skills/ui-review/SKILL.md",
    ".claude/skills/why-review/SKILL.md",
  ];
  const projection = await readIfExists(`.claude/skills/shared/protocols/${BLOCKING_PREDICATE_TAG}.md`);
  for (const rel of reviewCarriers) {
    const content = await read(rel);
    // Agents keep full text (owner decision); a skill may carry the protocol as a guide entry.
    assert.ok(carriesBlockingPredicate(content, projection, { acceptGuide: rel.startsWith(".claude/skills/") }),
      `${rel} must carry blocking_findings(round, findings) inline, or (skills only) a ${BLOCKING_PREDICATE_TAG} guide entry whose projection file carries it`);
    assert.doesNotMatch(content, /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
  // Leaf reviewer agents no longer run the round loop (the orchestrating skills above own the
  // predicate), but none may restate a conflicting any-finding-fails rule of its own.
  for (const name of ["architect", "code-reviewer", "integration-tester", "planner", "security-auditor", "spec-compliance-reviewer", "ui-ux-designer"]) {
    const rel = `.claude/agents/${name}.md`;
    assert.doesNotMatch(await read(rel), /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
});

test("CR-017 carrier predicate accepts a guide entry backed by its projection and fails when both forms are missing (TC-PDL-065)", () => {
  // Given a skill that holds a guide entry for the protocol instead of its body, and a projection that holds the predicate
  const guided = [guideCarrier.GUIDE_BLOCK_START, "",
    guideCarrier.formatGuideLine({ tag: BLOCKING_PREDICATE_TAG, summary: "Fix loop", when: "running a review", path: `.claude/skills/shared/protocols/${BLOCKING_PREDICATE_TAG}.md` }),
    "", guideCarrier.GUIDE_BLOCK_END].join("\n");
  const projection = "> Compute blocking_findings(round, findings) once per round.";
  // When the skill is checked, Then it passes
  assert.equal(carriesBlockingPredicate(guided, projection, { acceptGuide: true }), true);
  // When the guide is removed too (both forms missing), Then it fails
  assert.equal(carriesBlockingPredicate("# Skill\n", projection, { acceptGuide: true }), false);
  // When the projection is missing or lost the predicate, Then it fails
  assert.equal(carriesBlockingPredicate(guided, null, { acceptGuide: true }), false);
  assert.equal(carriesBlockingPredicate(guided, "> no predicate here", { acceptGuide: true }), false);
  // When an agent carries only a guide, Then it fails (agents keep full text)
  assert.equal(carriesBlockingPredicate(guided, projection, { acceptGuide: false }), false);
  // And an inline body still passes for both
  assert.equal(carriesBlockingPredicate(projection, null, { acceptGuide: false }), true);
});

test("investigation and fan-out skills retain graph and shard discipline (CR-020..023)", async () => {
  const [investigate, discovery, understand, scale, scan] = await Promise.all([
    read(".claude/skills/investigate/SKILL.md"),
    read(".claude/skills/spec-discovery/SKILL.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
    read(".claude/skills/scan/SKILL.md"),
  ]);
  assert.match(investigate, /Post-Grep Trace Trigger/i);
  assert.match(investigate, /grep CANNOT find/i);
  assert.match(discovery, /unique (?:artifact|report path)/i);
  assert.match(discovery, /reducer/i);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /S2 gather agents receive no fragment path/i);
  assert.match(scale, /G\{n\}\.\{axis\}\.md/);
  assert.match(scale, /ORCHESTRATOR spawns axis agents/i);
  assert.match(scale, /Merge shards in SECTION order/i);
  assert.match(scale, /Cap: ≤ 3 axis agents per group/i);
  assert.match(scan, /unique shard/i);
  assert.match(scan, /sole writer/i);
});

test("mutating workflow closures refresh domain-entity references before docs-update or delegate to workflow-review-changes (CR-102)", async () => {
  const workflows = JSON.parse(await read(".claude/workflows.json")).workflows;
  // Workflows that still own the terminal refresh carry scan -> docs-update explicitly.
  for (const id of ["workflow-review-changes"]) {
    const sequence = workflows[id].sequence;
    const scanIndex = sequence.indexOf("scan --target=domain-entities");
    assert.ok(scanIndex >= 0, `${id} must carry the refresh step`);
    assert.equal(sequence[scanIndex + 1], "docs-update");
    assert.match(workflows[id].preActions.domainEntityReferenceRefresh, /cited skip reason/);
  }
  // Workflows that delegate their review/docs tail to the nested workflow-review-changes must name
  // it — the nested workflow owns the scan -> docs-update refresh and the cited-skip-reason rule.
  for (const id of ["workflow-greenfield-init", "workflow-refactor"]) {
    assert.ok(
      workflows[id].sequence.some((step) => (typeof step === "string" ? step : step?.skill) === "workflow-review-changes"),
      `${id} must delegate the terminal domain-entity refresh to workflow-review-changes`
    );
  }
});

test("plan never invokes plan-review and only offers it after a standalone plan", async () => {
  const plan = await read(".claude/skills/plan/SKILL.md");
  assert.match(plan, /Never invoke `plan-review` or another review skill/);
  assert.match(plan, /Standalone invocation:\*{0,2}[\s\S]*(?:ask|asking) exactly one optional question: `Run plan-review on this plan\?`/);
  assert.match(plan, /Workflow invocation:\*{0,2}[\s\S]*Do not ask about review, execution, or other next steps/);
  assert.doesNotMatch(plan, /invoke `plan-review` automatically|then run `plan-review`/i);
});

test("plan-review performs exactly one read-only review round", async () => {
  const [review, planSkill, planner] = await Promise.all([
    read(".claude/skills/plan-review/SKILL.md"),
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/agents/planner.md"),
  ]);
  const text = review.replace(/\r\n/g, "\n");
  const frontmatter = text.slice(0, text.indexOf("\n---", 4));
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("## One-Round Contract"));
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  assert.match(frontmatter, /maximum one review round per invocation/);
  for (const [where, section] of [["Quick Summary", summary], ["Closing Reminders", closing]]) {
    assert.match(section, /one review round|ONE ROUND MAXIMUM/i, `${where} must state the single-pass cap`);
    assert.match(section, /never (?:fix the plan|edit the plan)|never edit the plan/i, `${where} must preserve the read-only boundary`);
  }
  assert.match(text, /`round = 1`, `maxRounds = 1`, `minRounds = 1`/);
  assert.match(text, /Stop\. Do not apply fixes or re-review/);
  assert.match(text, /another review requires a new explicit invocation/i);
  assert.doesNotMatch(text, /OVERRIDE:double-round-trip-review|SYNC:double-round-trip-review|extendable ONCE|fresh full re-review/i);
  assert.match(planSkill, /Never invoke `plan-review`/);
  assert.match(planner, /never invoke `\/plan-review` automatically/);
  const connections = planner.slice(planner.indexOf("<!-- AGENT-SKILL-CONNECTIONS:START -->"), planner.indexOf("<!-- AGENT-SKILL-CONNECTIONS:END -->"));
  assert.match(connections, /- `plan`/);
  assert.doesNotMatch(connections, /plan-review/, "planner must not preload the optional review contract");
});

// The retired standalone loop skill now lives as `changes-review --fix-loop`: the mode must keep every
// loop gate (scope + Goal Contract, convergence binding, round loop, convergence/escalation, fresh
// re-review, terminal docs-update) while the flagless default path keeps its own self-fix loop.
function assertChangesReviewFixLoop(text) {
  const frontmatter = text.slice(0, text.indexOf("\n---", 4));
  assert.match(frontmatter, /description: '[^'\n]*Flag: --fix-loop reviews, fixes and re-reviews until converged\.'/);
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("**Workflow:**"));
  assert.match(summary, /Optional `--fix-loop` mode \(standalone-only\) DECOUPLES find from fix/);
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  assert.match(closing, /`--fix-loop` mode \(optional, standalone-only; no flag → default unchanged\)/);
  const start = text.indexOf("## Mode: Fix-Loop (`--fix-loop`)");
  assert.ok(start >= 0, "changes-review must carry the Fix-Loop mode section");
  const mode = text.slice(start, text.indexOf("## Next Steps", start));
  for (const heading of ["Step 0 — Resolve Diff Scope + Goal Contract", "Step 0b — Bind the Convergence Loop", "Step 1 — Round Loop", "Step 2 — Convergence & Escalation Gate", "Step 3 — Terminal Docs-Update + Recap", "Convergence Detection — Why a Fresh Full Re-Review Is Required"]) {
    assert.ok(mode.includes(`### Fix-Loop ${heading}`), `missing Fix-Loop ${heading}`);
  }
  assert.match(mode, /SKIP Phase -1[^\n]*STOP before Phase 6 \/ Phase 7 \/ Phase 7\.5 \/ Phase 8/);
  assert.match(mode, /it never re-invokes this skill with `--fix-loop`/);
  assert.match(mode, /Resolve\/create the Goal Contract/);
  assert.match(mode, /`\/goal` command is an OPTIONAL accelerator/);
  assert.match(mode, /Run `\/why-review --validate-findings <report-path>` INLINE/);
  assert.match(mode, /Run `\/fix` on the validated blocking findings/);
  assert.match(mode, /\*\*in this order — the first matching row decides\*\*/);
  assert.match(mode, /\*\*ONE extension round is granted\*\*/);
  assert.match(mode, /\*\*Keep looping — NO round cap\.\*\*/);
  assert.match(mode, /\*\*CONVERGED on the severity floor\*\*/);
  assert.match(mode, /\*\*Increasing review blockers = STOP\.\*\*/);
  assert.match(mode, /run the \*\*Phase 8 protocol\*\* exactly once/);
  assert.match(mode, /never reuse a stale clean report/);
  // The flagless default keeps its coupled loop and only defers Phase -1 when the flag is set.
  assert.match(text, /\*\*SKIP\*\* when `--fix-loop` is set — Fix-Loop Step 0b owns the single convergence binding/);
  assert.match(text, /## Phase 7: Recursive Auto-Fix \+ Full Re-Review Loop/);
  assert.match(text, /SELF-FIX each validated finding that blocks the current round/);
}

test("changes-review --fix-loop carries the retired loop skill's gates without changing the default path", async () => {
  // The mode lives in references/fix-loop.md; the contract is SKILL.md + references.
  const text = (await readSkillContract("changes-review")).replace(/\r\n/g, "\n");
  assertChangesReviewFixLoop(text);
  for (const [before, after] of [
    ["### Fix-Loop Step 2 — Convergence & Escalation Gate", "### Fix-Loop Step 2 — Wrap Up"],
    ["Run `/why-review --validate-findings <report-path>` INLINE", "Optionally review the findings"],
    ["run the **Phase 8 protocol** exactly once", "skip docs"],
  ]) {
    const mutant = text.replaceAll(before, after);
    assert.notEqual(mutant, text, `mutation anchor exists: ${before}`);
    assert.throws(() => assertChangesReviewFixLoop(mutant), { code: "ERR_ASSERTION" });
  }
  // Built from parts so the repo-wide "no retired skill id" grep stays at zero hits.
  const retiredLoopSkill = ["changes", "review", "loop"].join("-");
  await assert.rejects(fs.access(path.join(repoRoot, ".claude", "skills", retiredLoopSkill)), "the retired loop skill directory must stay removed");
});

// Given the integration-test convergence loop is an OPTIONAL `--fix-loop` mode of integration-test-verify
// (not a separate skill), When its documentation and workflow wiring are read, Then the flag is advertised
// top and bottom, the mode is delimited, every loop gate survives (five-way Fault Verdict, owning-layer fix,
// per-round fix-diff review, Round Integrity, 2-consecutive-green exit, cap/escalation, Goal Contract binding),
// each round is the flagless default pass, and the retired skill id stays gone — so dropping a gate,
// recursing the flag, or re-introducing the standalone loop skill fails here.
// Built from parts so the repo-wide "no retired skill id" grep stays at zero hits.
const RETIRED_IT_LOOP_SKILL = ["integration", "test", "verify", "loop"].join("-");

// Sensor row N1 (P26 scratch run). A converted skill carries a shared protocol as a guide line (the
// shared P25 recognizer, never a copied line format) that the hook resolves to the projection file
// `<skills root>/shared/protocols/<tag>.md`; the guide counts only while that file exists and is
// non-empty. A skill with neither form still fails.
function carriesProtocolTag(text, tag, skillsDir = path.join(repoRoot, ".claude", "skills")) {
  if (text.includes(`<!-- SYNC:${tag} -->`)) return true;
  if (!guideCarrier.hasGuideEntry(text, tag)) return false;
  const projection = path.join(skillsDir, "shared", "protocols", `${tag}.md`);
  return existsSync(projection) && readFileSync(projection, "utf8").trim().length > 0;
}

test("integration-test-verify protocol carrier check accepts a guide entry backed by its projection (TC-PDL-065, N1)", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "n1-guide-"));
  try {
    // Given a skills root whose projection file holds the protocol, and a skill carrying only its guide line
    const tag = "goal-contract-satisfaction-loop";
    const skillsDir = path.join(tmp, "skills");
    const projection = path.join(skillsDir, "shared", "protocols", `${tag}.md`);
    await fs.mkdir(path.dirname(projection), { recursive: true });
    await fs.writeFile(projection, "> **Goal Contract** — fixture body.\n");
    const guided = [guideCarrier.GUIDE_BLOCK_START, "",
      guideCarrier.formatGuideLine({ tag, summary: "Save the goal", when: "executing work", path: `.claude/skills/shared/protocols/${tag}.md` }),
      "", guideCarrier.GUIDE_BLOCK_END].join("\n");
    // When the carrier check runs, Then the guide carrier passes and an inline body still passes
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), true);
    assert.equal(carriesProtocolTag(`<!-- SYNC:${tag} -->\n\nbody\n\n<!-- /SYNC:${tag} -->`, tag, skillsDir), true);
    // When the guide is removed too (both forms missing), Then it fails
    assert.equal(carriesProtocolTag("# Skill\n", tag, skillsDir), false);
    // When the projection file is empty or missing, Then the guide alone fails
    await fs.writeFile(projection, "  \n");
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), false);
    await fs.rm(projection);
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

function assertIntegrationTestVerifyFixLoop(text) {
  assert.equal(text.split("<!-- FIX-LOOP-MODE:START -->").length - 1, 1, "exactly one delimited --fix-loop mode opener");
  assert.equal(text.split("<!-- FIX-LOOP-MODE:END -->").length - 1, 1, "exactly one delimited --fix-loop mode closer");
  const mode = text.match(/<!-- FIX-LOOP-MODE:START -->([\s\S]*?)<!-- FIX-LOOP-MODE:END -->/)?.[1] ?? "";
  assert.match(mode, /^\s*## Mode: `--fix-loop`/, "the delimited block is the --fix-loop mode section");
  const frontmatter = text.slice(0, text.indexOf("\n---", 4));
  assert.match(frontmatter, /^version: 1\.1\.0$/m);
  assert.match(frontmatter, /^description: '[^'\n]*Flag: --fix-loop[^'\n]*'$/m, "frontmatter description advertises the flag");
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("## First Principle"));
  assert.match(summary, /\*\*`--fix-loop` \(OPTIONAL mode flag — absent by default, and absence changes nothing in this skill\):\*\*/);
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  assert.match(closing, /\*\*IMPORTANT MUST ATTENTION `--fix-loop` \(OPTIONAL mode — only when the flag is passed\):\*\*/);
  // Scope gate + no recursion: each round is this skill's own default pass, never the flag again.
  assert.match(mode, /Without the flag, skip this whole section/);
  assert.match(mode, /\*\*MUST ATTENTION NEVER self-invoke with the flag\.\*\* Each round's verification is THIS skill's default pass \(Steps 1–5\) WITHOUT `--fix-loop`/);
  assert.match(mode, /Inside a round the default pass REPORTS; it does not fix\./);
  for (const heading of ["FL-0 — Resolve Verification Scope + Goal Contract", "FL-0b — Bind the Convergence Loop", "FL-1 — Round Loop", "FL-2 — Convergence & Escalation Gate", "FL-3 — Terminal Spec/Doc Sync + Recap", "Fix-Loop Convergence Detection — Why Five Conditions"]) {
    assert.ok(mode.includes(`### ${heading}`), `missing ${heading}`);
  }
  // Scope, Goal Contract, and convergence binding.
  assert.match(mode, /Resolve `\{scope\}` — WHOLE SYSTEM by default/);
  assert.match(mode, /Resolve\/create the Goal Contract/);
  assert.match(mode, /\*\*1\. Protocol loop — ALWAYS binding \(hook\/command-independent\)\.\*\*/);
  assert.match(mode, /\/goal accelerator unavailable — loop bound by protocol/);
  // Adjudication: the five-way verdict taxonomy, written before any edit.
  assert.match(mode, /Combine \(a\) \+ \(b\) into ONE written Fault Verdict per failure, BEFORE any edit/);
  for (const verdict of ["TEST-WRONG", "TEST-NOT-OPTIMAL", "SOURCE-WRONG", "ENVIRONMENT-BLOCKED", "AMBIGUOUS"]) {
    assert.match(mode, new RegExp(`\\| \\*\\*${verdict}\\*\\*\\s+\\|`), `verdict row ${verdict}`);
  }
  assert.match(mode, /`\/integration-test-review` — REPORT-ONLY/);
  assert.match(mode, /Fix the source at the \*\*lowest owning layer\*\*/);
  assert.match(mode, /CONDITIONAL — run `\/changes-review` on the round's fix diff only when ANY fix landed/);
  assert.match(mode, /Round Integrity Check \(no fake green\) — BLOCKING/);
  // Exit and escalation.
  assert.match(mode, /reported \*\*zero failures across 2 consecutive runs without a DB reset\*\*, AND the Round Integrity Check passed/);
  assert.match(mode, /Round cap `N` hit with failures still open/);
  assert.match(mode, /\*\*Increasing failures = STOP\.\*\*/);
  // Shared protocols referenced, not re-copied, and carried once in the skill body.
  assert.match(mode, /are carried once below; never re-copy them into this section/);
  assert.doesNotMatch(mode, /<!-- SYNC:/, "mode section references shared protocols instead of duplicating SYNC blocks");
  for (const tag of ["goal-contract-satisfaction-loop", "trade-off-interrogation-gate", "test-failure-fault-adjudication", "integration-test-execution-discipline"]) {
    assert.ok(carriesProtocolTag(text, tag), `carries SYNC:${tag} (inline body, or a guide entry backed by its projection file)`);
  }
  assert.ok(!text.includes(RETIRED_IT_LOOP_SKILL), "no reference to the retired standalone loop skill");
}

test("integration-test-verify --fix-loop carries the retired loop skill's gates without changing the default path", async () => {
  const text = (await read(".claude/skills/integration-test-verify/SKILL.md")).replace(/\r\n/g, "\n");
  assertIntegrationTestVerifyFixLoop(text);
  // The flagless default path keeps its own snapshot contract.
  assert.match(text, /\*\*Filter:\*\* Run only projects relevant to the current change, unless the user explicitly asks for all\./);
  assert.match(text, /6\. \*\*RECOMMEND `\/workflow-integration-test-green` whenever this run ends with ANY failure\.\*\*/);
  for (const [before, after] of [
    ["**MUST ATTENTION NEVER self-invoke with the flag.** Each round's verification is THIS skill's default pass (Steps 1–5) WITHOUT `--fix-loop`", "**Re-invoke with the flag each round.**"],
    ["Round Integrity Check (no fake green) — BLOCKING", "Round Integrity Check (advisory)"],
    ["| **AMBIGUOUS**           |", "| **UNCLEAR**             |"],
    ["**Increasing failures = STOP.**", "**Increasing failures = continue.**"],
    ["<!-- FIX-LOOP-MODE:END -->", ""],
  ]) {
    const mutant = text.replaceAll(before, after);
    assert.notEqual(mutant, text, `mutation anchor exists: ${before}`);
    assert.throws(() => assertIntegrationTestVerifyFixLoop(mutant), { code: "ERR_ASSERTION" });
  }
  assert.throws(() => assertIntegrationTestVerifyFixLoop(`${text}\nSee /${RETIRED_IT_LOOP_SKILL}.`), { code: "ERR_ASSERTION" });
  await assert.rejects(fs.access(path.join(repoRoot, ".claude", "skills", RETIRED_IT_LOOP_SKILL)), "the retired loop skill directory must stay removed");
  // The green workflow drives the loop through the flag on the surviving skill.
  const workflows = JSON.parse(await read(".claude/workflows.json")).workflows;
  const sequence = workflows["workflow-integration-test-green"].sequence;
  assert.equal(typeof sequence[1] === "string" ? sequence[1] : [sequence[1].skill, sequence[1].args].filter(Boolean).join(" "), "integration-test-verify --fix-loop");
  assert.ok(!JSON.stringify(workflows).includes(RETIRED_IT_LOOP_SKILL), "workflows.json must not name the retired loop skill");
});
