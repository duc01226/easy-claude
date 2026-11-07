# Web Interface Design Guidelines Reference

Read this reference before scanning UI code. Apply the shared UI/UX principles for the target platform, supported inputs, and project conventions. Numeric design examples are heuristics. Use WCAG 2.2 AA for web and meet any stricter applicable accessibility requirement.

## Contents

- [1. Accessibility (WCAG 2.2 Compliance)](#1-accessibility-wcag-22-compliance)
- [2. Focus & Keyboard Navigation](#2-focus--keyboard-navigation)
- [3. Forms](#3-forms)
- [4. Animation & Motion](#4-animation--motion)
- [5. Typography](#5-typography)
- [6. Content Handling](#6-content-handling)
- [7. Images & Media](#7-images--media)
- [8. Performance (Core Web Vitals)](#8-performance-core-web-vitals)
- [9. Navigation & State](#9-navigation--state)
- [10. Touch & Mobile](#10-touch--mobile)
- [11. Layout & Safe Areas](#11-layout--safe-areas)
- [12. Dark Mode & Theming](#12-dark-mode--theming)
- [13. Internationalization (i18n)](#13-internationalization-i18n)
- [14. Hydration Safety (SSR/SSG)](#14-hydration-safety-ssrssg)
- [15. Interactive States](#15-interactive-states)
- [Anti-Patterns Quick Reference](#anti-patterns-quick-reference)
- [External References](#external-references)

## 1. Accessibility (WCAG 2.2 Compliance)

### 1.1 Semantic HTML (First Rule)

> "If you can use a native HTML element with built-in semantics, use it instead of ARIA."

- Use `<button>` for actions, `<a>`/`<Link>` for navigation (NEVER `<div onClick>` or `<span onClick>`)
- Use semantic containers: `<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>`, `<section>`, `<article>`
- Use heading hierarchy `<h1>`-`<h6>` in logical order (no skipping levels)
- Use `<label>` with `for`/`htmlFor` for form controls
- Use `<table>` for tabular data (not CSS grids for data tables)
- Use `<ul>`/`<ol>` for lists
- Include skip link to main content: `<a href="#main">Skip to content</a>`

### 1.2 ARIA Usage

> "No ARIA is better than bad ARIA" -- Sites with ARIA average 41% more errors than those without.

- Only use ARIA when no native HTML equivalent exists (custom widgets like tabs, trees, comboboxes)
- Icon-only buttons require an accessible name. Use the existing component's naming mechanism, such as `aria-labelledby` or `aria-label`.
- Decorative icons MUST ATTENTION have `aria-hidden="true"`
- Make status messages programmatically determinable so assistive technology can announce them without moving focus. Use the native or project mechanism that provides this behavior, such as `role="status"`. Reserve assertive announcements for urgent messages. [WCAG 2.2 SC 4.1.3](https://www.w3.org/TR/WCAG22/#status-messages)
- Collapsed sections need `aria-expanded="false"`, expanded need `aria-expanded="true"`
- Hidden elements need `aria-hidden="true"` to exclude from screen readers
- Invalid form fields need `aria-invalid="true"`
- Required fields need `aria-required="true"` or HTML `required`

### 1.3 Images & Media

- All `<img>` MUST ATTENTION have `alt` attribute
- Decorative images: `alt=""` (empty, not missing)
- Informative images: descriptive `alt` text explaining content/purpose
- Complex images (charts, diagrams): provide long description or `aria-describedby`
- Background images with meaning: provide text alternative nearby
- Video: provide captions and transcripts
- Audio: provide transcripts

### 1.4 Color & Contrast

- For text, identify the applicable threshold and exceptions and measure the rendered foreground/background pair. Normal and large text have different thresholds. [WCAG 2.2 SC 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)
- For controls and graphical objects, measure the visual information needed to identify the control, state, or content against adjacent colours. Apply the criterion's exceptions. [WCAG 2.2 SC 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast)
- NEVER rely solely on color to convey meaning (add icons, text, or patterns)
- Test with colorblind simulation tools
- Error states: don't just use red -- add icons or text

---

## 2. Focus & Keyboard Navigation

### 2.1 Focus Visibility

- Interactive elements MUST ATTENTION have visible focus indicator
- NEVER use `outline: none` or `outline-none` without replacement
- Use `:focus-visible` over `:focus` (avoids focus ring on click)
- Verify that keyboard focus is visible and the focused component is not entirely obscured. Apply stricter focus appearance criteria when the selected standard requires them. [WCAG 2.2 SC 2.4.7](https://www.w3.org/TR/WCAG22/#focus-visible), [SC 2.4.11](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum)
- Use `focus-visible:ring-*` (Tailwind) or custom focus styles
- Group related controls with `:focus-within`

### 2.2 Keyboard Accessibility

- Verify keyboard operation and navigation with the relevant keys, including arrow navigation inside composite widgets.
- Logical tab order matching visual layout
- Custom widgets need keyboard handlers: `onKeyDown`/`onKeyUp`
- Modals/dialogs: trap focus inside, return focus on close
- Collapsible elements: Enter/Space to toggle
- Escape key should close modals, dropdowns, tooltips
- Never use `tabindex` > 0 (disrupts natural order)
- `tabindex="-1"` for programmatically focusable but not tabbable elements
- `tabindex="0"` to make non-interactive elements focusable (when ARIA role requires it)

---

## 3. Forms

### 3.1 Labels & Association

- Every input MUST ATTENTION have a visible `<label>` with `for`/`htmlFor` matching input `id`
- OR wrap input inside `<label>` element
- Placeholder is NOT a substitute for label
- Group related inputs with `<fieldset>` and `<legend>`
- Checkboxes/radios: label + control share single hit target

### 3.2 Input Attributes

- Use correct `type`: `email`, `tel`, `url`, `number`, `password`, `search`, `date`
- Use `inputmode` for mobile keyboards: `numeric`, `tel`, `email`, `url`, `decimal`
- Use meaningful `name` attributes
- Identify the purpose of applicable fields collecting the user's information, for example with `autocomplete="email"` or `autocomplete="postal-code"` (`UI-7.4`). [WCAG 2.2 SC 1.3.5](https://www.w3.org/TR/WCAG22/#identify-input-purpose)
- Disable `spellCheck` on emails, codes, usernames: `spellCheck={false}`

### 3.3 Validation & Error Handling

- NEVER block paste: no `onPaste` + `preventDefault()`
- Show inline errors next to the field, not just at form top
- Focus first error on submit
- Use `aria-invalid="true"` and `aria-describedby` for error messages
- Apply `UI-9.1`–`UI-9.4` to submit feedback and recovery. Prevent duplicate effects where repeat submission could cause them.
- Warn before navigation with unsaved changes

### 3.4 Placeholders

- Placeholders should show example format, not instructions
- End with ellipsis: `"Search..."`, `"e.g., john@example.com"`
- Measure placeholder text using the applicable text contrast criterion.

---

## 4. Animation & Motion

### 4.1 Reduced Motion (REQUIRED)

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

- Honor `prefers-reduced-motion` media query
- Provide reduced alternative (fade instead of slide) or disable animation

### 4.2 Performance-Safe Animations

- ONLY animate `transform` and `opacity` (GPU-accelerated, no reflows)
- NEVER animate: `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`
- NEVER use `transition: all` -- list properties explicitly
- Set correct `transform-origin`

### 4.3 Timing Guidelines

- Use project/platform timing and easing. Assess whether the motion clarifies the state change and preserves responsive interaction.
- Animations should be interruptible

---

## 5. Typography

### 5.1 Font Sizes

- Use the project's type scale when defined and assess rendered readability for the content and locale.
- Use relative units: `rem`, `em`, `%` (not `px` on root)
- Allow text to scale to 200% without loss of content

### 5.2 Line Height & Length

- Choose line spacing and length to suit the typography and content. Test that user-applied spacing causes no loss of content or functionality. [WCAG 2.2 SC 1.4.12](https://www.w3.org/TR/WCAG22/#text-spacing)

### 5.3 Typography Characters

- Use proper ellipsis: `...` not `...`
- Use curly quotes where appropriate
- Non-breaking spaces where needed: `10&nbsp;MB`
- Loading states end with ellipsis

### 5.4 Number Formatting

- Use `font-variant-numeric: tabular-nums` for number columns
- Use `text-wrap: balance` on headings

### 5.5 Font Loading

- Limit to 2-3 font families, 3 weights per family
- Use `font-display: swap` for custom fonts
- Provide fallback font stack
- Preload critical fonts

---

## 6. Content Handling

### 6.1 Text Overflow

- Text containers must handle long content: `truncate`, `line-clamp`, `break-words`
- Flex children need `min-w-0` / `min-width: 0` for text truncation
- Test with very long strings (50+ chars without spaces)

### 6.2 Empty States

- Handle empty strings, null, undefined gracefully
- Handle empty arrays -- show meaningful empty state
- Anticipate: short, average, and very long user inputs

---

## 7. Images & Media

- `<img>` MUST ATTENTION have explicit `width` and `height` attributes (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `fetchpriority="high"`
- Use modern formats: WebP, AVIF
- Provide responsive images with `srcset` and `sizes`

---

## 8. Performance (Core Web Vitals)

| Metric | Target  | Key Actions                                                 |
| ------ | ------- | ----------------------------------------------------------- |
| LCP    | < 2.5s  | Preload critical resources, optimize largest element        |
| CLS    | < 0.1   | Specify image dimensions, reserve space for dynamic content |
| INP    | < 200ms | Avoid layout reads in render, debounce expensive handlers   |

- Large lists (>50 items): virtualize
- Paginate or infinite scroll for large datasets

---

## 9. Navigation & State

- Preserve expected history, return and deep-link behavior for filters, tabs, pagination and sort order where the platform and product provide it (`UI-6.4`). Use the project’s routing convention.
- Links (`<a>`) for navigation, buttons for actions
- Destructive actions need confirmation or undo

---

## 10. Touch & Mobile

- Measure the hit area against the selected target-size criterion, including applicable spacing and other exceptions. Treat larger platform recommendations as advisory unless the project or governing requirements make them binding. [WCAG 2.2 SC 2.5.8](https://www.w3.org/TR/WCAG22/#target-size-minimum)
- Use `touch-action: manipulation` (prevents double-tap zoom delay)
- Use `overscroll-behavior: contain` in modals/drawers
- Avoid `autoFocus` on mobile (may cause viewport jump)

---

## 11. Layout & Safe Areas

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Mobile-first approach: start with mobile styles
- Use fluid typography: `clamp()` for font sizes
- Use container queries for component-level responsiveness
- Test supported viewport sizes and the conditions required by the applicable reflow criterion. [WCAG 2.2 SC 1.4.10](https://www.w3.org/TR/WCAG22/#reflow)

---

## 12. Dark Mode & Theming

- Use `color-scheme: dark` on `<html>` for dark themes
- Match `<meta name="theme-color">` to page background
- Honor `prefers-color-scheme` media query
- Verify a manual toggle and preference persistence where the project's theme contract supports them.

---

## 13. Internationalization (i18n)

- Dates/times: use `Intl.DateTimeFormat`
- Numbers/currency: use `Intl.NumberFormat`
- Use logical CSS properties: `margin-inline-start` not `margin-left`
- Set `dir="rtl"` on `<html>` for RTL languages

---

## 14. Hydration Safety (SSR/SSG)

- Inputs with `value` prop MUST ATTENTION have `onChange` handler
- Guard against hydration mismatch (server vs client timezone)
- Dynamic content based on `window`/`localStorage`: render client-side only

---

## 15. Interactive States

- Verify the interaction states supported by the control and input modes. Include hover where it applies.
- Disabled controls communicate their state and prevent activation. Use native `disabled` where supported.
- Consider `aria-disabled="true"` if element should remain focusable

---

## Anti-Patterns Quick Reference

| Pattern                                 | Issue                                     |
| --------------------------------------- | ----------------------------------------- |
| `user-scalable=no` or `maximum-scale=1` | Disables zoom -- accessibility violation  |
| `onPaste` + `preventDefault()`          | Blocks paste -- UX hostile                |
| `transition: all`                       | Performance -- list properties explicitly |
| `outline: none` without replacement     | Removes focus indicator                   |
| `<div onClick>` or `<span onClick>`     | Should be `<button>` or `<a>`             |
| `<img>` without `width`/`height`        | Causes layout shift (CLS)                 |
| `<img>` without `alt`                   | Missing alt text                          |
| Form inputs without `<label>`           | Missing label                             |
| Icon buttons without an accessible name | Screen reader cannot identify action      |
| `tabindex` > 0                          | Disrupts natural tab order                |
| Color-only indicators                   | Fails colorblind users                    |
| Placeholder as label                    | Label disappears on input                 |

---

## External References

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Core Web Vitals](https://web.dev/vitals/)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
