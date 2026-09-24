import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// PARITY GUARD (one protocol owner): `SYNC:project-reference-docs-guide` is authored once in
// `.claude/skills/shared/sync-inline-versions.md`. Skill and agent carriers hold it byte-for-byte
// (project-reference-gate-coverage.test.cjs TC-PRG-002/003). Two further copies are HAND-WRITTEN
// PROJECTIONS, not bodies, so byte equality is the wrong oracle for them:
//
//   - the Codex root gate — `PROJECT_REFERENCE_GATE_BODY_LINES` in sync-context-workflows.mjs,
//     projected into AGENTS.md and .codex/CODEX_CONTEXT.md (compact, `$skill` syntax);
//   - the root-context template — the `## Project Reference Loading` section of
//     ai-context-refresh/references/claude-md-template.md (a prose paragraph plus a task table).
//
// "Consistent" therefore means: each projection preserves the canonical gate's DECISION
// invariants, read FROM the canonical block so a canonical edit breaks this test instead of
// silently diverging across hosts:
//   1. phases  — the copy routes every phase row of the canonical routing table;
//   2. docs    — every doc a canonical phase row names is named by the copy, or covered by an
//                alias this file declares for that copy (a deliberate compaction, reviewed here);
//                and every doc the copy names exists in the canonical gate or is a declared extra;
//   3. dedup   — own full read, after the last compaction, within the canonical token window,
//                unchanged since, cited `(loaded)`; hook reminders and summaries never count;
//   4. re-read — after compaction, resume, or a context change; sub-agents start empty and get
//                the resolved doc paths; the `Reference docs read: … | Not applicable: …` citation;
//   5. config  — a missing project config is a supported state (canonical step 2), never a reason
//                to block work on setup.
// The copies are read, never rendered or edited: the generator self-runs on import, so its array
// is lifted from source and evaluated in a sandbox (as extract-sync-block-twin-parity.test.mjs does).

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const { extractSyncBody } = require(path.join(repoRoot, ".claude", "scripts", "lib", "extract-sync-block.cjs"));

const read = relativePath => fs.readFileSync(path.join(repoRoot, ...relativePath.split("/")), "utf8").replace(/\r\n/g, "\n");
const CANONICAL_MD = read(".claude/skills/shared/sync-inline-versions.md");
const GATE = extractSyncBody(CANONICAL_MD, "project-reference-docs-guide");
const REMINDER = extractSyncBody(CANONICAL_MD, "project-reference-docs-guide:reminder");

/** Lift `PROJECT_REFERENCE_GATE_BODY_LINES` from the generator source and evaluate it in isolation. */
function codexGateText() {
  const source = read(".claude/scripts/codex/sync-context-workflows.mjs");
  const literal = source.match(/const PROJECT_REFERENCE_GATE_BODY_LINES = (\[[\s\S]*?\n\]);/);
  assert.ok(literal, "PROJECT_REFERENCE_GATE_BODY_LINES not found — has the Codex gate moved?");
  const ctx = { result: null };
  vm.createContext(ctx);
  vm.runInContext(`result = ${literal[1]};`, ctx);
  assert.ok(Array.isArray(ctx.result) && ctx.result.length > 0, "the Codex gate body must be a non-empty line array");
  return ctx.result.join("\n");
}

/** The template's `## Project Reference Loading` section, up to the next `## ` heading. */
function templateGateText() {
  const template = read(".claude/skills/ai-context-refresh/references/claude-md-template.md");
  const section = template.match(/^## Project Reference Loading\n([\s\S]*?)(?=^## )/m);
  assert.ok(section, "the template's `## Project Reference Loading` section was not found");
  return section[1];
}

/** Canonical phase rows keyed by phase: `{ plan|edit|test|spec|review: string[] docs }`. */
function canonicalPhaseRows() {
  // First match wins, most specific cue first: the spec row also mentions "test cases" and the
  // review row also mentions "plan", so a row is keyed by its leading verb or its own noun.
  const PHASE_OF = [
    ["review", /^review\b/],
    ["edit", /^edit\b/],
    ["spec", /\bspecs\b/],
    ["test", /\btests?\b/],
    ["plan", /\bplan\b/],
  ];
  const rows = GATE.split("\n")
    .map(line => line.replace(/^>\s?/, ""))
    .filter(line => line.startsWith("| ") && !/^\| (About to|---)/.test(line));
  const phases = {};
  for (const row of rows) {
    const [label, docsCell] = row.split(" | ").map(cell => cell.replace(/^\|\s*|\s*\|$/g, ""));
    const key = PHASE_OF.find(([, cue]) => cue.test(label))?.[0];
    assert.ok(key && !phases[key], `canonical phase row "${label}" maps to no phase or to a duplicate — extend the projection contract`);
    phases[key] = [...(docsCell || "").matchAll(/`([^`]+\.md)`/g)].map(m => m[1]);
  }
  assert.deepEqual(Object.keys(phases).sort(), ["edit", "plan", "review", "spec", "test"], "canonical routes exactly five phases");
  return phases;
}

const COPIES = [
  {
    name: "Codex gate (sync-context-workflows.mjs PROJECT_REFERENCE_GATE_BODY_LINES)",
    text: codexGateText(),
    phaseCues: {
      plan: /plan\/investigate\/design →/,
      edit: /edit code →/,
      test: /tests or test data →/,
      spec: /specs or docs →/,
      review: /review →/,
    },
    // Compactions: pattern docs are named by role, test references by kind.
    docAliases: {
      "backend-patterns-reference.md": /backend or frontend pattern doc/,
      "frontend-patterns-reference.md": /backend or frontend pattern doc/,
      "integration-test-reference.md": /matching integration, E2E, or seed-test-data reference/,
      "e2e-test-reference.md": /matching integration, E2E, or seed-test-data reference/,
      "seed-test-data-reference.md": /matching integration, E2E, or seed-test-data reference/,
    },
    perFileConventions: /file-conventions\.cjs --lookup/,
  },
  {
    name: "CLAUDE.md template (claude-md-template.md ## Project Reference Loading)",
    text: templateGateText(),
    phaseCues: {
      plan: /^\| Plan, investigate, design/m,
      edit: /^\| Edit or write code/m,
      test: /^\| Integration \/ E2E tests \/ test data/m,
      spec: /^\| Specs, TC authoring/m,
      review: /^\| Review\/audit/m,
    },
    // Compaction: UI docs are named as the project-selected frontend set.
    docAliases: {
      "frontend-patterns-reference.md": /frontend patterns, styling, and design-system docs/,
      "scss-styling-guide.md": /frontend patterns, styling, and design-system docs/,
      "design-system/README.md": /frontend patterns, styling, and design-system docs/,
    },
    // Per-file conventions reach the root through the generated Automatic Skill Activation
    // section (its lookup command is rendered by section-builders.cjs), so the paragraph names
    // the context-group routing rather than the command.
    perFileConventions: /context-group/,
  },
];

// Docs a copy may name beyond the canonical gate text, with the canonical concept they stand for.
const DECLARED_EXTRA_DOCS = new Map([
  ["docs-index-reference.md", "canonical step 3 always-on \"docs-index inputs\""],
  ["CLAUDE.md", "canonical step 2 \"root instruction files\" in the setup route"],
  ["AGENTS.md", "canonical step 2 \"root instruction files\" in the setup route"],
]);

test("canonical gate exposes every invariant the projections are checked against", () => {
  // Given the canonical gate and reminder bodies.
  // When the projection contract reads its invariants from them.
  // Then each invariant still exists — a canonical rewrite that drops one must revisit this contract.
  assert.ok(GATE && REMINDER, "canonical SYNC:project-reference-docs-guide block and reminder must exist");
  for (const clause of [/after the last compaction/, /has not changed since/, /your own read/, /full content/, /hook reminder/, /a summary/, /\(loaded\)/,
    /compaction, resume, a material context change/, /delegated sub-agent starts empty/, /resolved doc paths in its brief/,
    /Reference docs read: \.\.\. \| Not applicable: \.\.\./, /Project config is OPTIONAL/, /never block/, /file-conventions\.cjs --lookup/]) {
    assert.match(GATE, clause, `canonical gate no longer states ${clause}`);
  }
  assert.match(GATE, /Dedup within ~\d+K tokens/, "canonical gate must state its dedup window");
  canonicalPhaseRows();
});

for (const copy of COPIES) {
  test(`${copy.name} routes every canonical phase to the canonical docs`, () => {
    // Given the canonical phase routing table and the copy's declared compactions.
    const phases = canonicalPhaseRows();
    // When each canonical phase and each doc it routes is looked up in the copy.
    // Then the phase is routed and every doc is named literally or through a declared alias.
    for (const [phase, docs] of Object.entries(phases)) {
      assert.match(copy.text, copy.phaseCues[phase], `${copy.name}: canonical phase "${phase}" is not routed`);
      for (const doc of docs) {
        const alias = copy.docAliases[doc];
        assert.ok(copy.text.includes(`\`${doc}\``) || (alias && alias.test(copy.text)),
          `${copy.name}: canonical ${phase}-phase doc ${doc} is neither named nor covered by a declared alias`);
      }
    }
    assert.match(copy.text, copy.perFileConventions, `${copy.name}: per-file contextGroups conventions are not routed`);
  });

  test(`${copy.name} names no doc the canonical gate does not route`, () => {
    // Given every backticked markdown document the copy names.
    const named = [...copy.text.matchAll(/`([^`\s]+\.md)`/g)].map(m => m[1].split("/").slice(-2).join("/"));
    // When each is looked up in the canonical gate + reminder.
    // Then it is routed there, or it is a declared extra standing for a canonical concept.
    for (const doc of named) {
      const base = doc.includes("design-system/") ? doc : doc.split("/").pop();
      assert.ok(GATE.includes(base) || REMINDER.includes(base) || DECLARED_EXTRA_DOCS.has(base),
        `${copy.name}: routes ${base}, which the canonical gate does not name — add it to the canonical block or declare it here`);
    }
  });

  test(`${copy.name} states the canonical dedup, re-read, sub-agent and citation rules`, () => {
    // Given the canonical dedup window.
    const windowTokens = GATE.match(/Dedup within ~(\d+)K tokens/)[1];
    // When the copy's text is checked for each rule the canonical gate states.
    // Then every clause is present, with the same token window.
    const clauses = [
      [new RegExp(`${windowTokens}K tokens`), "the same dedup token window"],
      [/your own read/, "own-read proof"],
      [/full content/, "full-content proof"],
      [/after the last compaction/, "the compaction boundary"],
      [/has not changed since/, "the unchanged-since condition"],
      [/\(loaded\)/, "the `(loaded)` citation"],
      [/hook reminder/, "hook reminders never count"],
      [/a summary/, "summaries never count"],
      [/compaction, resume, a context change/i, "re-read after compaction, resume, or a context change"],
      [/delegated sub-agent starts empty/, "sub-agents start empty"],
      [/resolved doc paths in its brief/, "resolved doc paths go in the brief"],
      [/Reference docs read: \.\.\. \| Not applicable: \.\.\./, "the citation line"],
      [/lessons\.md/, "the always-on lessons input"],
      [/docs-index/, "the always-on docs-index input"],
    ];
    for (const [pattern, rule] of clauses) assert.match(copy.text, pattern, `${copy.name}: missing ${rule}`);
  });

  // Canonical step 2 makes project config OPTIONAL — absent config means portable defaults, never
  // block, offer setup at most once. Each projection must say so and must not list a missing config
  // among the triggers that route to a setup run before ordinary work (a MALFORMED declared section
  // still does).
  test(`${copy.name} treats a missing project config as supported, not a setup blocker`, () => {
    // Given the canonical rule that a missing project config never blocks work.
    assert.match(GATE, /Absent is a supported state, not an error/);
    // When the copy's setup-route clause is read.
    const setupClause = copy.text.split("\n").find(line => /missing or stale/.test(line)) || "";
    // Then it states a missing config is supported and routes only a malformed config to setup.
    assert.match(setupClause, /missing (`docs\/)?project(-config\.json`| config) is supported/, `${copy.name}: no supported-missing-config statement`);
    const [condition = ""] = setupClause
      .replace(/^.*?is supported[^.]*\.\s*/, "")
      .replace(/declared config section is malformed/, "")
      .split(/missing or stale/);
    assert.ok(!/project-config\.json|\bconfig\b/.test(condition), `${copy.name}: a missing project config is still a setup trigger — "${setupClause.slice(0, 200)}…"`);
  });
}
