---
name: project-help
description: '[Utilities] Use when asking what the .claude framework does for THIS project — how it is configured, which skills/agents/workflows exist, what the reference docs are for, and the key technical, architecture, and structure facts of the project.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Answer anything about (a) the portable `.claude` framework **as configured for this project** and (b) this project's own key technical, architecture, and structural knowledge — from generated output, never from memory.

**Workflow:**

1. **Classify** the question against the routing table below.
2. **Run** the matching generator command. Never answer from recall.
3. **Present** the output verbatim, then add only the interpretation the user asked for.
4. **Route onward** when the question belongs to a narrower help surface (`/project-config --help`, `/project-init --help`).

**Key Rules:**

- MUST ATTENTION this skill is **read-only and terminal**. It creates no tasks, runs no scan, edits no file, and never proposes a change. If the user wants a change afterwards, hand off to `/project-config` or `/project-init`.
- MUST ATTENTION every number, path, and name in the answer comes from a command run **in this session**. The framework and the config both drift; a memorised count is a hallucination with a plausible shape.
- Show the generator output verbatim before commenting on it. Do not summarise it away.
- Config **option** questions ("what can I set", "who reads `docsRoots`") belong to `/project-config --help` — delegate rather than duplicating.
- Never print secrets. The config holds references only; if a value looks like a credential, report the key and stop.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Scope

**In scope:** what the framework is, what each of its layers does, which skills/agents/workflows/hooks exist here, which reference docs exist and what each is for, how the mirrors are generated, this project's stack, structure, module map, and verification commands.

**Out of scope:** changing configuration (`/project-config`), initialising or re-initialising a project (`/project-init`), generic ClaudeKit command usage unrelated to this project (`/ck-help`), and any implementation work.

## Routing table

| The user asks… | Run |
|---|---|
| "what is this `.claude` thing / how is it wired / what are the layers" | `node .claude/skills/project-help/scripts/project-overview.cjs --framework` |
| "what skills do I have / is there a skill for X" | `node .claude/skills/project-help/scripts/project-overview.cjs --skills` (or `--skills=<term>`) |
| "what is the structure of this project / where does code live" | `node .claude/skills/project-help/scripts/project-overview.cjs --structure` |
| "what stack / architecture / database / deployment" | `node .claude/skills/project-help/scripts/project-overview.cjs --stack` |
| "how do I test / verify / what command do I run" | `node .claude/skills/project-help/scripts/project-overview.cjs --commands` |
| "what docs exist / which doc do I read for X" | `node .claude/skills/project-help/scripts/project-overview.cjs --docs` |
| "tell me everything" / no clear target | `node .claude/skills/project-help/scripts/project-overview.cjs --all` |
| "what can I configure / who reads option X" | `node .claude/skills/project-config/scripts/project-config-help.cjs --overview` — then delegate to `/project-config --help` |
| "which skills consume which option" | `node .claude/skills/project-config/scripts/project-config-help.cjs --consumers` |
| "where do specs/plans/ADRs live" (roots and tokens) | `node .claude/skills/project-config/scripts/project-config-help.cjs --roots` |
| "what does init decide" | `/project-init --help` |

A bare `--skills=<term>` argument filters the catalog; use it instead of guessing whether a skill exists.

## The two generators

Both are plain `node` entrypoints using only `node:` built-ins (PORT-001). Neither takes a host `package.json` script, and both resolve the repository root by walking up for a marker, so they also run from the `.agents/` mirror.

- **`.claude/skills/project-help/scripts/project-overview.cjs`** — framework inventory and project knowledge. Reads `.claude/.ck.json`, the project-config file it points at, and the live contents of `.claude/{skills,agents,workflows,hooks}`. Modes: `--framework`, `--skills[=<term>]`, `--structure`, `--stack`, `--commands`, `--docs`, `--all` (default).
- **`.claude/skills/project-config/scripts/project-config-help.cjs`** — the configuration option surface. Reads the config SCHEMA, the portability tokens, and the reference-doc registry, then counts consumers by scanning the framework tree. Modes: `--overview` (default), `--sections`, `--section=<name>`, `--consumers[=<key>]`, `--docs`, `--roots`, `--skills`, `--current`, `--search=<term>`, `--json`, `--help`.

## Presentation rules

- Print the command you ran, then its output verbatim, then your interpretation — in that order, so the user can re-run it.
- Consumer counts are **name-reference counts**, not a call graph: a skill that mentions an option in prose counts. Say so whenever you quote one.
- `--current` in the config helper reports declared-vs-defaulted only; validity is `/project-config --validate`, not this skill.
- When a doc is listed as configured but missing on disk, report the gap and name the owning `/scan --target=…`; do not offer to create it here.
- If the user's real question is "change this", stop answering and route: `/project-config` for an existing project, `/project-init` for an uninitialised one.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced proof per claim, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
