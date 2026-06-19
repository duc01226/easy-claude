# Deck Template — Standalone HTML Scaffold, Slide Engine, iframe-srcdoc Escaping, Fidelity Gate

Render-side reference for `feature-presentation`. Governs **rendering correctness**: the single-file HTML scaffold, the vanilla-JS slide engine, the `<iframe srcdoc>` mockup-embed escaping rule, and the [BLOCKING] fidelity gate. (Content collection lives in `artifact-accumulation.md`.)

---

## 1. Standalone HTML Scaffold

ONE self-contained file. Inline `<style>` and `<script>`. No external `<script src>` / `<link rel=stylesheet>` except the Google Fonts CSS link. NO CDN reveal.js.

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Feature Presentation: {Feature(s)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
            /* Design tokens as CSS variables — sourced from the loaded design-system docs (SKILL.md Step 3) */
            :root {
                --color-primary: #1976d2;     /* replace with project token */
                --color-bg: #ffffff;
                --color-text: #1a1a1a;
                --font-body: 'Inter', system-ui, sans-serif;
                --gap-md: 16px;
                --radius: 8px;
            }
            [data-theme='dark'] {
                --color-bg: #121212;
                --color-text: #e8e8e8;
            }
            /* BEM class names: deck, deck__slide, deck__topbar, deck__counter, deck__body,
               deck__embed, deck__nav, deck__dots, deck__dot, deck__dot--active, deck__btn */
            .deck { font-family: var(--font-body); color: var(--color-text); background: var(--color-bg); }
            .deck__slide { display: none; }
            .deck__slide--active { display: block; }
            .deck__embed iframe { width: 100%; height: 70vh; border: 0; }
            /* ...responsive breakpoints, slide layout, nav dot styling... */
        </style>
    </head>
    <body data-theme="light">
        <main class="deck">
            <!-- Slide 1: Title / agenda -->
            <section class="deck__slide deck__slide--active">…</section>
            <!-- Slide 2: Business context (PO/BA) -->
            <!-- Slide N: UI / mockups — <iframe srcdoc> embed OR design-spec ASCII OR empty-state -->
            <!-- Slide tiers: common shell, domain-shared embed block, page-app content slides -->
            <nav class="deck__nav">
                <button class="deck__btn deck__btn--prev">◀ Prev</button>
                <div class="deck__dots"><!-- one .deck__dot per slide --></div>
                <span class="deck__counter">1 / N</span>
                <button class="deck__btn deck__btn--next">Next ▶</button>
                <button class="deck__btn deck__btn--theme">◐ Theme</button>
            </nav>
        </main>
        <script>
            /* vanilla-JS slide engine — see §2 */
        </script>
    </body>
</html>
```

### Per-slide partials (per the Slide Taxonomy)

- **Title / agenda** — feature(s), run date, scope.
- **Business context** — problem, value, idea→spec narrative, epics.
- **Scope & backlog** — PBI cards, user stories, acceptance criteria, priorities.
- **Behavior & rules** — Feature Spec §4 business rules / §5 invariants, §8 test cases.
- **UI / mockups** — one of: `<iframe srcdoc>` embed (idea-to-pbi), design-spec ASCII wireframe + Component Inventory / States / Design-Tokens tables (idea-to-spec), or empty-state slide.
- **QC view** — test specifications, states matrix, edge cases.
- **Summary / next steps**.

---

## 2. Vanilla-JS Slide Engine (~60 lines, zero-dep)

```html
<script>
    (function () {
        const slides = Array.from(document.querySelectorAll('.deck__slide'));
        const dots = Array.from(document.querySelectorAll('.deck__dot'));
        const counter = document.querySelector('.deck__counter');
        let i = 0;

        function show(n) {
            i = Math.max(0, Math.min(slides.length - 1, n));
            slides.forEach((s, k) => s.classList.toggle('deck__slide--active', k === i));
            dots.forEach((d, k) => d.classList.toggle('deck__dot--active', k === i));
            if (counter) counter.textContent = i + 1 + ' / ' + slides.length;
        }
        document.querySelector('.deck__btn--prev').addEventListener('click', () => show(i - 1));
        document.querySelector('.deck__btn--next').addEventListener('click', () => show(i + 1));
        dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') show(i - 1);
            else if (e.key === 'ArrowRight') show(i + 1);
            else if (e.key === 'Home') show(0);
            else if (e.key === 'End') show(slides.length - 1);
        });
        const body = document.body;
        document.querySelector('.deck__btn--theme').addEventListener('click', () => {
            body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        });
        show(0);
    })();
</script>
```

Engine contract: keyboard `←`/`→`/`Home`/`End`, clickable nav dots, live `N / total` counter, light/dark toggle reusing design-system tokens. No external library.

---

## 3. `<iframe srcdoc>` Mockup Embed — HTML-Escaping Spec (HIGHEST-RISK)

Each existing `team-artifacts/pbis/*-mockup.html` is a FULL HTML document containing `"`, `&`, `<`, `>`, and possibly inline `<script>`. It is embedded into the deck via:

```html
<div class="deck__embed">
    <iframe srcdoc="{ESCAPED_MOCKUP_HTML}" title="Mockup: {feature}"></iframe>
</div>
```

`{ESCAPED_MOCKUP_HTML}` is the **entity-escaped** raw mockup source. Inlining it raw breaks the deck (the first `"` in the mockup closes the `srcdoc` attribute).

### The escaping rule (escape ONCE, on the RAW source, unconditionally)

Replace the four entities, **in this exact order** (`&` MUST be first):

| Step | Replace | With     |
| ---- | ------- | -------- |
| 1    | `&`     | `&amp;`  |
| 2    | `"`     | `&quot;` |
| 3    | `<`     | `&lt;`   |
| 4    | `>`     | `&gt;`   |

**Rules:**

1. **`&` first, always.** Escaping `&` after `"`/`<`/`>` would double-escape the entities you just produced (`&lt;` → `&amp;lt;`). `&` first is the only correct order.
2. **Escape ONCE over the raw bytes, unconditionally.** Run the four-replace pass exactly once over the raw mockup source. NEVER inspect for pre-existing entities, NEVER detect-and-skip.
3. **A pre-existing literal entity is CORRECT to escape again.** A mockup that already contains a literal `&quot;` or `&amp;` is escaped again: `&`-first turns its literal `&quot;` into `&amp;quot;`, which the iframe decodes back to the literal text `&quot;` — round-trip faithful. The operation is correct precisely because it is **NOT idempotent-by-skipping**.
4. **The failure mode is the OPPOSITE — under-encoding.** A "smart" detect-and-skip that leaves an existing `&`/`<` unescaped produces an under-encoded `srcdoc` → that one embedded mockup renders blank while the deck still opens (silent partial loss). NEVER do entity-detection; escape every byte.

### Worked example A — pre-existing literal entity

Raw mockup fragment (already contains a literal `&quot;`):

```
<input title="a &quot;b&quot; c">
```

After escaping ONCE in `&`-first order (every `&`, `"`, `<`, `>` replaced):

```
&lt;input title=&quot;a &amp;quot;b&amp;quot; c&quot;&gt;
```

Trace of the pre-existing `&quot;`:

- Raw byte sequence `&quot;` → Step 1 (`&`→`&amp;`) turns its leading `&` into `&amp;`, yielding `&amp;quot;`.
- The browser, decoding the `srcdoc` value, turns `&amp;quot;` back into the literal text `&quot;` — exactly the original bytes. Round-trip faithful.
- The surrounding real `"` quotes (`title="…"`) each became `&quot;`, so they do NOT close the `srcdoc` attribute. Deck stays valid.

If we had "smartly skipped" the already-present `&quot;` (left it as `&quot;`), the browser would decode it to a literal `"` — corrupting the embedded mockup's title and, worse, any skipped real `&`/`<` would under-encode the document and render that iframe blank.

### Worked example B — inline `</script>`

Raw mockup fragment (a mockup's own inline script):

```
<script>if (a < b && c > d) alert("x");</script>
```

After escaping ONCE in `&`-first order:

```
&lt;script&gt;if (a &lt; b &amp;&amp; c &gt; d) alert(&quot;x&quot;);&lt;/script&gt;
```

The `</script>` becomes `&lt;/script&gt;` and the `<script>` becomes `&lt;script&gt;`, so the mockup's inline script is inert text inside the `srcdoc` attribute and cannot terminate the deck's own DOM parsing or break out of the iframe. The browser decodes the `srcdoc` value back into a real `</script>` inside the iframe's document, where the mockup script runs in its sandboxed frame.

---

## 4. [BLOCKING] Fidelity Gate

> **[BLOCKING] After the deck is assembled (SKILL.md Step 6), validate its visuals faithfully match the existing UI inventoried in Step 4 before handoff.** Do NOT report the deck as done until this validation records a result — a deck that does not match the current system is not done. (Mirrors `pbi-mockup/SKILL.md:284-301` at deck scope.)

Validate the produced deck against the inventoried existing UI and record an explicit pass/fail:

1. **Design tokens** — the deck CSS variables (colors, typography, spacing, radius) match the project design system loaded in Step 3.
2. **Component patterns** — tables, forms, dialogs, status chips, navigation reuse the existing component patterns inventoried in Step 4, not generic HTML.
3. **Layout/structure** — slide layouts and embedded visuals match the existing pages of the related features (sidebar / toolbar / card-grid conventions).
4. **Connected flows** — the deck reflects the entry/exit navigation of the connected feature flows mapped in Step 4.
5. **Embed integrity** — every `<iframe srcdoc>` renders its mockup (no blank/broken frame from under-encoding); every spec-only feature renders ASCII/tables; every visual-less feature renders an explicit empty-state slide.

Record the outcome in the SKILL.md Step 9 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / embeds matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the deck to match the existing UI and re-validate before handoff.

---

## 5. Deck Quality Checklist

Before completing:

- [ ] Exactly ONE self-contained HTML file (opens correctly without a server)
- [ ] Inline CSS/JS; no external `<script src>` / `<link rel=stylesheet>` except Google Fonts
- [ ] Vanilla-JS slide engine works (keyboard ←/→/Home/End, nav dots, counter, theme toggle)
- [ ] Each existing `-mockup.html` embedded via `<iframe srcdoc>` (escaped `&`-first, escape-once-unconditionally) — not regenerated
- [ ] Spec-only path renders design-spec ASCII wireframes + inventory/states/tokens tables (no HTML mockups)
- [ ] Empty-state slide for any visual-less feature (never a broken/blank iframe)
- [ ] CSS uses design-system tokens; BEM class names
- [ ] Real domain entity field names + realistic sample data (not Lorem ipsum)
- [ ] Saved at `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html`
- [ ] Fidelity gate (§4) recorded PASS — tokens, components, layout, flows, embeds matched
