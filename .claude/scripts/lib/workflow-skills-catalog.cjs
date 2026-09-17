"use strict";

/**
 * Shared builder for the concise Workflow & Skills catalog baked into every AI
 * session-start context (CLAUDE.md, Codex CODEX_CONTEXT.md/AGENTS.md). Hook-independent
 * tools (Codex) learn the available workflows and composable step-skills ONLY from
 * this statically-baked block — without it they cannot compose a custom workflow
 * because they don't know what skills exist.
 *
 * Single source of truth: .claude/workflows.json (+ each step-skill's SKILL.md
 * `description:` frontmatter). Emits a markdown BODY (no wrapping) — callers wrap:
 *   - Codex generator embeds it inside its WORKFLOWS:START/END block (applies the
 *     $-dialect rewrite itself).
 *   - Claude generator keeps the native `/` token style.
 *
 * Consumers (keep in lockstep):
 *   - .claude/scripts/codex/sync-context-workflows.mjs       (via createRequire)
 *   - .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs
 */

const fs = require("fs");
const path = require("path");
const { resolveAllWorkflowManifests } = require("./workflow-manifest.cjs");

const CK_SKILLS_START = "<!-- CK:WORKFLOW-SKILLS -->";
const CK_SKILLS_END = "<!-- /CK:WORKFLOW-SKILLS -->";

const DEFAULT_SECTIONS = ["routing", "workflows", "skills"];

// R8 LOCKSTEP. The loader (.claude/hooks/lib/project-config-loader.cjs) owns the portability token
// table; this module only runs its own resolution when that require FAILS (a stripped portable tree
// carries .claude/scripts/** without .claude/hooks/lib/). That branch resolves to the DEFAULTS —
// never a pass-through: a pass-through would render a literal `{SPEC_ROOT}` into the generated
// `## Workflow & Skills Catalog` table in CLAUDE.md / AGENTS.md, strictly worse than the hardcoded
// path it replaced. Defaults-only duplication (no config paths, no resolution logic), mirroring the
// same fallback in .claude/scripts/codex/sync-context-workflows.mjs.
const PORTABILITY_TOKEN_DEFAULTS = {
  SPEC_ROOT: "docs/specs",
  SPEC_ROOT_TECHNICAL: "docs/specs-technical",
  REF_DOCS_ROOT: "docs/project-reference",
  ADR_ROOT: "docs/adr",
  TEMPLATES_ROOT: "docs/templates",
  PLANS_ROOT: "plans",
  TEAM_ARTIFACTS_ROOT: "team-artifacts",
  PRODUCT_ROADMAP_DOC: "docs/product-roadmap.md",
};

function resolvePortabilityTokensFallback(text, config) {
  if (typeof text !== "string" || !text) return text;
  if (!text.includes("{")) return text;
  void config;
  return text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(PORTABILITY_TOKEN_DEFAULTS, token)
      ? PORTABILITY_TOKEN_DEFAULTS[token]
      : match
  );
}

function loadResolvePortabilityTokens() {
  try {
    const loader = require("../../hooks/lib/project-config-loader.cjs");
    if (typeof loader.resolvePortabilityTokens === "function") {
      return loader.resolvePortabilityTokens;
    }
    return resolvePortabilityTokensFallback;
  } catch {
    return resolvePortabilityTokensFallback;
  }
}

const resolvePortabilityTokens = loadResolvePortabilityTokens();

// Module lives at .claude/scripts/lib/ → repo root is three levels up.
function defaultRootDir() {
  return path.resolve(__dirname, "..", "..", "..");
}

// Collapse to a single, pipe-safe markdown table cell.
function safeCell(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "\\|");
}

// Decode a YAML frontmatter scalar: strip the surrounding quotes AND undo the escaping that
// quote style implies. Stripping the wrapper alone is NOT enough — a single-quoted scalar encodes
// an apostrophe as a DOUBLED quote, so `'a bug''s root cause'` de-wrapped but not decoded renders
// the artifact `a bug''s root cause` into every generated surface (CLAUDE.md, AGENTS.md, the Codex
// mirrors) with nothing downstream to catch it.
//
// One of THREE copies of this contract: stripQuotes() in
// .claude/scripts/codex/migrate-claude-to-codex.mjs and unquoteYamlScalar() in
// .claude/scripts/skill-gc.cjs. They must stay behaviourally identical — the same description has
// to render the same on every surface — and `decoder-parity.test.mjs` is what enforces that. The
// single-quoted branch's repeat-until-stable collapse also absorbs the double-escaping that legacy
// non-idempotent normalization left behind; its cost is that two GENUINE consecutive apostrophes
// over-collapse to one, which is accepted (legacy double-escaping is observed; `don''''t` is not).
function unquote(value) {
  const s = String(value).trim();
  if (s.length < 2) return s;
  if (s.startsWith("'") && s.endsWith("'")) {
    let out = s.slice(1, -1);
    let previous = "";
    while (out !== previous) {
      previous = out;
      out = out.replace(/''/g, "'");
    }
    return out.trim();
  }
  if (s.startsWith('"') && s.endsWith('"')) {
    // Double-quoted YAML escapes with a backslash; only the escapes a one-line description can
    // realistically carry are decoded here.
    return s
      .slice(1, -1)
      .replace(/\\(["\\/])/g, "$1")
      .trim();
  }
  return s;
}

/**
 * Condense a workflow's `whenToUse` into a short, scannable trigger hint.
 * Parity twin of `extractKeywords` in sync-context-workflows.mjs — keep behavior
 * aligned so all three surfaces render the same hint (asserted by TC-WSC-004).
 */
function condenseWhenToUse(
  whenToUse,
  { maxClauses = 3, wordsPerClause = 6, maxLen = 130 } = {}
) {
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

// The base skill token of a sequence step ("artifact-review --type=pbi" -> "artifact-review").
function baseSkill(step) {
  return String(step).split(/\s+/)[0];
}

function readWorkflowsDoc(rootDir) {
  const p = path.join(rootDir, ".claude", "workflows.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// The static catalog is a route-selection aid, but it must not hide the
// complete selected-mode task list. Resolve explicit variants through the
// same canonical manifest helper used by activation; legacy entries retain
// their compatibility sequence until they are migrated.
function resolvedModeSequences(rootDir, workflowId, workflow) {
  return resolveCatalogManifests(rootDir, workflowId, workflow)
    .map((manifest) => ({ mode: manifest.mode, sequence: manifest.sequence }));
}

// Render one resolved mode as its flat step list, collapsing each declared all-return barrier into
// a single bracketed step (`[a ∥ b*]`, `*` = conditional member). Every flat step token stays
// present verbatim, so the row remains a complete task list for the selected mode.
function renderGroupedSequence(manifest) {
  const occurrences = Array.isArray(manifest.occurrences) ? manifest.occurrences : [];
  const groups = new Map((manifest.parallelGroups || []).map((group) => [group.id, group]));
  const tokens = [];
  let open = null;
  manifest.sequence.forEach((step, index) => {
    const occurrence = occurrences[index];
    const group = occurrence && occurrence.barrier ? groups.get(occurrence.barrier) : null;
    if (!group) {
      open = null;
      tokens.push(safeCell(step));
      return;
    }
    const conditional = (group.conditionalMembers || []).includes(occurrence.id) ? "*" : "";
    if (!open || open.id !== group.id) {
      open = { id: group.id, members: [] };
      tokens.push(open);
    }
    open.members.push(`${safeCell(step)}${conditional}`);
  });
  return tokens
    .map((token) => (typeof token === "string" ? token : `[${token.members.join(" ∥ ")}]`))
    .join(" → ");
}

function resolveCatalogManifests(rootDir, workflowId, workflow) {
  const document = readWorkflowsDoc(rootDir);
  const declared = [];
  if (Array.isArray(workflow && workflow.sequence)) declared.push(...workflow.sequence);
  if (workflow && workflow.variants && typeof workflow.variants === "object") {
    for (const variant of Object.values(workflow.variants)) {
      if (Array.isArray(variant && variant.sequence)) declared.push(...variant.sequence);
    }
  }
  // Catalog generation intentionally tolerates pseudo-steps whose skill directories are absent so
  // adopters can preview a workflow.  The resolver still validates mode/occurrence/barrier shape;
  // supplying the declared skill set only disables its filesystem-existence check for this
  // presentation surface (activation performs the real skill-file check).
  const availableSkills = new Set(
    declared
      .map((step) => (typeof step === "string" ? step.trim().split(/\s+/, 1)[0] : step && step.skill))
      .filter((skill) => typeof skill === "string" && skill.length > 0)
  );
  return resolveAllWorkflowManifests(document, workflowId, { rootDir, availableSkills });
}

function resolveSkillDescription(rootDir, skill, cache) {
  if (cache.has(skill)) return cache.get(skill);
  let desc = "";
  try {
    const raw = fs.readFileSync(
      path.join(rootDir, ".claude", "skills", skill, "SKILL.md"),
      "utf8"
    );
    const m = raw.match(/^description:\s*(.+)$/m);
    if (m) desc = unquote(m[1]);
  } catch {
    // Skill dir absent (pseudo-step) — fall through to fallback below.
  }
  if (!desc) desc = "(workflow step)";
  cache.set(skill, desc);
  return desc;
}

function renderRoutingSection() {
  return [
    "### Routing Decision Guide",
    "",
    "Classify complexity + risk FIRST, then route (declare `Route: {id|skill|custom-simple|direct} — because {reason}`, then activate it):",
    "",
    "| Request is about… | Route |",
    "| --- | --- |",
    "| Simple, clear target, low risk | **direct execution** (no workflow) |",
    "| Simple but needs a few coordinated steps | **custom simple workflow** — sequence only the needed skills/steps |",
    "| Non-trivial bug / regression / wrong output | **`workflow-bugfix`** |",
    "| Non-trivial feature or enhancement | **`workflow-feature`** (`workflow-big-feature` when large/ambiguous/research-heavy) |",
    "| Matches a skill's or workflow's \"Use\" clause | that skill / workflow |",
    "| One-off question or trivial edit | direct execution |",
    "",
    "An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it. Otherwise auto-select; never ask which path to take.",
  ].join("\n");
}

// `whenToUse` (and any `description` this module renders) is a ROUTED field: it lands in the
// GENERATED catalog table, so portability tokens are resolved BEFORE condensing/rendering.
// Unknown braces (`{Bucket}`, `{plan-id}`, `--type={pbi|story}`) are left verbatim by the resolver.
function renderWorkflowsSection(entries, rootDir, config) {
  const rows = entries.map(([id, wf]) => {
    const whenToUse = resolvePortabilityTokens(wf && wf.whenToUse, config);
    const hint = condenseWhenToUse(whenToUse) || safeCell((wf && wf.name) || id);
    const modes = resolveCatalogManifests(rootDir, id, wf);
    const steps = modes.map((manifest) => {
      const rendered = renderGroupedSequence(manifest);
      return modes.length > 1 ? `${safeCell(manifest.mode)}: ${rendered}` : rendered;
    }).join("; ");
    return `| \`${id}\` | ${hint} | ${steps} |`;
  });
  return [
    `### Workflows Index (${entries.length})`,
    "",
    "`[a ∥ b]` = one parallel phase (all-return barrier): start every member together and advance only after ALL return; `*` marks a conditional member.",
    "",
    "| Workflow | When to use | Steps |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderSkillsSection(skills, rootDir, cache, config) {
  const rows = skills.map((skill) => {
    const desc = safeCell(
      resolvePortabilityTokens(resolveSkillDescription(rootDir, skill, cache), config)
    );
    return `| \`${skill}\` | ${desc} |`;
  });
  return [
    `### Workflow Skills (${skills.length} composable steps)`,
    "",
    "Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.",
    "",
    "| Skill | Use for |",
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

/**
 * Build the concise catalog markdown body.
 * @param {object} [opts]
 * @param {string} [opts.rootDir] repo root (defaults to resolved repo root)
 * @param {string[]} [opts.sections] subset of ["routing","workflows","skills"]
 * @param {object} [opts.config] parsed project-config.json; the loader loads + caches it when omitted
 * @returns {string} markdown body (no CK markers)
 */
function buildWorkflowSkillsCatalog(opts = {}) {
  const rootDir = opts.rootDir || defaultRootDir();
  const config = opts.config;
  const sections = opts.sections || DEFAULT_SECTIONS;
  const doc = readWorkflowsDoc(rootDir);

  const entries = Object.entries(doc.workflows || {}).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [workflowId, workflow] of entries) {
    const injectContext = workflow && workflow.preActions && workflow.preActions.injectContext;
    if (typeof injectContext !== "string" || injectContext.trim().length === 0) {
      throw new Error(
        `Workflow ${workflowId} is missing required non-empty preActions.injectContext`
      );
    }
  }

  const skillSet = new Set();
  for (const [workflowId, wf] of entries) {
    for (const { sequence } of resolvedModeSequences(rootDir, workflowId, wf)) {
      for (const step of sequence) skillSet.add(baseSkill(step));
    }
  }
  const skills = [...skillSet].sort((a, b) => a.localeCompare(b));

  const cache = new Map();
  const blocks = ["## Workflow & Skills Catalog", ""];
  blocks.push(
    "Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly."
  );
  blocks.push("");

  for (const section of sections) {
    if (section === "routing") blocks.push(renderRoutingSection(), "");
    else if (section === "workflows")
      blocks.push(renderWorkflowsSection(entries, rootDir, config), "");
    else if (section === "skills")
      blocks.push(renderSkillsSection(skills, rootDir, cache, config), "");
  }

  return blocks.join("\n").trimEnd();
}

module.exports = {
  buildWorkflowSkillsCatalog,
  renderWorkflowsSection,
  condenseWhenToUse,
  baseSkill,
  resolvedModeSequences,
  CK_SKILLS_START,
  CK_SKILLS_END,
};
