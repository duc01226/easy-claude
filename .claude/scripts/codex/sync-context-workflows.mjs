#!/usr/bin/env node

import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  buildSkillReferenceMap,
  prependCodexCompatibilityNote,
  rewriteClaudeToolTermsForCodex,
  rewriteSkillMentionsForCodex,
} from "./compat-rewrite.mjs";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot } = require("../lib/project-root.cjs");
const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const rootDir = rootResolution.rootDir;

function loadHooklessPromptProtocol() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(rootDir, ".claude", "scripts", "lib", "hookless-prompt-protocol.cjs"),
    path.join(scriptDir, "..", "lib", "hookless-prompt-protocol.cjs"),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }
  throw new Error("static prompt protocol builder is missing");
}

const {
  buildPromptProtocolMirrorSection: buildHooklessPromptProtocolMirrorSection,
} = loadHooklessPromptProtocol();

// CK markers for the Workflow & Skills catalog block. Declared locally (not imported
// from the builder) so the dedup regex in main() still works when the builder module
// is absent in a stripped portable Codex tree. TWIN: keep byte-identical with the
// exports in .claude/scripts/lib/workflow-skills-catalog.cjs.
const CK_SKILLS_START = "<!-- CK:WORKFLOW-SKILLS -->";
const CK_SKILLS_END = "<!-- /CK:WORKFLOW-SKILLS -->";

// CK markers wrapping the two FULL always-on protocol blocks (critical-thinking +
// ai-mistake-prevention) that generate-claude-md.cjs now bakes into CLAUDE.md at BOTH top
// and bottom. AGENTS.md = CLAUDE-mirror + CONTEXT-mirror; the CONTEXT mirror already bakes
// these blocks (now canonical-sourced), so the CLAUDE-mirror dedup below must strip BOTH
// occurrences or AGENTS.md would carry each block three times. TWIN: keep byte-identical
// with generate-claude-md.cjs CK_CRIT_OPEN/CLOSE + CK_AIMP_OPEN/CLOSE.
const CK_CRIT_START = "<!-- CK:CRITICAL-THINKING -->";
const CK_CRIT_END = "<!-- /CK:CRITICAL-THINKING -->";
const CK_AIMP_START = "<!-- CK:AI-MISTAKE-PREVENTION -->";
const CK_AIMP_END = "<!-- /CK:AI-MISTAKE-PREVENTION -->";

const ckConfigPath = path.join(rootDir, ".claude", ".ck.json");
const claudeInstructionsPath = path.join(rootDir, "CLAUDE.md");
const contextPath = path.join(rootDir, ".codex", "CODEX_CONTEXT.md");
const agentsPath = path.join(rootDir, "AGENTS.md");
const sharedSyncInlinePath = path.join(rootDir, ".claude", "skills", "shared", "sync-inline-versions.md");
const sharedAiSddSyncTags = ["ai-sdd-artifact-contract", "ai-sdd-artifact-contract:reminder"];

// R8 LOCKSTEP. The loader owns the token table; this file only runs its own resolution when
// the loader require FAILS (a stripped portable Codex tree carries .claude/scripts/codex/*.mjs
// without .claude/hooks/lib/). That branch resolves to the DEFAULTS — never a pass-through:
// a pass-through would emit a literal `{SPEC_ROOT}` into .codex/CODEX_CONTEXT.md and AGENTS.md,
// which is strictly worse than the hardcoded path it replaced.
//
// PORTABILITY_TOKEN_DEFAULTS below is the ONLY duplicated data, and it is defaults-only (no
// config paths, no resolution logic). TC-DOCROOT-029 deepEquals it against the loader's
// PORTABILITY_TOKENS defaults, so drift fails CI rather than silently diverging the two hosts.
const PORTABILITY_TOKEN_DEFAULTS = {
  SPEC_ROOT: "docs/specs",
  SPEC_ROOT_TECHNICAL: "docs/specs-technical",
  REF_DOCS_ROOT: "docs/project-reference",
  ADR_ROOT: "docs/adr",
  TEMPLATES_ROOT: "docs/templates",
  PLANS_ROOT: "plans",
  TEAM_ARTIFACTS_ROOT: "team-artifacts",
  PRODUCT_ROADMAP_DOC: "docs/product-roadmap.md"
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
    if (typeof loader.resolvePortabilityTokens === "function") return loader.resolvePortabilityTokens;
    return resolvePortabilityTokensFallback;
  } catch {
    return resolvePortabilityTokensFallback;
  }
}

const resolvePortabilityTokens = loadResolvePortabilityTokens();

const START_MARKER = "<!-- WORKFLOWS:START -->";
const END_MARKER = "<!-- WORKFLOWS:END -->";
const PROMPT_PROTOCOLS_START = "<!-- PROMPT-PROTOCOLS:START -->";
const PROMPT_PROTOCOLS_END = "<!-- PROMPT-PROTOCOLS:END -->";
const PROMPT_PROTOCOLS_BOTTOM_START = "<!-- PROMPT-PROTOCOLS-BOTTOM:START -->";
const PROMPT_PROTOCOLS_BOTTOM_END = "<!-- PROMPT-PROTOCOLS-BOTTOM:END -->";
const AGENTS_CLAUDE_MIRROR_START = "<!-- CLAUDE-MIRROR:START -->";
const AGENTS_CLAUDE_MIRROR_END = "<!-- CLAUDE-MIRROR:END -->";
const AGENTS_CONTEXT_MIRROR_START = "<!-- CODEX-CONTEXT-MIRROR:START -->";
const AGENTS_CONTEXT_MIRROR_END = "<!-- CODEX-CONTEXT-MIRROR:END -->";
const LEGACY_AGENTS_CLAUDE_MERGE_START = "<!-- CLAUDE-MERGE:START -->";
const LEGACY_AGENTS_CLAUDE_MERGE_END = "<!-- CLAUDE-MERGE:END -->";
const AGENTS_ROOT_PROJECTION_START = "<!-- CK:CODEX-ROOT-PROJECTION -->";
const AGENTS_ROOT_PROJECTION_END = "<!-- /CK:CODEX-ROOT-PROJECTION -->";
// The Codex root budget. This is a PROJECT guardrail, not a host-imposed hard limit — nothing
// truncates at it (see reportAgentsRootSize) and exceeding it only warns. It was 32768 while the
// projection carried neither the anti-hallucination protocol nor the System Lessons; restoring
// both (they are the repo's own defence against the failure mode it most often hits, and Codex was
// getting ZERO copies while Claude got two) costs roughly 9 KiB, and the naming/commands sections
// another ~2 KiB. Raising the ceiling is the deliberate choice over compressing the DESIGN-GATE:
// Codex pays the tokens once per prompt, and the alternative traded a correctness guardrail for
// bytes. Revisit only with a measured host budget, never to make an overflow warning go away.
// 2026-09-17: raised 49152 -> 53248 (48 -> 52 KiB). The 49152 ceiling had ~145 bytes of headroom, so
// ANY new System Lesson overflowed it; the environment-fault lesson (a failure-adjudication guardrail
// Codex otherwise gets zero always-on copies of) costs ~1.4 KiB. Same trade as the 32768 -> 49152
// raise: a correctness guardrail beats bytes. Still a PROJECT budget, not a host limit — revisit with
// a measured host budget, never to silence an overflow warning.
// 2026-09-19: raised 53248 -> 61440 (52 -> 60 KiB). CLAUDE.md is prettier-managed source; the
// project formatter pads markdown tables, and the 52 KiB ceiling had been set against an un-padded
// root, so the first ordinary edit (which runs `post-edit-prettier.cjs`) inflates the projected
// mirror past it. A padded root is the documented steady state, so the budget must fit it. Still a
// PROJECT budget, not a host limit — revisit with a measured host budget, never to hide an overflow.
const AGENTS_ROOT_LIMIT_BYTES = 61440;
const AGENTS_PROJECTION_HEADINGS = [
  /^## Workflow Step Advancement & Parallel Phases$/m,
  /^## TL;DR — What You Must Know Before Writing Any Code$/m,
  /^## Search Existing Code First$/m,
  /^## Project Reference Loading$/m,
  /^## Task Planning Rules$/m,
  /^## Generated Artifact Storage$/m,
  /^## Code Responsibility Hierarchy$/m,
  // Carries the naming table AND the key-locations / dev-commands / integration-testing SECTION
  // blocks that follow it before the next `##`. Without it a Codex session authoring a hook,
  // skill or agent had no in-context statement of this repo's file-naming rules or test commands
  // — in a repo whose entire product IS those artifacts.
  /^## Naming Conventions$/m,
  /^## Evidence-Based Reasoning & Investigation$/m,
  /^## Continuous Improvement — Lesson Extraction Gate$/m,
  /^## Git & Version-Control Discipline$/m,
  /^## Graph Intelligence \(when \.code-graph\/graph\.db exists\)$/m,
  /^## Automatic Skill Activation$/m,
];
const PROJECT_REFERENCE_GATE_HEADING = "## Codex Project Reference Gate (Hook-Independent)";
const LEGACY_PROJECT_REFERENCE_GATE_HEADINGS = ["## Codex Hookless Project Reference Gate"];
const PROJECT_REFERENCE_GATE_BODY_LINES = [
  "Codex uses static project-reference loading instead of runtime-injected project docs. Before coding, planning, debugging, testing, or reviewing:",
  "",
  "- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.",
  "- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.",
  "- Read `docs/project-reference/lessons.md` for always-on project guardrails.",
  "- For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read the spec routing set named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized.",
  "- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.",
  "- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.",
  "- Load context just in time: classify the target and operation, open only the matching reference docs immediately before the first target read/grep/edit/test, and after compaction, resume, delegation, or a context change re-read them and restate `Reference docs read: ... | Not applicable: ...`.",
];
const PROJECT_REFERENCE_GATE_BODY_START = PROJECT_REFERENCE_GATE_BODY_LINES[0];
const PROJECT_REFERENCE_GATE_BODY_END = PROJECT_REFERENCE_GATE_BODY_LINES.at(-1);
const LEGACY_PROJECT_REFERENCE_GATE_BODY_END = "- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildManagedBlockPattern(startMarker, endMarker, flags = "m") {
  return new RegExp(
    `^[^\\S\\r\\n]*${escapeRegExp(startMarker)}[^\\S\\r\\n]*$[\\s\\S]*?^[^\\S\\r\\n]*${escapeRegExp(
      endMarker
    )}[^\\S\\r\\n]*$\\n?`,
    flags
  );
}

function stripManagedBlock(text, startMarker, endMarker) {
  const pattern = buildManagedBlockPattern(startMarker, endMarker, "gm");
  return text.replace(pattern, "").trimEnd();
}

function extractManagedBlock(text, startMarker, endMarker) {
  const pattern = buildManagedBlockPattern(startMarker, endMarker, "m");
  return String(text || "").match(pattern)?.[0] ?? null;
}

function buildAgentsContextMirrorBlock(contextMd) {
  const normalized = String(contextMd || "").replace(/\r\n?/g, "\n").trim();
  const sha256 = createHash("sha256").update(normalized, "utf8").digest("hex");
  return [
    AGENTS_CONTEXT_MIRROR_START,
    "## Codex Context Mirror (Auto-Synced)",
    "",
    "This compact pointer is auto-generated from `.codex/CODEX_CONTEXT.md` by `node .claude/scripts/codex/sync-context-workflows.mjs`.",
    "Read `.codex/CODEX_CONTEXT.md` before non-trivial project work; it carries shared quality and project-reference protocol detail.",
    `Context fingerprint (SHA-256): ${sha256}`,
    "Do not edit this pointer manually; update canonical Claude sources and re-sync.",
    "",
    buildProjectReferenceGateSection(),
    "",
    "Workflow routing is carried by the tracked context and may be refreshed by the runtime hook when enabled.",
    "",
    "If the referenced context is missing or its fingerprint is stale, stop and run `$sync-codex` (or the standalone sync runner) before proceeding.",
    AGENTS_CONTEXT_MIRROR_END,
  ].join("\n");
}

function extractHeadingSection(markdown, headingPattern) {
  const text = String(markdown || "").replace(/\r\n?/g, "\n");
  const match = text.match(headingPattern);
  if (!match || match.index === undefined) return null;
  const rest = text.slice(match.index);
  const next = rest.slice(match[0].length).search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, match[0].length + next)).trim();
}

function buildCompactClaudeProjection(claudeMd) {
  const text = String(claudeMd || "").replace(/\r\n?/g, "\n");
  const blocks = [];
  const sentinel = text.match(/^<!-- CK:UNIVERSAL-GUIDES v\d+ -->$/m)?.[0];
  if (sentinel) blocks.push(sentinel);
  // Preserve a small unmanaged Claude preface (project title/identity) so compacting the Codex
  // root does not silently erase custom context. Large prose stays in CLAUDE.md and is explicitly
  // routed there; it is never truncated into a misleading half-section.
  let preface = text;
  for (const marker of [
    ["<!-- CK:WORKFLOW-GATE -->", "<!-- /CK:WORKFLOW-GATE -->"],
    ["<!-- CK:PROJECT-PROTOCOLS -->", "<!-- /CK:PROJECT-PROTOCOLS -->"],
    // Also drop the two protocol blocks HERE, before the preface is cut at the first `##`.
    // They are projected explicitly below; leaving them in the preface emitted the
    // critical-thinking block twice, and — because CLAUDE.md's own
    // `## Common AI Mistake Prevention` heading sits INSIDE the AIMP fence — cut the preface
    // mid-block and stranded a dangling `<!-- CK:AI-MISTAKE-PREVENTION -->` open marker.
    [CK_CRIT_START, CK_CRIT_END],
    [CK_AIMP_START, CK_AIMP_END],
  ]) preface = stripManagedBlock(preface, marker[0], marker[1]);
  const firstHeading = preface.search(/^##\s+/m);
  preface = (firstHeading === -1 ? preface : preface.slice(0, firstHeading))
    .replace(/^<!-- CK:UNIVERSAL-GUIDES v\d+ -->\s*/m, "")
    .trim();
  if (preface && Buffer.byteLength(preface, "utf8") <= 4096) blocks.push(preface);
  for (const marker of [
    ["<!-- CK:WORKFLOW-GATE -->", "<!-- /CK:WORKFLOW-GATE -->"],
    ["<!-- CK:PROJECT-PROTOCOLS -->", "<!-- /CK:PROJECT-PROTOCOLS -->"],
    // The anti-hallucination protocol and the System Lessons are this repo's own defence against
    // the failure mode it most often hits. This projection is a WHITELIST: a block absent from
    // these lists never reaches AGENTS.md at all. Omitting them once gave Claude two copies and
    // Codex none. CLAUDE.md now stamps each block ONCE (the EOF recency copy was removed
    // 2026-09-22), and `extractManagedBlock` matches the FIRST fence pair either way, so exactly
    // one copy is projected.
    [CK_CRIT_START, CK_CRIT_END],
    [CK_AIMP_START, CK_AIMP_END],
  ]) {
    const block = extractManagedBlock(text, marker[0], marker[1]);
    if (block) blocks.push(block.trim());
  }
  for (const heading of AGENTS_PROJECTION_HEADINGS) {
    const section = extractHeadingSection(text, heading);
    if (section) blocks.push(section);
  }
  blocks.push(
    "## Codex Host Parity",
    "",
    "This root is a bounded operational projection. The canonical Claude instructions remain in `CLAUDE.md`; the complete Codex static context remains in `.codex/CODEX_CONTEXT.md`.",
    "",
    "When the user explicitly invokes a skill or workflow, Claude and Codex resolve the same canonical definition. Host syntax is the only intentional dialect difference.",
    "",
    "For an explicitly invoked workflow, resolve the complete manifest, capture the owned baseline, create one task per occurrence, and preserve the manifest fingerprint for resume.",
    "",
    "PERFORMANCE-SDD ROUTE: For performance-related work, run `$performance-review` with SLA/benchmark evidence and retain functional no-regression checks; behavior, public-contract, SLA, and spec-boundary changes still require the normal spec/test/docs synchronization.",
    "",
    "Apply the shared AI-SDD contract from `shared/sdd-artifact-contract.md` and `SYNC:ai-sdd-artifact-contract`; code-to-spec extraction is reference-only until accepted. Any supported AI tool may execute when this shared context and local docs are available.",
  );
  return blocks.filter(Boolean).join("\n\n").trim();
}

function buildAgentsClaudeMirrorBlock(claudeMd) {
  const projection = buildCompactClaudeProjection(claudeMd);
  return [
    AGENTS_CLAUDE_MIRROR_START,
    AGENTS_ROOT_PROJECTION_START,
    "## Claude Instructions Mirror (Compact Auto-Synced Projection)",
    "",
    "This bounded projection is generated from `CLAUDE.md` by `node .claude/scripts/codex/sync-context-workflows.mjs`; it keeps ownership, evidence and task rules in the Codex root.",
    "For full canonical detail, read `CLAUDE.md` and `.codex/CODEX_CONTEXT.md` directly. Do not edit generated mirrors.",
    "",
    projection,
    AGENTS_ROOT_PROJECTION_END,
    AGENTS_CLAUDE_MIRROR_END,
  ].join("\n");
}

function buildProjectReferenceGateSection() {
  return [
    PROJECT_REFERENCE_GATE_HEADING,
    "",
    ...PROJECT_REFERENCE_GATE_BODY_LINES,
  ].join("\n");
}

function reportAgentsRootSize(content) {
  const bytes = Buffer.byteLength(String(content || ""), "utf8");
  if (bytes > AGENTS_ROOT_LIMIT_BYTES) {
    console.warn(`[codex-context-sync] ROOT_OVERFLOW: AGENTS.md projection is ${bytes} bytes (limit ${AGENTS_ROOT_LIMIT_BYTES}); content was preserved without truncation. Reduce unmanaged preface or projection inputs before relying on the host budget.`);
  }
  return bytes;
}

// Legacy orphan: pre-refactor CODEX_CONTEXT.md / AGENTS.md carried a free-standing
// `# Codex Context (Hookless Parity)` section between PROMPT-PROTOCOLS:END and WORKFLOWS:START.
// It re-inlined the SAME critical-thinking + ai-mistake-prevention + Lessons content the managed
// Prompt Protocol Mirror block already carries (canonical `:full` sourced), plus a duplicate of the
// managed Codex Project Reference Gate — so every regen produced two full copies of each.
// The block is NOT wrapped in any managed marker, so the strip-and-restamp of the marker blocks never
// removed it; it persisted across syncs undetected (verify-sync-divergence only checks .agents/skills,
// not CODEX_CONTEXT.md/AGENTS.md). Strip it on every run so the protocol + gate live in exactly one
// (managed) home. Spans from the `# Codex Context (Hookless Parity)` heading up to — but not including —
// the WORKFLOWS:START marker (the next managed block), which is always present in a synced context.
const LEGACY_HOOKLESS_PARITY_HEADING = "# Codex Context (Hookless Parity)";
function stripLegacyHooklessParityBlock(contextMd) {
  const text = contextMd.replace(/\r\n?/g, "\n");
  const pattern = new RegExp(
    `(?:^|\\n)${escapeRegExp(LEGACY_HOOKLESS_PARITY_HEADING)}\\n[\\s\\S]*?(?=\\n${escapeRegExp(START_MARKER)})`,
    "g"
  );
  return text.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
}

function stripProjectReferenceGateSection(contextMd) {
  let nextText = contextMd.replace(/\r\n?/g, "\n");
  for (const heading of [PROJECT_REFERENCE_GATE_HEADING, ...LEGACY_PROJECT_REFERENCE_GATE_HEADINGS]) {
    const pattern = new RegExp(
      `(?:^|\\n)${escapeRegExp(heading)}\\n[\\s\\S]*?(?=\\n(?:## |<!-- [A-Z-]+:START -->)|$)`,
      "g"
    );
    while (nextText.includes(heading)) {
      const strippedText = nextText.replace(pattern, "");
      if (strippedText === nextText) break;
      nextText = strippedText;
    }
  }

  const orphanBodyPattern = new RegExp(
    `(?:^|\\n)${escapeRegExp(PROJECT_REFERENCE_GATE_BODY_START)}\\n[\\s\\S]*?(?:${escapeRegExp(PROJECT_REFERENCE_GATE_BODY_END)}|${escapeRegExp(LEGACY_PROJECT_REFERENCE_GATE_BODY_END)})(?=\\n(?:## |<!-- [A-Z-]+:START -->)|\\n\\n(?:## |<!-- [A-Z-]+:START -->)|$)`,
    "g"
  );
  nextText = nextText.replace(orphanBodyPattern, "");

  return nextText.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function upsertProjectReferenceGateSection(contextMd) {
  const contextWithoutGate = stripProjectReferenceGateSection(contextMd);
  const gateSection = buildProjectReferenceGateSection();

  // Anchor before a standalone `## Critical Thinking Mindset` heading when one survives (legacy
  // contexts that still carry it outside the now-stripped legacy static-parity block, and the
  // gate-replacement regression fixture). Kept as the primary anchor for backward compatibility.
  const criticalThinkingHeading = "\n## Critical Thinking Mindset";
  if (contextWithoutGate.includes(criticalThinkingHeading)) {
    return contextWithoutGate.replace(
      criticalThinkingHeading,
      () => `\n\n${gateSection}\n${criticalThinkingHeading}`
    );
  }

  // Real-world case after the legacy strip: no `## Critical Thinking Mindset` heading remains, so
  // anchor just before the WORKFLOWS:START managed block — the stable, always-present landmark in a
  // synced context. Without this fallback the gate would prepend above the Prompt Protocol Mirror.
  if (contextWithoutGate.includes(START_MARKER)) {
    return contextWithoutGate.replace(
      START_MARKER,
      () => `${gateSection}\n\n${START_MARKER}`
    );
  }

  const firstTitleMatch = contextWithoutGate.match(/^# [^\n]*(?:\n|$)/m);
  if (firstTitleMatch?.index !== undefined) {
    const insertIndex = firstTitleMatch.index + firstTitleMatch[0].length;
    return `${contextWithoutGate.slice(0, insertIndex).trimEnd()}\n\n${gateSection}\n\n${contextWithoutGate
      .slice(insertIndex)
      .trimStart()}`.trimEnd();
  }

  return `${gateSection}\n\n${contextWithoutGate.trimStart()}`.trimEnd();
}

// `writePath` defaults to the committed AGENTS.md so normal sync stays byte-identical.
// The committed file is ALWAYS read as the upsert baseline (preserves the non-managed preface);
// only the write target is redirectable, so the idempotency oracle can render into a temp dir
// from the real committed baseline without mutating the repo.
async function upsertContextIntoAgents(contextMd, claudeMd, writePath = agentsPath) {
  const hasClaudeMirror = typeof claudeMd === "string" && claudeMd.trim().length > 0;
  const claudeBlock = hasClaudeMirror ? buildAgentsClaudeMirrorBlock(claudeMd) : null;
  const mirrorBlock = buildAgentsContextMirrorBlock(contextMd);
  let agentsMd = "";
  try {
    agentsMd = await fs.readFile(agentsPath, "utf8");
  } catch {
    // Create AGENTS.md if it doesn't exist; keep minimum stable preface.
    agentsMd = "# Codex Project Instructions\n";
  }
  agentsMd = agentsMd.replace(/\r\n?/g, "\n");
  agentsMd = stripManagedBlock(
    agentsMd,
    LEGACY_AGENTS_CLAUDE_MERGE_START,
    LEGACY_AGENTS_CLAUDE_MERGE_END
  );

  const claudeManagedBlockPattern = buildManagedBlockPattern(
    AGENTS_CLAUDE_MIRROR_START,
    AGENTS_CLAUDE_MIRROR_END,
    "m"
  );
  const managedBlockPattern = buildManagedBlockPattern(
    AGENTS_CONTEXT_MIRROR_START,
    AGENTS_CONTEXT_MIRROR_END,
    "m"
  );

  // Function replacers only: the CLAUDE block mirrors free CLAUDE.md text, whose regex literals
  // such as `\.cjs$` followed by a backtick form the "$`" special pattern of a replacement STRING
  // (text BEFORE the match) and splice the head of AGENTS.md into the rule line. The context
  // block is generated text today; it uses the same form so a future `$` cannot regress it.
  if (hasClaudeMirror && claudeManagedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(claudeManagedBlockPattern, () => `${claudeBlock}\n`);
  } else if (hasClaudeMirror && managedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(managedBlockPattern, () => `${claudeBlock}\n\n${mirrorBlock}\n`);
  } else if (hasClaudeMirror) {
    agentsMd = `${agentsMd.trimEnd()}\n\n${claudeBlock}\n`;
  } else {
    agentsMd = agentsMd.replace(claudeManagedBlockPattern, "");
  }

  if (managedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(managedBlockPattern, () => `${mirrorBlock}\n`);
  } else {
    agentsMd = `${agentsMd.trimEnd()}\n\n${mirrorBlock}\n`;
  }

  reportAgentsRootSize(agentsMd);
  await fs.writeFile(writePath, agentsMd, "utf8");
}

async function readExistingContext() {
  try {
    return (await fs.readFile(contextPath, "utf8")).replace(/\r\n?/g, "\n");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return "# Codex Context\n";
  }
}

async function readClaudeInstructions() {
  try {
    return (await fs.readFile(claudeInstructionsPath, "utf8")).replace(/\r\n?/g, "\n");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return null;
  }
}

function normalizePromptProtocolText(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.trim();
  return normalized.length > 0 ? normalized : null;
}

// Shared canonical SYNC-block parser. Resolved at RUNTIME from the consuming repo root and
// guarded with a consuming-root lookup — NEVER a file-relative `../lib` require,
// which would escape the portable Codex tree (only .claude/scripts/codex/*.mjs travel). When
// .claude/scripts/lib/extract-sync-block.cjs is absent in a stripped portable consumer, the
// CRLF-safe local TWIN below is used so the CONTEXT bake never silently vanishes. This is the
// SAME parser generate-claude-md.cjs uses to bake CLAUDE.md — one source across generators.
function loadSyncBlockExtractor() {
  try {
    return require(path.join(rootDir, ".claude", "scripts", "lib", "extract-sync-block.cjs"));
  } catch {
    return null;
  }
}
const sharedSyncBlockExtractor = loadSyncBlockExtractor();

// CRLF-safe local TWIN of .claude/scripts/lib/extract-sync-block.cjs — fallback only.
// Normalizing CRLF→LF up front is REQUIRED: the canonical markdown is committed LF but a
// Windows checkout is CRLF, and the `\n---\n\n## SYNC:` boundary never matches
// `\r\n---\r\n\r\n` — an un-normalized parse silently over-captures to EOF. Keep
// byte-equivalent to the shared lib.
function extractSyncBlock(markdown, tag) {
  if (sharedSyncBlockExtractor) return sharedSyncBlockExtractor.extractSyncBlock(markdown, tag);
  const md = String(markdown).replace(/\r\n?/g, "\n");
  const marker = `## SYNC:${tag}`;
  // Whole-line marker match — mirrors findMarkerStart() in extract-sync-block.cjs so a base
  // tag can't match a longer tag it prefixes (`foo` vs `foo:full`/`foo-bar`). Kept inline
  // and helper-free so this fallback body stays self-contained (the parity test lifts it).
  let start = -1;
  for (let from = 0; ; ) {
    const idx = md.indexOf(marker, from);
    if (idx === -1) break;
    const atLineStart = idx === 0 || md[idx - 1] === "\n";
    const after = md[idx + marker.length];
    const atLineEnd = after === undefined || after === "\n";
    if (atLineStart && atLineEnd) {
      start = idx;
      break;
    }
    from = idx + marker.length;
  }
  if (start === -1) return null;
  const next = md.indexOf("\n---\n\n## SYNC:", start + marker.length);
  const end = next === -1 ? md.length : next;
  return md.slice(start, end).trim();
}

function extractSyncBody(markdown, tag) {
  if (sharedSyncBlockExtractor) return sharedSyncBlockExtractor.extractSyncBody(markdown, tag);
  const block = extractSyncBlock(markdown, tag);
  if (block == null) return null;
  const nl = block.indexOf("\n");
  return (nl === -1 ? "" : block.slice(nl + 1)).trim();
}

// Read a FULL protocol block body (heading stripped) from the canonical source. Approach C:
// critical-thinking + ai-mistake-prevention bake from canonical `:full` — the SAME source
// CLAUDE.md bakes — not the Claude runtime hook, so every static mirror shares one source.
async function buildCanonicalFullProtocolText(tag) {
  try {
    const content = await fs.readFile(sharedSyncInlinePath, "utf8");
    return extractSyncBody(content, tag);
  } catch {
    return null;
  }
}

async function buildSharedAiSddMarkerSection() {
  try {
    const content = await fs.readFile(sharedSyncInlinePath, "utf8");
    const blocks = sharedAiSddSyncTags.map((tag) => extractSyncBlock(content, tag)).filter(Boolean);
    if (blocks.length === 0) return null;

    return [
      "## Shared AI-SDD Protocol Markers",
      "",
      "Source: `.claude/skills/shared/sync-inline-versions.md`",
      "",
      blocks.join("\n\n---\n\n"),
    ].join("\n");
  } catch {
    return null;
  }
}

async function loadCkConfig() {
  try {
    const ckConfigRaw = await fs.readFile(ckConfigPath, "utf8");
    return JSON.parse(ckConfigRaw);
  } catch {
    return {};
  }
}

async function buildPromptProtocolMirrorSection(headingSuffix = "Auto-Synced") {
  return buildHooklessPromptProtocolMirrorSection(rootDir, {
    heading: `Prompt Protocol Mirror (${headingSuffix})`,
    includeLessonReminder: false,
    // This mirror is written into the git-tracked .codex/CODEX_CONTEXT.md, so it carries the
    // TEAM value. A developer's local override applies to their runtime prompt, never here.
    scope: "team",
  });
}

async function readWorkflowGateSource() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(rootDir, ".claude", "skills", "shared", "workflow-first-gate.md"),
    path.join(scriptDir, "..", "..", "skills", "shared", "workflow-first-gate.md"),
  ];
  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const gate = raw.match(/<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/)?.[0];
      if (gate) return gate;
    } catch {}
  }
  throw new Error(`Required workflow detail unavailable: ${candidates.join(", ")}`);
}

async function isTrackedWorkflowRoutingEnabled() {
  const ckConfig = await loadCkConfig();
  const configured = ckConfig?.portability?.projectConfigPath;
  const relativeConfigPath =
    typeof configured === "string" && configured.trim()
      ? configured.trim()
      : path.join("docs", "project-config.json");
  const projectConfigPath = path.isAbsolute(relativeConfigPath)
    ? relativeConfigPath
    : path.join(rootDir, relativeConfigPath);
  try {
    const projectConfig = JSON.parse(await fs.readFile(projectConfigPath, "utf8"));
    return projectConfig?.portability?.workflowAutoDetect !== false;
  } catch {
    return true;
  }
}

// Renders the Codex context mirror (CODEX_CONTEXT.md) and the AGENTS.md mirror into
// `outRootDir`. INPUTS/baselines are always read from the real repo (rootDir-anchored
// module constants); only the two OUTPUT writes are redirectable. main() passes
// outRootDir = rootDir (write back into the repo); the idempotency oracle passes a
// throwaway mkdtemp so it can diff a fresh render against the committed mirror without
// mutating the working tree.
export async function runContextSync({ outRootDir = rootDir } = {}) {
  const outContextPath = path.join(outRootDir, ".codex", "CODEX_CONTEXT.md");
  const outAgentsPath = path.join(outRootDir, "AGENTS.md");
  const claudeInstructionsRaw = await readClaudeInstructions();
  const skillNames = await fs
    .readdir(path.join(rootDir, ".claude", "skills"), { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const skillReferenceMap = buildSkillReferenceMap(skillNames);
  const topPromptProtocolSection = prependCodexCompatibilityNote(
    rewriteClaudeToolTermsForCodex(
      rewriteSkillMentionsForCodex(
        await buildPromptProtocolMirrorSection("Auto-Synced, Primacy Anchor"),
        skillReferenceMap
      )
    )
  );

  await fs.mkdir(path.dirname(outContextPath), { recursive: true });
  let contextMd = await readExistingContext();
  const promptProtocolTopBlock = `${PROMPT_PROTOCOLS_START}\n${topPromptProtocolSection}\n${PROMPT_PROTOCOLS_END}`;
  const trackedRoutingEnabled = await isTrackedWorkflowRoutingEnabled();
  const codexWorkflowGate = trackedRoutingEnabled
    ? rewriteClaudeToolTermsForCodex(
        rewriteSkillMentionsForCodex(await readWorkflowGateSource(), skillReferenceMap)
      )
    : null;

  // Keep one mirrored prompt protocol block at top; strip legacy bottom block if present.
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_START, PROMPT_PROTOCOLS_END);
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_BOTTOM_START, PROMPT_PROTOCOLS_BOTTOM_END);
  // Strip the unmanaged legacy static-parity duplicate before re-stamping; the managed Prompt
  // Protocol Mirror + Project Reference Gate below are the single home for that content.
  contextMd = stripLegacyHooklessParityBlock(contextMd);
  contextMd = stripManagedBlock(contextMd, "<!-- CK:WORKFLOW-GATE -->", "<!-- /CK:WORKFLOW-GATE -->");
  contextMd = [promptProtocolTopBlock, codexWorkflowGate, contextMd.trimStart()]
    .filter(Boolean)
    .join("\n\n");
  contextMd = upsertProjectReferenceGateSection(contextMd);

  contextMd = stripManagedBlock(contextMd, START_MARKER, END_MARKER);

  // Keep the full context Codex-safe, including previously static sections.
  contextMd = rewriteClaudeToolTermsForCodex(
    rewriteSkillMentionsForCodex(contextMd, skillReferenceMap)
  );
  contextMd = `${contextMd.trimEnd()}\n`;

  // De-duplicate the CLAUDE.md text BEFORE it is projected, so AGENTS.md
  // (= claudeMirror + contextMirror) carries each block exactly once:
  //   (1) the workflow-skills catalog is dropped entirely — the Codex context block (above)
  //       already carries it, and its opening marker would otherwise dangle in the preface;
  //   (2) the two FULL protocol blocks (critical-thinking + ai-mistake-prevention) keep their
  //       FIRST copy and drop any surplus. CLAUDE.md has stamped each block ONCE since the EOF
  //       recency copy was removed (2026-09-22), so this strip is now a SAFETY NET rather than a
  //       live de-duplication: it keeps the projection correct if a second copy is ever
  //       reintroduced upstream. Keep it — its cost is one pass, and P4 in
  //       protocol-text-parity.test.cjs guards the single-copy end state separately.
  //
  // The earlier rationale here claimed the CONTEXT mirror "canonical-bakes them too, so without a
  // GLOBAL strip they would appear three times". That stopped being true when
  // `buildAgentsContextMirrorBlock` became a POINTER (see :180-199) — it inlines nothing. The
  // global strip then removed both copies and nothing re-added them, so Codex got the
  // anti-hallucination protocol and the System Lessons ZERO times while Claude got them twice.
  //
  // Each regex is anchored to its exact CK marker pair so nothing beyond the block is removed.
  const stripSurplusBlocks = (text, startMarker, endMarker, keep = 1) => {
    let seen = 0;
    return text.replace(
      new RegExp(`${startMarker}[\\s\\S]*?${endMarker}\\n?`, "g"),
      match => (++seen <= keep ? match : "")
    );
  };
  const claudeInstructionsDeduped =
    typeof claudeInstructionsRaw === "string"
      ? stripSurplusBlocks(
          stripSurplusBlocks(
            claudeInstructionsRaw.replace(
              new RegExp(`${CK_SKILLS_START}[\\s\\S]*?${CK_SKILLS_END}\\n?`, "m"),
              ""
            ),
            CK_CRIT_START,
            CK_CRIT_END
          ),
          CK_AIMP_START,
          CK_AIMP_END
        )
      : claudeInstructionsRaw;
  const claudeInstructionsMd = claudeInstructionsDeduped
    ? rewriteClaudeToolTermsForCodex(
        rewriteSkillMentionsForCodex(claudeInstructionsDeduped, skillReferenceMap)
      )
    : null;

  await fs.writeFile(outContextPath, contextMd, "utf8");
  await upsertContextIntoAgents(contextMd, claudeInstructionsMd, outAgentsPath);
  console.log(
    `[codex-context-sync] ${trackedRoutingEnabled ? "synchronized" : "disabled"} workflow routing in ${path.relative(rootDir, outContextPath)} and mirrored CLAUDE.md + context into ${path.relative(rootDir, outAgentsPath)}`
  );
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  await runContextSync();
}

// Exported so the compliance verifier reads the budget from its PRODUCER instead of keeping a second
// copy of the number. The two drifted once already: this limit was raised to 49152 here while
// `verify-skill-protocol-compliance.mjs` kept 32768, so a projection this generator considered valid
// failed its own pipeline gate.
export {
  contextPath,
  agentsPath,
  AGENTS_ROOT_LIMIT_BYTES,
};
