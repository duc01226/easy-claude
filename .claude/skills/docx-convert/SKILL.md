---
name: docx-convert
version: 2.0.0
description: '[Document Processing] Use when converting between Word DOCX and Markdown — DOCX to Markdown with GFM support, or Markdown to DOCX with GFM and math rendering. Flag: --to={markdown|docx}.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Convert Word DOCX to Markdown, or Markdown to Word DOCX, through one entry point.

**Workflow:**

1. **Pick a direction** — `--to markdown` (DOCX in, Markdown out) or `--to docx` (Markdown in, DOCX out)
2. **Install that direction** — each one has its own `package.json`; install only the one you need
3. **Convert** — run `scripts/convert.cjs --to <direction>` with the direction's own options
4. **Output** — the converter returns JSON with the success status and output path

**Key Rules:**

- `--to` is required. There is no default direction — converting the wrong way silently is worse than an error.
- Every other argument is passed straight to the chosen converter, so each direction keeps its own CLI.
- Dependencies are per direction: `--to markdown` never pulls in the DOCX writer, and vice versa.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# docx-convert

Convert Microsoft Word (.docx) files to GitHub-Flavored Markdown, and Markdown files to editable
Word documents with tables, code blocks, images and LaTeX math.

## Directions

| Flag            | Converts        | Lives in       | Dependencies                             |
| --------------- | --------------- | -------------- | ---------------------------------------- |
| `--to markdown` | DOCX → Markdown | `to-markdown/` | `mammoth`, `turndown`, `turndown-plugin-gfm` |
| `--to docx`     | Markdown → DOCX | `to-docx/`     | `markdown-docx`, `gray-matter`           |

## Installation Required

**Each direction installs separately.** Install only the one you need:

```bash
# DOCX -> Markdown
cd .claude/skills/docx-convert/to-markdown
npm install

# Markdown -> DOCX
cd .claude/skills/docx-convert/to-docx
npm install
```

`ck init` (which runs `install.sh`) handles every skill at once.

## Quick Start

```bash
# DOCX -> Markdown
node .claude/skills/docx-convert/scripts/convert.cjs --to markdown --input ./document.docx

# DOCX -> Markdown, extracting images to a folder instead of inlining base64
node .claude/skills/docx-convert/scripts/convert.cjs --to markdown -i ./doc.docx --images ./images/

# Markdown -> DOCX
node .claude/skills/docx-convert/scripts/convert.cjs --to docx --input ./README.md

# Markdown -> DOCX with a custom theme
node .claude/skills/docx-convert/scripts/convert.cjs --to docx -i ./doc.md --theme ./theme.json
```

`--to=markdown` and `--to markdown` are equivalent. A missing or unknown `--to` prints the valid
directions and exits 1.

## CLI Options

### Dispatcher

| Option   | Description                                 | Default    |
| -------- | ------------------------------------------- | ---------- |
| `--to`   | Conversion direction: `markdown` or `docx`  | (required) |

### `--to markdown` (DOCX → Markdown)

| Option     | Short | Description                    | Default       |
| ---------- | ----- | ------------------------------ | ------------- |
| `--input`  | `-i`  | Input DOCX file path           | (required)    |
| `--output` | `-o`  | Output markdown file path      | `{input}.md`  |
| `--images` |       | Directory for extracted images | inline base64 |
| `--help`   | `-h`  | Show help message              |               |

### `--to docx` (Markdown → DOCX)

| Option     | Short | Description         | Default        |
| ---------- | ----- | ------------------- | -------------- |
| `--input`  | `-i`  | Input markdown file | (required)     |
| `--output` | `-o`  | Output DOCX path    | `{input}.docx` |
| `--theme`  | `-t`  | Custom theme JSON   | built-in       |
| `--title`  |       | Document title      | filename       |
| `--help`   | `-h`  | Show help           |                |

Run `scripts/convert.cjs --to <direction> --help` to see a direction's full help.

## Features

**DOCX → Markdown**

- **GFM Tables:** Word tables become markdown tables
- **Images:** embedded images extracted (base64 inline, or written to a folder)
- **Lists:** ordered and unordered lists preserved
- **Code Blocks:** monospace text converted to code blocks
- **Links and Headings:** hyperlinks and heading levels maintained

**Markdown → DOCX**

- **GFM Support:** tables, strikethrough, task lists
- **Code Blocks:** syntax preserved with a monospace font
- **Images:** local and URL images embedded
- **Math:** LaTeX equations rendered by default (`$...$`, `$$...$$`)
- **Frontmatter:** YAML metadata supplies the title
- **No System Dependencies:** pure JavaScript, no Chrome needed

Both directions work on Windows, macOS and Linux.

## Conversion Pipeline (`--to markdown`)

```
DOCX → mammoth → HTML → turndown → Markdown
```

The two-stage conversion follows mammoth's official recommendation for best results.

## Output

Both directions return JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.docx",
    "output": "/path/to/output.md",
    "stats": {
        "images": 3,
        "tables": 2,
        "headings": 5
    }
}
```

`--to docx` omits `stats`. On failure both return `{ "success": false, "error": "..." }` and exit 1.

## Compatibility (`--to docx`)

Generated DOCX files open in Microsoft Word (2007+), Google Docs, LibreOffice Writer and Apple Pages.

## Limitations

- Complex layouts (columns, text boxes) may not preserve structure
- Merged table cells produce basic markdown tables
- Comments and track changes are stripped
- Some formatting (fonts, colors) is lost in conversion

## Troubleshooting

**Missing dependencies:** the error output carries a `hint` with the exact `cd … && npm install`
command for the direction you invoked.

## Tests

```bash
cd .claude/skills/docx-convert && node tests/dispatcher.test.cjs   # routing and --to validation
cd .claude/skills/docx-convert/to-markdown && node tests/run-tests.cjs
cd .claude/skills/docx-convert/to-docx && node tests/run-tests.cjs
```

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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert Word DOCX to Markdown, or Markdown to Word DOCX, through one entry point — `scripts/convert.cjs --to {markdown|docx}`.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Sequential thinking, traced `file:line` proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** `--to` is required — never guess the direction for the user
**IMPORTANT MUST ATTENTION** each direction installs its own dependencies; the error `hint` names the exact directory
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
