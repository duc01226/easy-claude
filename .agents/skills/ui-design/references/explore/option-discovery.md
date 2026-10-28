# Option Discovery — research, then style × layout options the owner picks or mixes

> **Purpose:** research the top style families and the best layout archetypes for the subject, build N options (default 3) as real drafts that each pair a different style with a different layout, show them side by side with the research board as evidence, and let the owner pick one or mix them ("the style of B with the layout of A"). It implements `SYNC:visual-option-discovery` (`VO-1`–`VO-9`); read `.claude/skills/shared/protocols/visual-option-discovery.md` when the body is not already in context.
>
> **Critical rules (read first):**
>
> 1. **Journey first, still.** Research starts only after the Journey Report (`UX-1`) and the design-authority read (`UX-2`) of explore Step 1. Every option serves the same main journeys and information priority.
> 2. **Two separable axes.** Every option is one style family plus one layout archetype; no style or layout is used twice, and each draft keeps its style separable from its layout so a mix can be rebuilt from the named parts.
> 3. **Shared tools, private output.** Capture with `.claude/skills/html-export/scripts/capture-sites.cjs` and assemble with `.claude/skills/ui-design/scripts/build-board.cjs`. Every worker writes only its own folder under `tmp/design/<run>/`; nothing is published.

Read this file when explore runs with option discovery: from `$ui-design --mode=explore`, or from `$work-item --mode=mockup --explore` through `work-item/references/mockup-explore-directions.md`. Create ONE task per step (D0–D7).

## Contents

- [When it runs](#when-it-runs)
- [D0 — Set the axes](#d0--set-the-axes)
- [D1 — Shortlist styles and layouts](#d1--shortlist-styles-and-layouts)
- [D2 — Capture the evidence](#d2--capture-the-evidence)
- [D3 — Assemble the research board](#d3--assemble-the-research-board)
- [D4 — Compose the options](#d4--compose-the-options)
- [D5 — Build and compare](#d5--build-and-compare)
- [D6 — Pick or mix](#d6--pick-or-mix)
- [D7 — Broaden, at most twice](#d7--broaden-at-most-twice)
- [Defaults](#defaults)
- [options.json and the drafts manifest](#optionsjson-and-the-drafts-manifest)
- [Closing Reminders](#closing-reminders)

## When it runs

| Explore step | Option discovery |
| --- | --- |
| Step 0 | The owner chose `Option board → 3 drafts`, or the caller forced it (`--explore=styles` / `--explore=layouts`). With plain `N drafts`, explore runs as written and this file is not read. With no question tool, Step 0 already fixed one auto-selected draft: option discovery does not run, whatever the flag, and that is recorded. |
| Steps 1–2 | Journey Report, design-authority read, axis authority, fact check: unchanged. |
| Step 3 | D0–D4 here, in place of the single reference question. There is no question at this point: the options are built straight after the research. |
| Steps 4–8 | Imagery, canvas and Design Plan skeleton, then D5: the N drafts are seeded from the D4 combinations and rendered. |
| Step 9 | D6: the pick or mix question. |
| Step 10 | Record the pick, including the source of each part of a mix. |

- **Only in explore, only in the main session.** It runs inside `$ui-design --mode=explore` and `$work-item --mode=mockup --explore`, never in `fast`, `good` or a mock-up without `--explore`; when an owner asks to see design options, route there. A delegated sub-agent never runs it: it cannot ask the owner, and D2 would be a second level of fan-out. A sub-agent builds only the draft or capture it is briefed with.
- **Brand assets still apply:** when the brief names a real brand, run `references/explore/brand-asset-protocol.md` beside D1–D3. Brand facts are pins (`VO-1`).
- **May start early:** research needs the scope-gate answer, the Journey Report and the design-authority read (explore Step 1, or mock-up Steps 2a, 3 and 3b) for a reviewed source. Once the main session has them, it may dispatch the D2 researchers itself and continue other planning while they capture; record the early start in the run's deviation log. Before D4, compare the current Journey Report and key views with those the researchers were briefed on; on a change, re-brief only the affected views and record it in the deviation log. The pick question stays in the main session.
- **A deck:** run `$ui-design --mode=explore` with a slide deliverable before the deck builder; explore Step 10 hands the picked direction to it.

## D0 — Set the axes

Every option has a **style** (colour, type, imagery treatment, motif, motion) and a **layout** (the structure of each key view: what sits where, reading order, how it collapses on a phone). Use Step 1's axis authority with the feel-versus-pin rule (`VO-1`): adjectives and moods in the brief are a **feel** (FREE, recorded as the target feel); only explicit tokens, named fonts, a design system, existing UI or a stated "must use" are pins. A design spec drafted earlier in this run, before the pick, is a proposal, not a pin: its direction takes one shortlist place, and the pick updates it (mock-up Step 8).

| Authority read | Options vary |
| --- | --- |
| Nothing pinned (a new brand or product) | Style AND layout: each option pairs a different style family with a different layout archetype |
| A design system or existing UI pins colour and type; the surface is a new page or a multi-view flow | Layout only: style is adopted, each option uses a different layout archetype built from the project's own components, and the current screen is the baseline |
| Every axis pinned for this surface (the Step 1 exemption), or the owner opts out | Nothing: skip, record the reason in `option-board.md`, and continue as explore Step 1 directs |
| The owner asks for a new look of an existing product (a rebrand) | Style and layout: explore Step 1 already recorded colour and type `FREE — rebrand` with the owner's words, so the design system's look is not kept; its components, content and journeys stay the baseline, and pins the owner states still hold |
| A caller passes `--explore=styles` | Style and layout where nothing pins colour and type. Where a design system pins them, the flag alone frees nothing (`VO-1`): explore Step 1 asks the owner once whether this is a rebrand; their yes is the row above, otherwise (or with no question tool) only layout varies |
| The owner asks to keep the look and change only the layout, or `--explore=layouts` | Layout only, keeping the current look even where nothing is formally pinned |

Record what varies and why in `tmp/design/<run>/option-board.md` (template: `references/explore/gate-files.md`).

## D1 — Shortlist styles and layouts

Score the catalogs against the subject's quality words (from the brief and the Journey Report), its product type and its key views. The style-family catalog is small: read every row of `data/style-families.csv`. A search returns only rows that match its words, so use the family search below to rank the literal-brief end, never as the whole shortlist. Run Python as `python3` on macOS/Linux and `py -3` on Windows:

```bash
python3 .claude/skills/ui-design/scripts/search.py "<quality words> <product type>" --domain family -n 12 --json
python3 .claude/skills/ui-design/scripts/search.py "<product type>" --domain product -n 3 --json
python3 .claude/skills/ui-design/scripts/search.py "<page type> <main job>" --domain layout -n 8 --json
```

- **Styles (when style varies):**
  - Shortlist the board's families (default 8).
  - The literal-brief family, the one closest to the brief's own adjectives, always gets one place.
  - At least half come from outside the brief's adjectives, and together they cover both poles of each `divergenceAxes` position (light/dark · quiet/loud · editorial/modular · warm/cool). Pick these from the whole catalog by `divergenceAxes`, not from the search results.
  - Also use `products.csv` Primary/Secondary Style.
  - Replace `{region}` in a family name and its queries with the subject's region, or drop that family.
  - Show each family's `tellRisk` (the `DD-4` tell catalog, `.claude/docs/design-knowledge.md` §4): a risk to watch, not a reason to drop it.
- **Layouts (always):**
  - For each key view of the primary journey (from the Journey Report), shortlist 3–4 archetypes from `layout-archetypes.csv`: the home or landing view, plus the views where the main job happens (a booking form, a list, a dashboard).
  - A family's `typicalSkeleton` is where it usually starts, not a rule: any style can sit on any layout that suits the job.
  - When the catalog offers fewer archetypes for a view than the options need, add structurally different ones from the research, named and described the same way.
  - A deliverable the catalog does not cover (a slide, a poster) gets 3–4 structurally different skeletons, named and described the same way.
- **Locales:** take the project's locales and scripts from the project config's localization settings when present (`localization.supportedLocales` in `docs/project-config.json`), else from the brief. Researchers note in each option's `localeNotes` whether its typical faces set those scripts, and drafters check every face with `check-font-subsets.cjs` (`VO-6`), passing the provider's subset names, which follow the script, not the region (for example `vi` → `vietnamese`, `ja` → `japanese`, `ko` → `korean`, `zh-Hans` → `chinese-simplified`, `zh-Hant` → `chinese-traditional`, `zh-HK` → `chinese-hongkong`, `ru` → `cyrillic`, `el` → `greek`, `ar` → `arabic`, `he` → `hebrew`, `th` → `thai`, `hi` → `devanagari`; Latin languages with extra letters, such as Polish or Turkish → `latin-ext`); a family whose look depends on a face that cannot set them is dropped or noted with a covering alternative.
- Record both shortlists in `option-board.md`, with one line per entry on why it is there.

## D2 — Capture the evidence

- **Fan out:** spawn the researchers in ONE message, two by default, each with its own folder `tmp/design/<run>/board/r<round>-<researcher>/` (for example `r1-a`, `r1-b`; a broaden round uses `r2-…`), so folder order is round order. When style varies, split the style families between them (brief 1 from `references/explore/briefs.md`), and one of them also takes the layout archetypes (brief 2); that researcher writes one `targets.json`, runs one capture and writes one `options.json` holding both kinds (the briefs' Capture rules). When only layout varies, split the archetypes between them (brief 2 only).
- **What each researcher does:**
  - Finds 4–5 examples per style family, preferring peers in the subject's domain, then award showcases, then template galleries.
  - Finds 2–4 examples per layout archetype, from real products and public design-system pattern pages.
  - Writes its `targets.json` and captures desktop and phone in one run.
  - Replaces a `blocked`, `blank` or `error` example with another site, at most twice per family or archetype; after that the slot keeps fewer examples and says so.
  - Writes `options.json` in its folder:

```bash
node .claude/skills/html-export/scripts/capture-sites.cjs --input=tmp/design/<run>/board/<folder>/targets.json --out=tmp/design/<run>/board/<folder>/shots
```

- **Read before you capture:** `.claude/skills/html-export/references/live-site-capture.md` (targets file, manifest, safety rules, exit codes).
- **Exit codes:** `0` → read each manifest entry; `1` → quote stderr and retry once; `2` → fix the targets file; `3` → capture cannot run here; any other code → interrupted: rerun with `--only` for the missing ids.
- **No captures possible:** exit `3`, every entry of a run `error` (most often no network), or a host with no web search → stop capturing. Fall back to a text shortlist from the catalogs and any sources you can name, labelled `NOT VERIFIABLE — no captures`; the options are still built and shown as drafts.
- **When only layout varies:** also capture the project's current screens as the baseline: `capture-sites.cjs` against its running local app, or `html-export --to=png` for local HTML. Screens behind sign-in come from the project's own local build with its seeded test data (its E2E or screenshot setup) or from the owner's screenshots: `capture-sites.cjs` never signs in and marks a sign-in page `blocked`.
- **Slide deliverable:** examples are published decks or deck templates shown as web pages. Capture desktop only (`"phone": false`).
- **No sub-agent capability:** capture serially yourself, one folder per round.

## D3 — Assemble the research board

**Wait for every researcher.** Build the board only after every D2 researcher has returned and every `board/r<round>-*/` folder holds an `options.json` or a recorded failure; name any missing folder in `option-board.md`. Board and option counts are checked against the shortlist, never assumed. PowerShell and cmd do not expand `*`: there, list each `options.json` path instead of the glob.

```bash
node .claude/skills/ui-design/scripts/build-board.cjs --out=tmp/design/<run>/board.html --title="<surface> — research" tmp/design/<run>/board/*/options.json
```

- Expand the glob yourself where the shell does not (Windows `cmd` and PowerShell pass it unexpanded to `node`), passing each `options.json` path in round order. Options are numbered in the order of the files given; keep the `r<round>-` folder names so a later round always numbers after the options already shown.
- The board numbers every style family and layout archetype (1..N) and each example (n.k). It shows desktop and phone side by side, with fit dots, "how it could look", the phone, speed, locale and tell notes, and each source.
- It is evidence for the options, not a question: do not ask the owner to pick from it here.

## D4 — Compose the options

Compose N options (default 3), each one style family paired with one layout archetype:

- **No repeats:** no style family and no layout archetype is used twice across the N options. A pinned axis is shared by all; only layout varies on the layout path.
- **Pair by fit:**
  1. Rank the shortlisted families by fit to the subject's qualities.
  2. Rank the archetypes by how well they serve the primary journey (`UX-4` first viewport, `UX-9` interaction cost, `UX-10` wayfinding).
  3. Give each of the top N families the archetype that suits it best among those still unused.
- **Divergent:** when style varies, the N options together cover both poles of at least two divergence axes, and one option stays closest to the brief's own feel. When only layout varies, they differ in structure instead: reading order, focal element and density (for example single column, split view, modular grid), and one option stays closest to the current screen.
- **Name each option** by both parts, for example `A — <style family> · <layout archetype>`, with one line on why this pairing fits the subject.

Record the combinations in `option-board.md` and go straight to building. There is no confirm question: the owner judges the drafts themselves (`VO-4`).

## D5 — Build and compare

- **Build:** each draft comes from explore Steps 4–8 with its combination as its seed. The drafter brief is `references/explore/briefs.md` §3: the style family's row and captures, the layout archetype's row and captures, the shared Journey Report and Design Plan skeleton.
- **Separable by construction:** every draft keeps its style in one place and its layout in another:
  - **style:** CSS custom properties for colour, type scale and spacing, plus one block for imagery treatment and motif;
  - **layout:** the structure and grid of each view, which uses only those properties;
  - **the draft note** records both: its Design Plan tokens (style) and its per-view layout skeleton.
- **Mark and render the key views:** every key view is one element marked `data-export-slide` with `data-state="<view name>"`, and the draft exposes `window.__proto.goTo(<state>)`. Render each draft at the step-5 canvas with the bare `--slides` (its default selector matches `data-export-slide`), so every view is captured and `report.json` names it by its `state`.
- **Canvas per deliverable:** the explore Step 5 canvas table owns it: desktop and phone for a web surface; phone, plus tablet when the app supports it, for a native app; the slide canvas for a deck (one column per option, no phone).
- **Compare:** write `tmp/design/<run>/drafts.json` (shape below) from each render's `report.json` `files[]`: each capture's `state` names its view. Then build the compare page:

```bash
node .claude/skills/ui-design/scripts/build-board.cjs --out=tmp/design/<run>/compare.html --title="<surface> — 3 options" tmp/design/<run>/drafts.json
node .claude/scripts/open-report.cjs tmp/design/<run>/compare.html
```

The compare page puts the options in columns and the same key screens in rows, with phone and desktop side by side in each cell. Each column header shows its style, its layout and a link to the clickable draft. Open the research board too (`node .claude/scripts/open-report.cjs tmp/design/<run>/board.html`), as the evidence behind the options; its numbers name families and archetypes for a swap ("A in style 7").

## D6 — Pick or mix

Ask ONE question with `ask user question tool` (brief 4 in `references/explore/briefs.md`):

- **Options (at most 4 per question):**
  - the recommended option first, labelled `(Recommended)`, with its evidence: fit to the subject's qualities, plus `UX-4`, `UX-9` and `UX-10` on the primary journey;
  - then up to two more options;
  - then `Mix or swap`.
  - Any further option (after a broaden round) stays on the compare page, where the owner picks it by its letter in the free text.
- **Free text:**
  - a mix: "style of B, layout of A", or one part of each, such as B's colours with A's type;
  - a swap from the research board: "A in style 7", "C with layout 12";
  - "more" or "none fit".
- **Record** the answer verbatim in `option-board.md` and `direction-approved.md`.

**A mix or a swap** builds ONE new draft, the next free letter (for example `direction-d.html`, named "Style of B · Layout of A"):

- Use the direction-drafter brief in its recombine form (`briefs.md` §3): the style from the named draft's tokens and imagery treatment, the layout from the named draft's per-view skeleton, and the same journeys.
- Render it, add it as a new column on the compare page, and ask one confirm question: keep it, adjust it (free text), or go back to one of the originals.
- At most two mix rounds (`VO-8`); then ask whether to continue or settle on the best so far.

Fallbacks:

- **The question tool errors after the drafts exist, or nothing can be shown:** auto-select the recommended option and record `Selection: AUTO-SELECTED — <reason>` with the evidence. Name it in the hand-off so the owner can re-pick or mix later. (With no question tool at all, Step 0 already chose one draft and this procedure did not run.)
- "Continue", "looks good" or silence is not a pick: ask again.

## D7 — Broaden, at most twice

"More" or "none fit":

- Add parts not yet researched: when style and layout vary, 4 more families and 2–3 more archetypes; when only layout varies, 2–3 more archetypes. Capture them in new `r<round>-…` folders.
- Rebuild the board with every `options.json` in round order, so earlier entries keep their numbers.
- Compose and build new options that pair only unused parts, then ask D6 again.

After the second broaden round, ask whether to keep looking or go on with the best options so far. Record each round in `option-board.md`.

## Defaults

These are the only tuning points; change them here, not in the briefs.

| Default | Value |
| --- | --- |
| Options built | 3, each a different style family and a different layout archetype |
| Research, styles | 8 families, 4–5 examples each (about 35 captures) |
| Research, layouts | 3–4 archetypes per key view, 2–4 examples each, plus the baseline screen when only layout varies |
| Researchers | 2, each with its own folder |
| Outside the brief's adjectives | at least half the families |
| Mix rounds / broaden rounds | at most 2 each |
| Viewports | capture: desktop 1440×900 and phone 390×844; drafts: the deliverable's canvas (D5) |

## options.json and the drafts manifest

**options.json:** one JSON array per researcher folder; `build-board.cjs` validates it. Image paths are relative to the file.

```json
[{
  "id": "cinematic-dark", "kind": "style-family", "name": "Cinematic dark",
  "oneLine": "…", "feelKeywords": ["dramatic", "premium"],
  "fit": { "<quality word>": 3, "<quality word>": 2 },
  "howItCouldLook": "Two or three sentences for THIS subject.",
  "mobileSpeedNotes": "…", "localeNotes": "Display face covers <scripts>? (check-font-subsets.cjs)", "tellRisk": "T2",
  "a11yNotes": "Contrast, motion, target sizes, reading order.", "reuseAndForks": "Layout-only path: components reused; any house pattern forked, and why.",
  "examples": [{
    "name": "…", "url": "https://…", "sourceGallery": "…",
    "desktop": "shots/<id>@1440.png", "phone": "shots/<id>@390.png",
    "whatMakesItWow": "…", "accessed": "YYYY-MM-DD", "captureStatus": "ok"
  }]
}]
```

`kind` is `style-family` or `layout-archetype`. `a11yNotes` carries the per-option accessibility note (`VO-6`); `reuseAndForks`, on the layout-only path, names the project components an option reuses and any house pattern it forks, with the reason (`VO-2`, checklist M5). `fit` scores are 1–3 per quality word the subject named; for an archetype, score it on the journey (for example "first viewport", "steps to enquire").

**drafts.json:** the compare page. Image and draft paths are relative to the file.

```json
{ "kind": "drafts", "directions": [{
  "id": "a", "name": "A", "style": "Cinematic dark", "layout": "Split view",
  "note": "One line: why this pairing fits.", "href": "direction-a.html",
  "views": [{ "name": "Home", "desktop": "renders/direction-a/direction-a@1440x900-s01.png", "phone": "renders/direction-a/direction-a@390x844-s01.png" }]
}]}
```

Every direction lists the same views in the same order, so each row compares one screen.

## Closing Reminders

- **MUST** research both axes after the Journey Report and the design-authority read, and treat brief adjectives as a feel to explore, never a pin — why: drafts seeded from text alone stay inside the brief's adjectives, look alike, and cost a second round.
- **MUST** build N options that each pair a different style with a different layout, keep each draft's style separable from its layout, and show them side by side — why: the owner can then keep one option's style with another's layout, and the mix is rebuilt from named parts instead of guessed.
- **MUST** ask one pick-or-mix question after the drafts, recommended first, record the answer verbatim, and build a mix as one new draft that is shown before it is accepted — why: taste is judged by seeing; a recommendation is advice, not a pick.
