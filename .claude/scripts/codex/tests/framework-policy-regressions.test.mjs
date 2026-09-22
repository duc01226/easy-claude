import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const { getDocsRoot } = require("../../../hooks/lib/project-config-loader.cjs");

async function read(rel) {
  return fs.readFile(path.join(repoRoot, ...rel.split("/")), "utf8");
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

test("plan metadata is coherent and reference preflight precedes dispatch (CR-092, CR-093)", async () => {
  const [plan, organization, review] = await Promise.all([
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/skills/plan/references/engine-plan-organization.md"),
    read(".claude/skills/plan-review/SKILL.md"),
  ]);
  assert.ok(plan.indexOf("Project-reference preflight — BEFORE dispatch") < plan.indexOf("Research wave — ONE message"));
  for (const content of [plan, organization, review]) {
    assert.match(content, /Mode, Wave, write set, and SEQ dependency/i);
  }
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

test("review convergence uses one blocking predicate and byte-identical low-only exit (CR-017, CR-018)", async () => {
  const [canonical, loop] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    // The outer zero-fix loop is workflow-review-changes' optional `--fix-loop` mode.
    read(".claude/skills/workflow-review-changes/SKILL.md"),
  ]);
  assert.match(canonical, /blocking_findings\(round, findings\)/);
  assert.match(canonical, /binary gate/i);
  assert.match(loop, /ALL LOW/i);
  assert.match(loop, /byte-identical/i);
  assert.match(loop, /changed fingerprint.*re-review/i);

  const reviewCarriers = [
    ".claude/agents/architect.md",
    ".claude/agents/code-reviewer.md",
    ".claude/agents/integration-tester.md",
    ".claude/agents/planner.md",
    ".claude/agents/security-auditor.md",
    ".claude/agents/spec-compliance-reviewer.md",
    ".claude/agents/ui-ux-designer.md",
    ".claude/skills/architecture-review-full/SKILL.md",
    ".claude/skills/architecture-review/SKILL.md",
    ".claude/skills/artifact-review/SKILL.md",
    ".claude/skills/changes-review/SKILL.md",
    ".claude/skills/code-review/SKILL.md",
    ".claude/skills/domain-entities-review/SKILL.md",
    ".claude/skills/integration-test-review/SKILL.md",
    ".claude/skills/knowledge-review/SKILL.md",
    ".claude/skills/performance-review/SKILL.md",
    ".claude/skills/plan-review/SKILL.md",
    ".claude/skills/production-readiness-review/SKILL.md",
    ".claude/skills/security-review/SKILL.md",
    ".claude/skills/ui-review/SKILL.md",
    ".claude/skills/why-review/SKILL.md",
  ];
  for (const rel of reviewCarriers) {
    const content = await read(rel);
    assert.match(content, /blocking_findings\(round, findings\)/, rel);
    assert.doesNotMatch(content, /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
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
      workflows[id].sequence.includes("workflow-review-changes"),
      `${id} must delegate the terminal domain-entity refresh to workflow-review-changes`
    );
  }
});

test("plan-review runs an unconditional why-review sub-agent in every review wave, primacy and recency", async () => {
  const [review, whyReview, plan] = await Promise.all([
    read(".claude/skills/plan-review/SKILL.md"),
    read(".claude/skills/why-review/SKILL.md"),
    read(".claude/skills/plan/SKILL.md"),
  ]);
  const text = review.replace(/\r\n/g, "\n");
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("## Impact-Aware Quality Review"));
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  const wave = text.slice(text.indexOf("## Parallel Review Wave"), text.indexOf("## Conditional Project Pattern Alignment"));
  // Primacy + recency: the always-in-the-wave rule must survive at both ends of the long skill.
  for (const [where, section] of [["Quick Summary", summary], ["Closing Reminders", closing]]) {
    assert.match(section, /UNCONDITIONAL full-mode `\/why-review` rationale sub-agent/, `${where} must state the unconditional why-review member`);
  }
  // Wave contract: one message, all-return barrier, merge before verdict, never N/A, every round.
  assert.ok(wave.length > 0, "plan-review must carry the Parallel Review Wave section");
  assert.match(wave, /round 1 AND every round N≥2/);
  assert.match(wave, /Spawn every sub-agent member in ONE message/);
  assert.match(wave, /All-return barrier/);
  assert.match(wave, /never a silent PASS/);
  assert.match(wave, /UNANSWERED/);
  assert.match(wave, /host\/sub-agent fan-out unavailable → inline fallback/);
  assert.match(wave, /tmp\/reports\/plan-review-why-review-round\{N\}-\{date\}\.md/);
  // Round N≥2 re-review dispatches a NEW why-review member beside the fresh core sub-agent.
  assert.match(text, /In the SAME message\*\*, spawn a NEW `\/why-review` rationale sub-agent/);
  // Validate-findings stays the separate post-merge gate.
  assert.match(text, /`\/why-review --validate-findings` over the MERGED report/);
  assert.doesNotMatch(text, /rationale\* lens applied DURING the review pass/);
  // Callers and the plan skill agree: no duplicate standalone why-review task after plan-review.
  assert.match(whyReview, /`\/plan-review`'s Parallel Review Wave spawns it on EVERY review round/);
  assert.doesNotMatch(plan, /Run \/why-review \(standalone only\)|`\/plan-review` → standalone `\/why-review`/);
});

// plan-review's review→fix→re-review loop is capped at 2 rounds HARD: round 1 is the initial review,
// round 2 is the single re-review after fixes, and round 2 still blocking escalates to the owner.
// plan-review states this in an OVERRIDE:double-round-trip-review block (the sanctioned carrier-local
// pattern ui-review/architecture-review use for fresh-context-review) rather than the shared SYNC
// body, whose canonical text grants one conditional extension round for the carriers that DO grant
// it. An OVERRIDE carrier is deliberately NOT a SYNC carrier, so this test pins both halves: the
// SYNC fence must be gone, the OVERRIDE fence must own the text, and nothing may re-grant a round 3.
test("plan-review caps its review loop at 2 rounds with no extension round", async () => {
  const [review, planSkill, planner] = await Promise.all([
    read(".claude/skills/plan-review/SKILL.md"),
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/agents/planner.md"),
  ]);
  const text = review.replace(/\r\n/g, "\n");
  const frontmatter = text.slice(0, text.indexOf("\n---", 4));
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("## Impact-Aware Quality Review"));
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  // Strip every SYNC body: the shared protocols still describe the extension for their other
  // carriers, so only plan-review's own prose — its OVERRIDE blocks included — counts as its budget.
  const localText = text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, "");

  // The catalog line callers read before loading the skill states the bound.
  assert.match(frontmatter, /bounded at 2 rounds MAX, no extension/);
  assert.doesNotMatch(frontmatter, /recursive until the severity exit bar clears/);

  // Primacy + recency: the hard cap must survive at both ends of the long skill.
  for (const [where, section] of [["Quick Summary", summary], ["Closing Reminders", closing]]) {
    assert.match(section, /NEVER a round 3/i, `${where} must rule out a third round`);
    assert.match(section, /NO extension/i, `${where} must state the cap has no extension`);
    assert.match(section, /AskUserQuestion/, `${where} must route a still-blocked round 2 to the user`);
  }

  // The loop protocol is carrier-local: the SYNC fence is gone and the OVERRIDE fence owns the text.
  // Both blocks convert together — leaving the `:reminder` on canonical would restore the extension
  // in the recency position, which is exactly where a long skill is most likely to be obeyed.
  for (const tag of ["double-round-trip-review", "double-round-trip-review:reminder"]) {
    assert.doesNotMatch(text, new RegExp(`<!-- SYNC:${tag} -->`), `plan-review must not carry SYNC:${tag}`);
    assert.match(text, new RegExp(`<!-- OVERRIDE:${tag} -->`), `plan-review must carry OVERRIDE:${tag}`);
    assert.match(text, new RegExp(`<!-- /OVERRIDE:${tag} -->`), `plan-review must close OVERRIDE:${tag}`);
  }
  const override = text.slice(
    text.indexOf("<!-- OVERRIDE:double-round-trip-review -->"),
    text.indexOf("<!-- /OVERRIDE:double-round-trip-review -->"),
  );
  assert.match(override, /Round cap — 2 rounds MAX, HARD, NO extension/);
  assert.match(override, /round 2 is the LAST review round/);
  assert.match(override, /for review blockers there is NEVER a round 3/);
  // The cap must never force green: a failing test gate stays outside the budget.
  assert.match(override, /A failing TEST gate → NO round cap, at any round/);
  assert.match(override, /NEVER weaken an assertion, add a skip, or relax a timeout to force green/);

  // Nothing in plan-review's own prose may re-grant a third review round.
  const GRANTING = [
    /grants exactly one extra round/i,
    /\+1 extension round/i,
    /2-round ceiling/i,
    /extendable ONCE to round 3/i,
    /extension round is granted/i,
  ];
  // ONE oracle, applied to the real source AND to every mutant below. Routing mutants through THIS
  // function is what makes the guard non-vacuous: drop a pattern from GRANTING and the mutant it
  // existed to catch survives, failing the matching `assert.throws`. The earlier form asserted a
  // single bare regex against a string built by inserting that regex's own text, so it could not go
  // red and proved nothing about the loop it claimed to exercise.
  const assertNoExtensionGrant = (text) => {
    for (const granting of GRANTING) {
      assert.doesNotMatch(text, granting, `plan-review local prose must not grant an extension: ${granting}`);
    }
  };

  assertNoExtensionGrant(localText);

  // Every granting clause is probed, not just the one that happened to be written here — so the
  // guard covers the whole list rather than a single representative of it.
  for (const clause of ["grants exactly one extra round", "+1 extension round", "extendable ONCE to round 3", "extension round is granted"]) {
    const mutant = localText.replace("HARD, NO extension", clause);
    assert.notEqual(mutant, localText, `mutation anchor exists for: ${clause}`);
    assert.throws(() => assertNoExtensionGrant(mutant), { code: "ERR_ASSERTION" });
  }

  // The siblings that DO grant the extension keep it — this narrowing is plan-review-only.
  const siblings = await Promise.all(
    ["why-review", "changes-review", "workflow-review-changes"].map(n => read(`.claude/skills/${n}/SKILL.md`)),
  );
  for (const sibling of siblings) {
    assert.match(sibling, /extendable ONCE to round 3/, "sibling loop skills keep the canonical extension");
  }

  // Callers describing plan-review's budget agree with it. Strip their SYNC bodies too: the shared
  // convergence-loop block legitimately describes the extension for the carriers that DO grant it,
  // so only a caller's OWN prose counts as a claim about plan-review.
  for (const [name, source] of [["plan", planSkill], ["planner", planner]]) {
    const callerLocal = source.replace(/\r\n/g, "\n").replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, "");
    assert.doesNotMatch(callerLocal, /\+1 extension round|2-round ceiling/, `${name} must not promise plan-review an extension round`);
  }
  assert.match(planSkill, /HARD 2-round cap/);
  assert.match(planner, /HARD cap 2 rounds with NO extension/);
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
  const text = (await read(".claude/skills/changes-review/SKILL.md")).replace(/\r\n/g, "\n");
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
    assert.ok(text.includes(`<!-- SYNC:${tag} -->`), `carries SYNC:${tag}`);
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
  assert.equal(sequence[1], "integration-test-verify --fix-loop");
  assert.ok(!JSON.stringify(workflows).includes(RETIRED_IT_LOOP_SKILL), "workflows.json must not name the retired loop skill");
});
