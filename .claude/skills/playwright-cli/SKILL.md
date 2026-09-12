---
name: playwright-cli
description: '[Testing] Automate browser interactions, test web pages, and work with Playwright tests.'
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Browser Automation with playwright-cli

## Quick Summary

Use for configured web E2E interaction, visible human-QC journeys, evidence
capture, and Playwright test support. Read the project E2E config/reference
first; never infer startup, auth, seed data, or secrets.

## Quick start

```bash
# open new browser
playwright-cli open
# navigate to a page
playwright-cli goto https://playwright.dev
# interact with the page using refs from the snapshot
playwright-cli click e15
playwright-cli type "page.click"
playwright-cli press Enter
# take a screenshot (rarely used, as snapshot is more common)
playwright-cli screenshot
# close the browser
playwright-cli close
```

## E2E human-QC contract

Use this skill for the browser interaction/evidence part of a configured E2E
run. The caller must first resolve `docs/project-config.json` →
`e2eTesting.execution` and the linked `experienceVerification` surface; this
skill does not invent the app URL, startup command, account, seed data, or
runner dependency.

- Keep the browser visible for human-QC (`headed`), and record the viewport,
  device, locale, and network conditions. Use the project's configured runner
  path; `npx --no-install` is preferred when the project has a local CLI.
- Attach/read `console`, `requests`, page errors, screenshots, traces, and
  video when configured. Capture starts before the first interaction, artifacts
  are inspected rather than merely created, and sensitive values are redacted
  before saving or reporting.
- Use one reusable, parameterized `waitUntil(condition, options)` helper for
  every interactive step. Before each browser operation that activates or
  changes a UI control — click/tap, fill/type, key press, select, check/uncheck,
  drag/drop, upload, or behavior-exercising hover — wait for readiness,
  actionability, and any applicable blocking error-alert absence. After the
  operation, wait for the expected positive/negative outcome, including
  dropdown/menu options before selection, selected state after selection, or
  an expected error alert present/absent; then wait exactly **500ms**. The
  helper must use a bounded timeout/poll interval and diagnostic condition
  description. This is mandatory presentation pacing for automated and visible
  human-QC runs; it is never a readiness wait, never replaces a real settle
  signal, and never wraps a failing assertion.
- Load `storageStateRef` only from a project-owned secure reference/path. Do
  not paste cookies, tokens, passwords, localStorage, request headers, or raw
  storage state into prompts, reports, screenshots, traces, or shell history.
  Treat `state-save`, `cookie-*`, and `localstorage-*` output as sensitive.
- Do not use request mocking, direct state mutation, or browser storage writes
  to bypass the real user journey unless the configured scenario explicitly
  identifies it as a non-production setup step and the evidence records it.

## Commands

### Core

```bash
playwright-cli open
# open and navigate right away
playwright-cli open https://example.com/
playwright-cli goto https://playwright.dev
playwright-cli type "search query"
playwright-cli click e3
playwright-cli dblclick e7
# --submit presses Enter after filling the element
playwright-cli fill e5 "user@example.com"  --submit
playwright-cli drag e2 e8
# drop files or data onto an element (from outside the page)
playwright-cli drop e4 --path=./image.png
playwright-cli drop e4 --data="text/plain=hello world"
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli upload ./document.pdf
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli snapshot
# search the snapshot for text or a regexp, returns matching nodes with surrounding context
playwright-cli find "Sign in"
playwright-cli find --regex "Sign (in|up)"
# wrap the regexp in slashes to add flags, e.g. /i for case-insensitive
playwright-cli find --regex "/sign (in|up)/i"
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
# get element id, class, or any attribute not visible in the snapshot
playwright-cli eval "el => el.id" e5
playwright-cli eval "el => el.getAttribute('data-testid')" e5
playwright-cli dialog-accept
playwright-cli dialog-accept "confirmation text"
playwright-cli dialog-dismiss
playwright-cli resize 1920 1080
playwright-cli close
```

### Navigation

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### Keyboard

```bash
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli keydown Shift
playwright-cli keyup Shift
```

### Mouse

```bash
playwright-cli mousemove 150 300
playwright-cli mousedown
playwright-cli mousedown right
playwright-cli mouseup
playwright-cli mouseup right
playwright-cli mousewheel 0 100
```

### Save as

```bash
playwright-cli screenshot
playwright-cli screenshot e5
playwright-cli screenshot --filename=page.png
playwright-cli screenshot --hires
playwright-cli pdf --filename=page.pdf
```

### Tabs

```bash
playwright-cli tab-list
playwright-cli tab-new
playwright-cli tab-new https://example.com/page
playwright-cli tab-close
playwright-cli tab-close 2
playwright-cli tab-select 0
```

### Storage

```bash
playwright-cli state-save
playwright-cli state-save auth.json
playwright-cli state-load auth.json

# Cookies
playwright-cli cookie-list
playwright-cli cookie-list --domain=example.com
playwright-cli cookie-get session_id
playwright-cli cookie-set session_id abc123
playwright-cli cookie-set session_id abc123 --domain=example.com --httpOnly --secure
playwright-cli cookie-delete session_id
playwright-cli cookie-clear

# LocalStorage
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark
playwright-cli localstorage-delete theme
playwright-cli localstorage-clear

# SessionStorage
playwright-cli sessionstorage-list
playwright-cli sessionstorage-get step
playwright-cli sessionstorage-set step 3
playwright-cli sessionstorage-delete step
playwright-cli sessionstorage-clear
```

### Network

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
playwright-cli route-list
playwright-cli unroute "**/*.jpg"
playwright-cli unroute
```

### DevTools

```bash
playwright-cli console
playwright-cli console warning
playwright-cli requests
playwright-cli request 5
playwright-cli run-code "async page => await page.context().grantPermissions(['geolocation'])"
playwright-cli run-code --filename=script.js
playwright-cli tracing-start
playwright-cli tracing-stop

# record user actions in the browser, print them as Playwright code on stop
playwright-cli recording-start
playwright-cli recording-stop

playwright-cli video-start video.webm
playwright-cli video-chapter "Chapter Title" --description="Details" --duration=2000
playwright-cli video-stop

# annotate each subsequent action (click, type, ...) with a callout naming the action and highlighting the target
playwright-cli video-show-actions --duration=600 --position=top-right
playwright-cli video-hide-actions

# launch the dashboard for UI review / design feedback — user annotates the page, you receive the annotated screenshot, snapshot, and notes
playwright-cli show --annotate

# generate a Playwright locator for an element from its ref or selector
playwright-cli generate-locator e5 --raw

# show a persistent highlight overlay for an element, optionally with a custom style
playwright-cli highlight e5
playwright-cli highlight e5 --style="outline: 3px dashed red"
# hide a single element highlight, or all page highlights when no target is given
playwright-cli highlight e5 --hide
playwright-cli highlight --hide
```

## Raw output

The global `--raw` option strips page status, generated code, and snapshot sections from the output, returning only the result value. Use it to pipe command output into other tools. Commands that don't produce output return nothing.

```bash
playwright-cli --raw eval "JSON.stringify(performance.timing)" | jq '.loadEventEnd - .navigationStart'
playwright-cli --raw eval "JSON.stringify([...document.querySelectorAll('a')].map(a => a.href))" > links.json
playwright-cli --raw snapshot > before.yml
playwright-cli click e5
playwright-cli --raw snapshot > after.yml
diff before.yml after.yml
TOKEN=$(playwright-cli --raw cookie-get session_id)
playwright-cli --raw localstorage-get theme
```

For structured output wrapping every reply as JSON, pass --json
```bash
playwright-cli list --json
```

## Open parameters
```bash
# Use specific browser when creating session
playwright-cli open --browser=chrome
playwright-cli open --browser=firefox
playwright-cli open --browser=webkit
playwright-cli open --browser=msedge

# Emulate a generic mobile device (Pixel 10 for Chromium, iPhone 17 for WebKit).
# Prefer this when a mobile layout is acceptable: mobile pages are usually
# lighter, so snapshots are smaller and cheaper.
playwright-cli open --mobile
playwright-cli open --device="iPhone 15"

# Use persistent profile (by default profile is in-memory)
playwright-cli open --persistent
# Use persistent profile with custom directory
playwright-cli open --profile=/path/to/profile

# Connect to browser via Playwright Extension
playwright-cli attach --extension=chrome

# Connect to a running Chrome or Edge by channel name
playwright-cli attach --cdp=chrome
playwright-cli attach --cdp=msedge

# Connect to a running browser via CDP endpoint
playwright-cli attach --cdp=http://localhost:9222

# Start with config file
playwright-cli open --config=my-config.json

# Close the browser
playwright-cli close
# Detach from an attached browser (leaves the external browser running)
playwright-cli -s=msedge detach
# Delete user data for the default session
playwright-cli delete-data
```

## URLs with `&` on Windows

On Windows, `cmd.exe` and PowerShell treat `&` as a command separator, so URLs with multiple query parameters get truncated before `playwright-cli` runs. Escape `&` with `^&` in `cmd.exe`, or use `--%` in PowerShell:

```batch
playwright-cli goto "https://example.com/?a=1^&b=2"
```

```powershell
playwright-cli --% goto "https://example.com/?a=1&b=2"
```

## Snapshots

After each command, playwright-cli provides a snapshot of the current browser state.

```bash
> playwright-cli goto https://example.com
### Page
- Page URL: https://example.com/
- Page Title: Example Domain
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

You can also take a snapshot on demand using `playwright-cli snapshot` command. All the options below can be combined as needed.

```bash
# default - save to a file with timestamp-based name
playwright-cli snapshot

# save to file, use when snapshot is a part of the workflow result
playwright-cli snapshot --filename=after-click.yaml

# snapshot an element instead of the whole page
playwright-cli snapshot "#main"

# limit snapshot depth for efficiency, take a partial snapshot afterwards
playwright-cli snapshot --depth=4
playwright-cli snapshot e34

# include each element's bounding box as [box=x,y,width,height]
playwright-cli snapshot --boxes

# search a large snapshot instead of capturing it all — returns matching nodes
# with 3 lines of context around each match (like grep -C)
playwright-cli find "Add to cart"
playwright-cli find --regex "\\$[0-9]+\\.[0-9]{2}"
```

## Targeting elements

By default, use refs from the snapshot to interact with page elements.

```bash
# get snapshot with refs
playwright-cli snapshot

# interact using a ref
playwright-cli click e15
```

You can also use css selectors or Playwright locators.

```bash
# css selector
playwright-cli click "#main > button.submit"

# role locator
playwright-cli click "getByRole('button', { name: 'Submit' })"

# test id
playwright-cli click "getByTestId('submit-button')"
```

## Browser Sessions

```bash
# create new browser session named "mysession" with persistent profile
playwright-cli -s=mysession open example.com --persistent
# same with manually specified profile directory (use when requested explicitly)
playwright-cli -s=mysession open example.com --profile=/path/to/profile
playwright-cli -s=mysession click e6
playwright-cli -s=mysession close  # stop a named browser
playwright-cli -s=mysession delete-data  # delete user data for persistent session

playwright-cli list
# Close all browsers
playwright-cli close-all
# Forcefully kill all browser processes
playwright-cli kill-all
```

## Installation

If global `playwright-cli` command is not available, try a local version via `npx playwright cli`:

```bash
npx --no-install playwright --version
```

When local version is available, use `npx playwright cli` in all commands. Otherwise, install `playwright-cli` as a global command:

```bash
npm install -g @playwright/cli@latest
```

## Example: Form submission

```bash
playwright-cli open https://example.com/form
playwright-cli snapshot

playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "password123"
playwright-cli click e3
playwright-cli snapshot
playwright-cli close
```

## Example: Multi-tab workflow

```bash
playwright-cli open https://example.com
playwright-cli tab-new https://example.com/other
playwright-cli tab-list
playwright-cli tab-select 0
playwright-cli snapshot
playwright-cli close
```

## Example: Debugging with DevTools

```bash
playwright-cli open https://example.com
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli console
playwright-cli requests
playwright-cli close
```

```bash
playwright-cli open https://example.com
playwright-cli tracing-start
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli tracing-stop
playwright-cli close
```

## Example: Interactive session

Ask the user for UI review or design feedback. The user draws boxes on the live page and types comments; you receive the annotated screenshot, the snapshot of the marked region, and the user's notes. Use this whenever the user asks for "UI review", "design feedback", or to "ask the user what they think / want / mean":

```bash
playwright-cli open https://example.com
playwright-cli show --annotate
```

## Specific tasks

* **Running and Debugging Playwright tests** [references/playwright-tests.md](references/playwright-tests.md)
* **Request mocking** [references/request-mocking.md](references/request-mocking.md)
* **Running Playwright code** [references/running-code.md](references/running-code.md)
* **Browser session management** [references/session-management.md](references/session-management.md)
* **Storage state (cookies, localStorage)** [references/storage-state.md](references/storage-state.md)
* **Test generation (plan / generate / heal)** [references/test-generation.md](references/test-generation.md)
* **Tracing** [references/tracing.md](references/tracing.md)
* **Video recording** [references/video-recording.md](references/video-recording.md)
* **Inspecting element attributes** [references/element-attributes.md](references/element-attributes.md)

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:e2e-visual-design-contract -->

> **E2E Visual Design Contract** — Binds when this skill or agent handles `--visual-review=true`, screenshot/recording evidence, human-QC of a user-facing UI, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`, plus the resolved `design-system/README.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`, `.claude/docs/design-knowledge.md`, and `.claude/docs/design-review-checklist.md`; record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing capability — never invent tokens, components, breakpoints, type, CSS/BEM, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `/design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI architecture before generation or UI fixes.** Inventory related screens, flows, and components; classify each relevant component `Common`, `Domain-Shared`, or `Page`; record its base abstraction and owner; reuse/compose before creating; record why reuse does not fit; keep one owner for markup, selectors, styling, lifecycle, and lower-tier test contracts. Page tests cover composition/outcomes, not copied lower-tier behavior.
> 4. **Separate review owners.** Use `/experience-review` for the running surface and opened/read screenshot evidence; route source-only token, BEM/SCSS, z-index, component ownership, reuse, and static design findings to `/ui-review`. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Gate every visual round.** Capture every declared state × viewport (including loading, empty, error, permission, post-submit, and full-page where applicable), open/read each artifact, and record state, viewport, location, and measured values. `UI-*`/accessibility/layout-floor and `P0`–`P2` `CL-*` findings are `BLOCKING`; `DD-*` identity/polish is `ADVISORY` unless the governing brief/project contract makes it objectively required. Unmeasurable values are `NOT VERIFIABLE`; never promote a baseline/expectation automatically.
> 6. **Report the contract.** Persist authority paths and resolution status, component tier/base/owner/reuse decisions, matrix coverage, `UI`/`DD`/`CL` coverage or skips, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

<!-- /SYNC:e2e-visual-design-contract -->



<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system/SCSS/frontend decisions plus `UI-*`/`DD-*`/`CL-*` roles, classifies Common/Domain-Shared/Page ownership and reuse, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, reads every state × viewport artifact, treats UI/accessibility-floor findings as blocking and DD identity/polish as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

## Closing Reminders
