# Explore Mode Workflow

> **Purpose:** `/design --mode=explore` turns one text brief into THREE divergent drafts (different on every FREE axis), stops so the user picks one by looking at the drafts, records that choice, and then continues as `--mode=good` from the chosen draft.
>
> **Critical rules (read first):**
>
> 1. **Authority first.** A direction stated in the brief or pinned by the project design system is ADOPTED, never re-explored. Explore only diverges on FREE axes.
> 2. **Seeds are divergence seeds, not taste.** Each draft translates its seed into the subject's own world (`DD-1`) and passes the `DD-3` generic test, or it is replaced.
> 3. **The user picks from drafts, never from text.** Stop the turn after presenting the three drafts; never pick for the user; "continue" is not a pick.

Read this file when `--mode=explore` is selected. Create ONE task per step below. All run artifacts live under `tmp/design/<run>/`, where `<run>` is `YYMMDD-HHmm-<brief-slug>` — they are disposable run output, not project docs. Gate-file templates: `references/explore/gate-files.md`. Brand procedure: `references/explore/brand-asset-protocol.md`.

## Step 1 — Resolve authority per axis

Resolve the project authority exactly as the design skill's research contract does (project config → `designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`; existing-UI inventory), then classify each of the three axes — **colour · type · layout** — as `ADOPTED — <source>` or `FREE`.

| Situation | Action |
| --- | --- |
| The brief states a visual direction | Record `ADOPTED — brief`, write the exemption in `direction-approved.md`, skip explore, run `--mode=good`. |
| The project design system pins ALL three axes | Record `ADOPTED — <doc path>` per axis, write the exemption, skip explore, run `--mode=good`. |
| Some axes pinned, some free | Record the pinned axes as `ADOPTED — <doc path>`; the three drafts SHARE the pinned axes and diverge ONLY on the free ones. |
| Nothing pinned | All three axes are `FREE`. |
| The user explicitly opts out of exploring | Record the opt-out verbatim as the exemption, run `--mode=good`. |

A genuine conflict between the brief and the project design system goes to the user with both sides — never resolve it silently.

## Step 2 — Fact check

Before asking the user anything, web-verify every named product, version, device, standard or spec the brief relies on. Cite the source URL for each fact. A fact you could not verify is stated as unverified and never used as a design input. Record the facts in `tmp/design/<run>/product-facts.md` when there is at least one.

## Step 3 — User references and brand assets

Ask the user ONE optional question: do they have reference designs they like or dislike (a URL, screenshot or file)? When the brief names a real brand, send this in the same message as the brand protocol's step-1 questions, so the user answers once.

- **A liked reference** becomes seed (b) in step 6, replacing the web-found reference. When the user says to follow it for a specific axis ("use this palette"), that axis becomes `ADOPTED — user reference <url or path>` instead.
- **A disliked reference** is a constraint every draft avoids; name what to avoid in each brief.
- **No reply or no reference** → proceed; seed (b) comes from the web as usual.

When the brief names a real brand, run `references/explore/brand-asset-protocol.md` and produce `tmp/design/<run>/brand-spec.md`. Brand facts from that file bind all three drafts. No named brand → record `Brand: N/A`. Record the references and the brand status in `tmp/design/<run>/run-notes.md`.

## Step 4 — Content imagery

Decide whether the subject needs real images to carry its content — a place, a product, a person, an animal, a physical object — as opposed to decoration. Test: would removing the image lose information? If not, the drafts need no content imagery; record `Imagery: none needed` and skip.

When images are needed, gather ONE shared set before any draft exists:

- Use files the user supplies, or images from sources whose licence permits this use (public domain, openly licensed, or the subject's own official press material). Image files only (`.svg`, `.png`, `.jpg`, `.webp`); never download executables or archives.
- Save them under `tmp/design/<run>/imagery/` and record each file's source URL or user path, licence, credit and retrieval date in `run-notes.md`.
- Verify every downloaded file exactly as step 4 of `references/explore/brand-asset-protocol.md` does — real image type, useful size, and no active content in an SVG — and delete any file that fails.
- Where no suitable image exists, use a clearly labelled placeholder that states what real image belongs there (for example a neutral frame captioned "Photo: harbour at dawn"). Never fill the gap with an unlicensed image.

All three drafts use this same set, so they differ on design, not on which pictures they found.

## Step 5 — Form questions, canvas and Design Plan skeleton

Answer the five form questions. Each answer cites where in the brief or content it comes from; an answer with no source is an assumption and is labelled so.

| Question | What it decides |
| --- | --- |
| Narrative role | What the surface must do for its reader: inform, persuade, operate, compare, celebrate |
| Viewing distance | Arm's length screen, glanced dashboard, projected room, phone in hand — sets type size and density |
| Visual temperature | Calm and quiet vs. energetic and loud, warm vs. cool — derived from the subject, not from taste |
| Content capacity | How much real content must fit per view — sets grid, density and hierarchy depth |
| Visual motif | One recurring element drawn from the subject's world that can carry identity |

Fix the **deliverable type and its pixel canvas**. Every draft is built for this canvas and rendered at it in step 8, so the three are comparable. A size stated in the brief or the project wins over these defaults:

| Deliverable | Canvas (`--viewport` in step 8) |
| --- | --- |
| Web page or app screen | `1440x900,390x844` (desktop and phone) |
| Slide | `1920x1080`; a draft holds one representative slide, or two marked `data-export-slide` |
| Social post | `1080x1350`, or the platform size the brief names |
| Poster or print piece | The print size in CSS pixels at 96 per inch, for example A3 portrait `1123x1587` |
| Animation or video | The output resolution, for example `1920x1080`; the draft is ONE key-frame still (its poster frame, per `references/lane-marketing/motion-storyboard.md`), not a full animation |

Then write the `DD-3` Design Plan skeleton: subject · audience · job (`DD-1`), the deliverable and canvas, the ADOPTED axes with their sources, and the FREE axes left open for the drafts. The skeleton is shared by all three drafts.

## Step 6 — Pick three divergence seeds

| Seed | How to get it |
| --- | --- |
| (a) Random style | Run `node .claude/skills/design/scripts/pick-style.cjs` (add `--seed=<n>` only to reproduce a run). It prints one style row as JSON `{ style, keywords, row }`. |
| (b) Real-world reference | The user's liked reference from step 3 when given; otherwise one published piece of design in an adjacent field that solved a similar job well — web-verified, cited by URL. |
| (c) Studio persona | A persona described only by traits ("a studio known for strict typographic grids and restrained colour"). Never name a real studio, designer or author — traits carry the divergence, names add nothing but borrowed authority. |

A seed is raw material. If a seed clashes with an ADOPTED axis, the adopted axis wins and the seed only informs the free axes.

## Step 7 — Fan out three drafts

Spawn THREE `ui-ux-designer` sub-agents in ONE message. Each brief is self-contained (a sub-agent inherits nothing from this conversation) and carries:

- the subject, audience, job and the Design Plan skeleton from step 5, including the deliverable, its canvas, and every ADOPTED axis with its source;
- its ONE seed from step 6, plus the `brand-spec.md`, `product-facts.md` and `run-notes.md` paths when they exist, the shared imagery set from step 4, and any disliked reference to avoid;
- the gates: `DD-1`–`DD-8`, `UI-1.1`–`UI-9.4`, `CL-1`–`CL-6`, with the paths `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md`, plus the resolved project design-system doc paths;
- **when layout is FREE:** a layout skeleton that is STRUCTURALLY different from the other two (for example: single focal column vs. asymmetric split vs. modular grid — a different reading order, not a recoloured copy). **When layout is ADOPTED:** the pinned layout, unchanged, and the instruction to diverge on the free axes only;
- the grounding rule, verbatim: "Translate the seed into this subject. If the draft would fit another product unchanged, revise it.";
- the asset rule, verbatim: "Place brand and imagery files only as `<img src>` with a path relative to the draft (for example `brand/logo.svg`), never as inline SVG markup, `<object>`, `<iframe>` or `<embed>`. Load no remote script, frame or media; a remote web font through a CSS `<link>` or `@font-face` is the only remote resource allowed.";
- the output path `tmp/design/<run>/direction-{a|b|c}.html` (one self-contained HTML file) and a short note stating the Design Plan it built and what the generic test made it revise.

**No sub-agent capability →** build the three drafts serially yourself. Draft b states what it deliberately avoided from a; draft c states what it avoided from a and b — this keeps the drafts from converging.

## Step 8 — All-return barrier, then render

Wait until all three drafts exist. Then render each one at the step-5 canvas, into its own output folder so each draft keeps its own `report.json`. Run the html-export script by path (or invoke the `html-export` skill):

```bash
node .claude/skills/html-export/scripts/export.cjs --to=png --viewport=<canvas> --out=tmp/design/<run>/renders/direction-a/ tmp/design/<run>/direction-a.html
```

Repeat with `direction-b` and `direction-c`. Add `--slides` for a slide draft that marks two slides.

**Why no `--offline`.** html-export's Trust rule (`.claude/skills/html-export/SKILL.md` `## Trust`) requires `--offline` for anything fetched or untrusted. The drafts are HTML this run produced; the fetched brand and imagery files enter them only as verified images through `<img src>`, where an SVG runs no script and loads nothing, and the asset rule allows no remote script, frame or media. Only the drafts' web fonts need the network, and rendering without `--offline` keeps them, so the evidence shows the real type. A draft that breaks the asset rule is not yet a project-produced page: fix it, or render it with `--offline` (its web fonts then fall back to system fonts; say so beside the PNG).

Read the exit code first, per the shared caller rule in `.claude/skills/html-export/SKILL.md`:

| Exit | Meaning | Action |
| --- | --- | --- |
| 0 | Evidence only as html-export scopes it: the page loaded at each viewport with no page error and no blank capture. Not proof that it looks right | Open the PNGs listed in `report.json` `files[]`, judge them, use them in step 9 |
| 4 | A page fault: page errors, a blank capture, or a failure the page caused (`pageFault: true` in `report.json` `failures[]`, e.g. never ready or a hung script); `report.json` names each | Fix the draft, re-render |
| 3 | A rendering dependency is missing | Mark the draft `NOT VERIFIABLE`, list its HTML path, and give a one-line pointer to the setup section of `.claude/skills/html-export/SKILL.md`. NEVER run an install command |
| 1 or 2 | Tool failure | Quote stderr, mark the draft `NOT VERIFIABLE`, list its HTML path. Never count it as a design defect or a pass |

Any other exit code (130 after an interrupt) is an interrupted render: handle it like 1 or 2. A re-render into the same `--out` keeps earlier PNGs beside the new ones; only `report.json` `files[]` lists this render's captures.

Critique each rendered draft against `DD-8` and remove one accessory, then re-render that draft with the same command so the PNG shows the edited HTML. If the re-render fails, label the old PNG `stale — predates the DD-8 edit`.

## Step 9 — Present and STOP

Show the three drafts side by side — PNGs when rendered, otherwise the HTML paths marked `NOT VERIFIABLE` — each with a two-line summary: its seed, its layout skeleton (or the free axes it varied when layout is ADOPTED), and what makes it THIS subject's interface. Then STOP the turn and ask the user to pick a, b or c, ask for a mix, or say none fit.

- Never pick for the user and never recommend one as a default.
- Never offer a text-only style choice in place of the drafts.

## Step 10 — Record the pick and continue

Write `tmp/design/<run>/direction-approved.md` from the template in `references/explore/gate-files.md`, quoting the user's reply verbatim. "Continue", "looks good" or silence is NOT a pick — ask again. A mix ("a's layout with c's type") is a valid pick; record it verbatim and name the parts taken from each draft. "None fit" → record it, pick three new seeds (step 6) and repeat from step 7.

Then run `--mode=good` from the chosen draft: the approved direction and every ADOPTED axis are now fixed inputs, and `good` raises the draft to the full quality bar.

## Closing Reminders

- **MUST** resolve authority per axis first; adopted axes are never re-explored, and a pinned layout is shared by all three drafts — why: a house style or stated direction is an intentional identity.
- **MUST** fix the deliverable canvas and one shared imagery set before fan-out, and render every draft at that canvas into its own `--out` folder — why: drafts built for different sizes or with different pictures cannot be compared.
- **MUST** verify every fetched image (SVG: no active content) and have drafts place it only through `<img src>`, loading no remote script, frame or media — why: that is what keeps a draft project-produced, so html-export may render it without `--offline`.
- **MUST** stop after presenting the three drafts and record the user's verbatim pick in `direction-approved.md`; never install render dependencies — why: the pick is the user's decision, and installs are the user's opt-in.
