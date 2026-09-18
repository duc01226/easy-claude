import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const {
  buildWorkflowSkillsCatalog,
  renderWorkflowsSection,
  condenseWhenToUse,
  baseSkill,
  resolvedModeSequences,
  CK_SKILLS_START,
  CK_SKILLS_END,
} = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));

// Working-tree line endings belong to the git checkout (`core.autocrlf=true` materializes the
// LF-in-index sources as CRLF on Windows), never to the content — the builder always emits LF.
// Normalize every file read so these assertions compare CATALOG CONTENT and cannot fail purely
// because of the platform that checked the repo out.
const normalizeEol = (text) => text.replace(/\r\n/g, "\n");

const workflowsDoc = JSON.parse(
  fs.readFileSync(path.join(repoRoot, ".claude", "workflows.json"), "utf8")
);

// TC-WSC-001 — all workflows present
test("TC-WSC-001 lists every workflow from workflows.json", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  const expected = Object.keys(workflowsDoc.workflows).length;
  assert.match(out, new RegExp(`### Workflows Index \\(${expected}\\)`));
  for (const id of Object.keys(workflowsDoc.workflows)) {
    assert.ok(out.includes(`\`${id}\``), `missing workflow row: ${id}`);
  }
});

// TC-WSC-001b — every declared variant is rendered from the same resolved manifest producer used
// by activation; explicit occurrence objects must never leak as `[object Object]`.
test("TC-WSC-001b renders every workflow mode and resolved occurrence sequence", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  assert.ok(!out.includes("[object Object]"), "catalog must render occurrence commands, not objects");
  for (const [workflowId, workflow] of Object.entries(workflowsDoc.workflows)) {
    const row = out.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    assert.ok(row, `missing workflow row: ${workflowId}`);
    for (const { mode, sequence } of resolvedModeSequences(repoRoot, workflowId, workflow)) {
      if (workflow.variants) assert.ok(row.includes(`${mode}:`), `missing mode label ${workflowId}/${mode}`);
      for (const step of sequence) assert.ok(row.includes(step), `missing resolved step ${workflowId}/${mode}: ${step}`);
    }
  }
});

// TC-WSC-002 — every distinct step-skill has a non-empty description
test("TC-WSC-002 lists every distinct step-skill with a non-empty description", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["skills"] });
  const distinct = new Set();
  for (const wf of Object.values(workflowsDoc.workflows)) {
    const sequences = wf.variants
      ? Object.values(wf.variants).flatMap((variant) => variant.sequence || [])
      : wf.sequence || [];
    for (const step of sequences) {
      const token = typeof step === "string" ? step : `${step.skill} ${step.args || ""}`;
      distinct.add(baseSkill(token));
    }
  }
  assert.match(out, new RegExp(`### Workflow Skills \\(${distinct.size} composable steps\\)`));
  for (const skill of distinct) {
    const row = out
      .split("\n")
      .find((l) => l.startsWith(`| \`${skill}\` |`));
    assert.ok(row, `missing skill row: ${skill}`);
    const desc = row.split("|")[2].trim();
    assert.ok(desc.length > 0, `empty description for skill: ${skill}`);
  }
});

// TC-WSC-003 — deterministic
test("TC-WSC-003 output is deterministic", () => {
  const a = buildWorkflowSkillsCatalog({ rootDir: repoRoot });
  const b = buildWorkflowSkillsCatalog({ rootDir: repoRoot });
  assert.equal(a, b);
});

// TC-WSC-004 — condenseWhenToUse matches the Codex extractKeywords behavior
// (ported twin). Re-derive the reference inline so the test is self-contained.
test("TC-WSC-004 condenseWhenToUse parity for all workflow whenToUse strings", () => {
  function referenceExtract(whenToUse, { maxClauses = 3, wordsPerClause = 6, maxLen = 130 } = {}) {
    if (!whenToUse || typeof whenToUse !== "string") return "";
    const clauses = whenToUse
      .split(/[,;]/)
      .map((c) => c.trim().toLowerCase())
      .map((c) =>
        c.replace(
          /^(?:user (?:wants to|reports|has)|wants to|po(?:\/| or )ba wants to|generate|create|after)\s+/i,
          ""
        )
      )
      .map((c) => c.split(/\s+/).slice(0, wordsPerClause).join(" "))
      .filter((c) => c.length > 2);
    const picked = [];
    const seen = new Set();
    for (const clause of clauses) {
      if (seen.has(clause)) continue;
      seen.add(clause);
      picked.push(clause);
      if (picked.length >= maxClauses) break;
    }
    let out = picked.join(", ");
    if (out.length > maxLen) out = `${out.slice(0, maxLen).replace(/[\s,]+\S*$/, "")}…`;
    return out.replace(/\|/g, "\\|");
  }
  for (const wf of Object.values(workflowsDoc.workflows)) {
    assert.equal(condenseWhenToUse(wf.whenToUse), referenceExtract(wf.whenToUse));
  }
});

// TC-WSC-005 — graceful fallback for a sequence step with no SKILL.md dir
test("TC-WSC-005 falls back (no throw) for a step-skill with no SKILL.md", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-fallback-"));
  fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".claude", "workflows.json"),
    JSON.stringify({
      workflows: {
        "workflow-x": {
          name: "X",
          whenToUse: "test",
          sequence: ["ghost-step", "missing-step"],
          preActions: { injectContext: "Use the selected workflow context." },
        },
      },
    })
  );
  let out;
  assert.doesNotThrow(() => {
    out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["skills"] });
  });
  // Steps with no SKILL.md dir fall back to a single generic label.
  assert.ok(out.includes("| `ghost-step` | (workflow step) |"));
  assert.ok(out.includes("| `missing-step` | (workflow step) |"));
});

// TC-WSC-006 — quoted frontmatter scalars are DECODED, not merely de-wrapped.
//
// The regression: unquote() stripped the quote wrapper but left the escaping that wrapper implies,
// so a single-quoted description carrying an apostrophe (`'a bug''s root cause'` — the YAML encoding
// every normalization pass emits) rendered the literal artifact `bug''s` into the catalog, and from
// there into CLAUDE.md, AGENTS.md and every Codex mirror. Three real skill descriptions shipped that
// way. Nothing downstream could catch it: the mirrors are byte-compared against each other, so an
// artifact present in ALL of them is perfectly consistent and perfectly wrong.
//
// Driven through the public builder rather than the private unquote(), so the test pins the OUTPUT
// contract and survives the helper being renamed or extracted to a shared module.
test("TC-WSC-006 decodes quoted frontmatter scalars instead of leaking their escapes", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-unquote-"));
  const skillsDir = path.join(tmp, ".claude", "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".claude", "workflows.json"),
    JSON.stringify({
      workflows: {
        "workflow-x": {
          name: "X",
          whenToUse: "test",
          sequence: ["sq-skill", "dq-skill", "bare-skill"],
          preActions: { injectContext: "Use the selected workflow context." },
        },
      },
    })
  );
  const writeSkill = (name, descriptionLine) => {
    fs.mkdirSync(path.join(skillsDir, name), { recursive: true });
    fs.writeFileSync(
      path.join(skillsDir, name, "SKILL.md"),
      `---\nname: ${name}\ndescription: ${descriptionLine}\n---\n\nbody\n`
    );
  };
  // Single-quoted: `''` is the ONLY escape YAML defines for this style.
  writeSkill("sq-skill", "'Use when investigating a bug''s root cause'");
  // Double-quoted: backslash escapes.
  writeSkill("dq-skill", '"Use the \\"quoted\\" path"');
  // Unquoted plain scalar must pass through untouched.
  writeSkill("bare-skill", "Use when nothing needs escaping");

  const out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["skills"] });
  assert.ok(out.includes("Use when investigating a bug's root cause"), "single-quoted '' must decode to '");
  assert.ok(!out.includes("bug''s"), "the doubled-quote artifact must not reach the rendered catalog");
  assert.ok(out.includes('Use the "quoted" path'), 'double-quoted \\" must decode to "');
  assert.ok(!out.includes('\\"quoted\\"'), "the backslash artifact must not reach the rendered catalog");
  assert.ok(out.includes("Use when nothing needs escaping"), "plain scalars must pass through unchanged");
});

// TC-WSC-007 — surface invariant over the REAL skill set: no escape artifact survives into the
// catalog this repo actually ships. TC-WSC-006 pins the decoder; this pins the product, so the leak
// is caught no matter which of the frontmatter parsers regresses (the same de-wrap-only logic was
// independently reimplemented in three scripts, and the fix had to land in each).
test("TC-WSC-007 the real catalog carries no YAML escape artifacts", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  const artifacts = out.split("\n").filter((l) => /''|\\"/.test(l));
  assert.deepEqual(
    artifacts,
    [],
    `rendered catalog rows still carry a YAML escape artifact:\n${artifacts.join("\n")}`
  );
});

// TC-WSC-008 — the builder is the source of the static Claude catalog.  Checking only the
// in-memory builder lets workflow changes reach the live workflow registry while the Tier-1
// Claude activation catalog keeps an older sequence.
test("TC-WSC-008 shipped Claude workflow catalog matches the canonical builder", (t) => {
  const claudeMdPath = path.join(repoRoot, "CLAUDE.md");
  if (!fs.existsSync(claudeMdPath)) {
    t.skip("root CLAUDE.md is not part of a .claude-only adopter copy");
    return;
  }
  const claudeMd = normalizeEol(fs.readFileSync(claudeMdPath, "utf8"));
  const from = claudeMd.indexOf(CK_SKILLS_START);
  const to = claudeMd.indexOf(CK_SKILLS_END, from + CK_SKILLS_START.length);

  assert.notEqual(from, -1, "CLAUDE.md must contain the workflow catalog start marker");
  assert.notEqual(to, -1, "CLAUDE.md must contain the workflow catalog end marker");

  const shipped = claudeMd.slice(from + CK_SKILLS_START.length, to).trim();
  // CLAUDE.md owns routing in its static workflow gate; this marked block is generated from
  // the workflow and skill sections only.
  const expected = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  assert.equal(shipped, expected, "regenerate CLAUDE.md from the workflow catalog builder");
});

// TC-WSC-009 — the framework guide calls its feature sequence "full". Keep that human-facing
// execution contract synchronized with the canonical workflow registry's terminal refresh.
test("TC-WSC-009 framework guide carries the current workflow count and conditional feature refresh", () => {
  const guide = normalizeEol(
    fs.readFileSync(
      path.join(repoRoot, ".claude", "docs", "claude-ai-agent-framework-guide.md"),
      "utf8"
    )
  );

  const workflowCount = Object.keys(workflowsDoc.workflows).length;
  assert.match(guide, new RegExp(`Workflow Catalog \\(${workflowCount} Workflows\\)`));
  assert.match(guide, /workflow-integration-test-green/);
  assert.match(guide, /scan --target=domain-entities → docs-update/);
  assert.match(guide, /only when the final diff changes an entity\/model, DTO\/data contract, persistence schema\/migration, or entity-sync evidence/i);
  assert.match(guide, /otherwise complete the scan task with a cited skip reason/i);
});

// TC-WSC-011 — a declared all-return barrier is ONE parallel step in the catalog, so a reader
// selecting a route sees the phase shape instead of a misleading step-to-step chain.
test("TC-WSC-011 renders every declared parallel group as one bracketed step", () => {
  const { resolveAllWorkflowManifests } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-manifest.cjs"));
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  assert.match(out, /`\[a ∥ b\]` = one parallel phase \(all-return barrier\)/);
  let groupCount = 0;
  for (const workflowId of Object.keys(workflowsDoc.workflows)) {
    const row = out.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    for (const manifest of resolveAllWorkflowManifests(workflowsDoc, workflowId, { rootDir: repoRoot })) {
      for (const group of manifest.parallelGroups || []) {
        groupCount += 1;
        const members = manifest.occurrences
          .map((occurrence, index) => ({ occurrence, step: manifest.sequence[index] }))
          .filter(({ occurrence }) => occurrence.barrier === group.id)
          .map(({ occurrence, step }) => `${step}${group.conditionalMembers.includes(occurrence.id) ? "*" : ""}`);
        const expected = `[${members.join(" ∥ ")}]`;
        assert.ok(row.includes(expected), `${workflowId}/${manifest.mode}/${group.id}: expected ${expected}`);
      }
    }
  }
  assert.ok(groupCount > 0, "the shipped registry declares at least one parallel group");
});

// TC-WSC-010 (builder half) — block wraps cleanly with the exported markers
test("exported CK markers are stable", () => {
  assert.equal(CK_SKILLS_START, "<!-- CK:WORKFLOW-SKILLS -->");
  assert.equal(CK_SKILLS_END, "<!-- /CK:WORKFLOW-SKILLS -->");
});

// The 8 canonical portability token names (loader PORTABILITY_TOKENS). Asserted as literal braces
// so a bare `{SPEC_ROOT}` reaching the GENERATED catalog table fails, whatever it should have been.
const PORTABILITY_TOKEN_NAMES = [
  "SPEC_ROOT",
  "SPEC_ROOT_TECHNICAL",
  "REF_DOCS_ROOT",
  "ADR_ROOT",
  "TEMPLATES_ROOT",
  "PLANS_ROOT",
  "TEAM_ARTIFACTS_ROOT",
  "PRODUCT_ROADMAP_DOC",
];

// TC-DOCROOT-048 — `whenToUse` is a ROUTED field: tokens resolve from the configured root before
// the `When to use` column is rendered, and no token brace survives into the generated table.
test("TC-DOCROOT-048 renderWorkflowsSection resolves whenToUse tokens from config", () => {
  const config = { specRoots: { business: { path: "spec-library" } } };
  // Steps are rendered from the real registry, so the row must carry a REAL workflow id; only the
  // routed `whenToUse` field is replaced with a tokenised fixture value.
  const [fixtureId, shippedWorkflow] = Object.entries(workflowsDoc.workflows)[0];
  const entries = [
    [
      fixtureId,
      {
        ...shippedWorkflow,
        whenToUse: "User edits {SPEC_ROOT}/{Bucket}, a plan in {PLANS_ROOT}",
      },
    ],
  ];

  const out = renderWorkflowsSection(entries, repoRoot, config);
  const row = out.split("\n").find((line) => line.startsWith(`| \`${fixtureId}\``));
  assert.ok(row, out);
  // `condenseWhenToUse` lower-cases the hint, so compare case-insensitively.
  const hint = row.toLowerCase();
  assert.ok(hint.includes("spec-library"), row);
  assert.ok(hint.includes("{plans_root}") === false, row);
  assert.ok(hint.includes("a plan in plans"), row);
  assert.ok(hint.includes("{bucket}"), "unknown braces survive verbatim");
  for (const token of PORTABILITY_TOKEN_NAMES) {
    assert.ok(
      !hint.includes(`{${token.toLowerCase()}}`),
      `unresolved {${token}} reached the catalog table`
    );
  }
});

// TC-DOCROOT-049 (catalog half) — an EMPTY config renders every token at its DOCUMENTED DEFAULT.
//
// Originally phrased as "a no-op on token-free content". Phase 05 tokenised the routed fields, so
// the `When to use` cell now equals `condenseWhenToUse(whenToUse RESOLVED to the defaults)` rather
// than the raw string. The invariant that still binds — and the one the backward-compat claim
// rests on — is that a `{}` config resolves every token to the default the loader documents.
//
// PORTABILITY: this test used to assert `render(entries, repoRoot, {})` equals
// `render(entries, repoRoot)`. Those are NOT the same thing. Omitting the config argument means
// "LOAD the project config from disk", which equals the `{}` rendering only in a repo that
// overrides no root — i.e. the upstream framework repo. Every adopter that relocates a root (the
// entire point of `specRoots` / `docsRoots`) failed here, so the assertion was testing "nobody
// customized anything", not the backward-compat claim in its own name. The two real invariants are
// asserted separately below: `{}` renders the DEFAULTS, and an omitted config renders the LOADED
// config. Both hold in any repo, configured or not.
test("TC-DOCROOT-049 empty-config catalog rendering resolves every token to its default", () => {
  const entries = Object.entries(workflowsDoc.workflows).sort((a, b) => a[0].localeCompare(b[0]));

  const withEmptyConfig = renderWorkflowsSection(entries, repoRoot, {});

  // An OMITTED config means "load from disk" — so it must equal rendering with the config the
  // loader actually returns for this repo, whatever that repo configured.
  const { loadProjectConfig } = require(
    path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs")
  );
  assert.equal(
    renderWorkflowsSection(entries, repoRoot),
    renderWorkflowsSection(entries, repoRoot, loadProjectConfig()),
    "omitting the config argument must resolve tokens from the LOADED project config"
  );

  for (const [id, wf] of entries) {
    const { resolvePortabilityTokens } = require(
      path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs")
    );
    const expected = condenseWhenToUse(resolvePortabilityTokens(wf.whenToUse, {})) || id;
    const row = withEmptyConfig.split("\n").find((line) => line.startsWith(`| \`${id}\``));
    assert.ok(row, `missing row for ${id}`);
    assert.ok(row.includes(expected), `${id}: When-to-use cell must render the resolved whenToUse`);
  }

  for (const token of PORTABILITY_TOKEN_NAMES) {
    assert.equal(
      withEmptyConfig.includes(`{${token}}`),
      false,
      `a bare {${token}} reached the generated CLAUDE.md/AGENTS.md catalog table`
    );
  }

  // Same omitted-vs-empty distinction at the whole-catalog level: omitting `config` loads from
  // disk, so it is compared against the LOADED config, not against `{}`.
  assert.equal(
    buildWorkflowSkillsCatalog({ rootDir: repoRoot, config: loadProjectConfig() }),
    buildWorkflowSkillsCatalog({ rootDir: repoRoot })
  );
});
