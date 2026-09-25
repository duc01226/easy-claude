---
name: pdf-convert
version: 2.0.0
description: '[Document Processing] Use when converting between PDF and Markdown — text-extractable PDFs to Markdown (scanned PDFs are detected and reported, not OCR''d), or Markdown to PDF with syntax highlighting and custom CSS. Flag: --to={markdown|pdf}.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Convert PDF to Markdown, or Markdown to PDF, through one entry point.

**Workflow:**

1. **Pick a direction** — `--to markdown` (PDF in, Markdown out) or `--to pdf` (Markdown in, PDF out)
2. **Install that direction** — each one has its own `package.json`; install only the one you need
3. **Convert** — run `scripts/convert.cjs --to <direction>` with the direction's own options
4. **Output** — the converter returns JSON with the success status and output path

**Key Rules:**

- `--to` is required. There is no default direction — converting the wrong way silently is worse than an error.
- Every other argument is passed straight to the chosen converter, so each direction keeps its own CLI.
- Dependencies are per direction: `--to markdown` never pulls in the PDF renderer, and vice versa.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# pdf-convert

Convert PDF files to Markdown (with automatic detection of native text vs scanned documents) and
Markdown files to high-quality PDF (with code syntax highlighting and custom CSS).

## Directions

| Flag              | Converts        | Lives in     | Dependencies                             |
| ----------------- | --------------- | ------------ | ---------------------------------------- |
| `--to markdown`   | PDF → Markdown  | `to-markdown/` | `@opendocsg/pdf2md`, `pdfjs-dist`      |
| `--to pdf`        | Markdown → PDF  | `to-pdf/`      | `md-to-pdf`, `gray-matter`             |

## Installation Required

**Each direction installs separately.** Install only the one you need:

```bash
# PDF -> Markdown
cd .claude/skills/pdf-convert/to-markdown
npm install

# Markdown -> PDF
cd .claude/skills/pdf-convert/to-pdf
npm install
```

`ck init` (which runs `install.sh`) handles every skill at once.

**Note:** `--to pdf` may download Chromium (~150MB) on first run unless system Chrome is detected.
OCR for scanned PDFs under `--to markdown` needs extra setup (see OCR Setup below).

## Quick Start

```bash
# PDF -> Markdown (auto-detects native text vs scanned)
node .claude/skills/pdf-convert/scripts/convert.cjs --to markdown --input ./document.pdf

# PDF -> Markdown with an explicit output path and forced native mode
node .claude/skills/pdf-convert/scripts/convert.cjs --to markdown -i ./doc.pdf -o ./out.md --mode native

# Markdown -> PDF
node .claude/skills/pdf-convert/scripts/convert.cjs --to pdf --input ./README.md

# Markdown -> PDF with custom CSS
node .claude/skills/pdf-convert/scripts/convert.cjs --to pdf -i ./doc.md --css ./my-style.css
```

`--to=markdown` and `--to markdown` are equivalent. A missing or unknown `--to` prints the valid
directions and exits 1.

## CLI Options

### Dispatcher

| Option   | Description                                    | Default    |
| -------- | ---------------------------------------------- | ---------- |
| `--to`   | Conversion direction: `markdown` or `pdf`      | (required) |

### `--to markdown` (PDF → Markdown)

| Option     | Short | Description                              | Default      |
| ---------- | ----- | ---------------------------------------- | ------------ |
| `--input`  | `-i`  | Input PDF file path                      | (required)   |
| `--output` | `-o`  | Output markdown file path                | `{input}.md` |
| `--mode`   | `-m`  | Conversion mode: `auto`, `native`, `ocr` | `auto`       |
| `--help`   | `-h`  | Show help message                        |              |

### `--to pdf` (Markdown → PDF)

| Option           | Short | Description                 | Default       |
| ---------------- | ----- | --------------------------- | ------------- |
| `--input`        | `-i`  | Input markdown file path    | (required)    |
| `--output`       | `-o`  | Output PDF file path        | `{input}.pdf` |
| `--css`          | `-c`  | Custom CSS file path        | built-in      |
| `--no-highlight` |       | Disable syntax highlighting | false         |
| `--help`         | `-h`  | Show help message           |               |

Run `scripts/convert.cjs --to <direction> --help` to see a direction's full help.

## Features

**PDF → Markdown**

- **Auto-Detection:** determines whether the PDF has native text or needs OCR
- **Native PDFs:** fast extraction via `@opendocsg/pdf2md`
- **Tables:** basic table structure preservation
- **No System Dependencies:** pure JavaScript

**Markdown → PDF**

- **Syntax Highlighting:** code blocks rendered with highlight.js
- **Custom CSS:** override the default stylesheet with your own
- **System Chrome:** uses installed Chrome/Chromium when available
- **Frontmatter Support:** YAML frontmatter supplies the title and metadata

Both directions work on Windows, macOS and Linux.

## Conversion Modes (`--to markdown`)

### Auto (default)

Checks whether the first page has extractable text. Uses native extraction if it does, otherwise
reports that the document appears to be scanned.

### Native

Fast direct text extraction. Best for PDFs with selectable text.

### OCR (scanned PDFs) — coming soon

Not yet implemented; the skill tells you when a PDF appears to be scanned.

## Default Styling (`--to pdf`)

- Serif body font (Georgia), monospace code font (Consolas/Monaco)
- 2cm page margins
- Code block background highlighting
- Table borders with alternating row colors

Override any of it with `--css`.

## Output

Both directions return JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.pdf",
    "output": "/path/to/output.md",
    "stats": {
        "pages": 5,
        "mode": "native"
    }
}
```

`--to pdf` returns `pages` instead of `stats`. On failure both return
`{ "success": false, "error": "..." }` and exit 1.

## Limitations

- Complex multi-column layouts may not preserve structure
- Scanned PDF OCR accuracy depends on image quality
- Mathematical formulas may not convert perfectly
- First-run OCR downloads language data (~15MB)
- Large documents converted to PDF may need more memory — consider splitting the input

## OCR Setup (optional)

For scanned PDF support, add these to the `to-markdown` direction:

```bash
cd .claude/skills/pdf-convert/to-markdown
npm install tesseract.js pdfjs-dist canvas
```

**Note:** the `canvas` package may require build tools on some systems.

## Troubleshooting

**Chrome not found (`--to pdf`):** the converter downloads Chromium automatically. Set
`PUPPETEER_SKIP_DOWNLOAD=1` to prevent that.

**Missing dependencies:** the error output carries a `hint` with the exact `cd … && npm install`
command for the direction you invoked.

**Font issues:** embed fonts via CSS `@font-face` with base64-encoded fonts for consistent rendering.

## Tests

```bash
cd .claude/skills/pdf-convert && node tests/dispatcher.test.cjs   # routing and --to validation
cd .claude/skills/pdf-convert/to-markdown && node tests/run-tests.cjs
cd .claude/skills/pdf-convert/to-pdf && node tests/run-tests.cjs
```

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert PDF to Markdown, or Markdown to PDF, through one entry point — `scripts/convert.cjs --to {markdown|pdf}`.

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
