'use strict';

/**
 * Action & attention evidence (SYNC:ui-action-density-gate AD-1..AD-6; checklist B16, C10, C14-C20).
 *
 * Evidence, never a verdict. The browser can count buttons, rows, icons and tiles, but deciding what a
 * control MEANS (a primary commit or a tinted secondary, a list row or a prose list, a collection or a
 * dashboard) is a judgement. So every measure reports what was counted AND the elements behind the
 * count, plus what was excluded and why, for a reviewer to confirm by eye. Nothing here passes a page.
 *
 * Three parts, each with one job:
 *   - HEURISTIC_DEFAULTS — the limits used when a project declares no uiReview.complexityBudget. The
 *     AD protocol body states the same numbers; a parity test keeps the two equal.
 *   - collectMetrics(args) — a self-contained async DOM function (no closures, no requires), passed to
 *     page.evaluate by audit-actions.cjs (or any runtime review of a live page).
 *   - summarize(metrics, budget) — pure: turns one view's metrics into per-measure evidence
 *     { status: COUNTED | NOT VERIFIABLE, value, limit, rule, source, overLimit, elements, excluded, reason }.
 */

const HEURISTIC_DEFAULTS = Object.freeze({
  textButtonsPerView: 3,
  buttonGroupWidthSpread: 0.10,
  rowMetaChars: 80,
  blockCopyChars: 160,
  iconTarget: 44,
  iconTargetPointer: 24,
  iconContrast: 3,
});

// The keys a project may declare in uiReview.complexityBudget; the others come from standards.
const BUDGET_KEYS = Object.freeze(['textButtonsPerView', 'buttonGroupWidthSpread', 'rowMetaChars', 'blockCopyChars']);

// Every measure summarize() reports, in report order, with the kind of rule behind its limit:
//   structural — an AD-5 structural rule (keeps its checklist severity when a reviewer confirms it);
//   default    — a numeric budget or default (declared, or HEURISTIC and capped at P3);
//   standard   — a published accessibility minimum;
//   evidence   — a count with no limit, for the reviewer's judgement.
const MEASURES = Object.freeze({
  'C14.filled': 'structural',
  'C14.textButtons': 'default',
  'C15.spread': 'default',
  'C15.mix': 'structural',
  'C16.rowButtons': 'structural',
  'C16.rowIcons': 'default',
  'B16.metaLines': 'default',
  'B16.metaChars': 'default',
  'B16.blockChars': 'default',
  'C17.name': 'structural',
  'C17.tooltip': 'structural',
  'C17.targetMinimum': 'standard',
  'C17.targetTouch': 'default',
  'C17.contrast': 'standard',
  'C17.destructive': 'evidence',
  'C10.iconStyles': 'default',
  'C18.tileSize': 'structural',
  'C18.titleBaseline': 'default',
  'C19.actionEdge': 'default',
  'C19.emptyBand': 'default',
  'C20.placeholder': 'evidence',
});
const ALIGN_TOLERANCE_PX = 1;
const ELEMENT_LIST_MAX = 12;

/**
 * Merge a declared budget over the defaults and remember where each limit came from. A declared key
 * with an invalid value is listed in `ignored`, so the caller can say so instead of hiding it.
 */
function resolveBudget(declared) {
  const values = { ...HEURISTIC_DEFAULTS };
  const source = {};
  const ignored = [];
  for (const key of Object.keys(HEURISTIC_DEFAULTS)) source[key] = BUDGET_KEYS.includes(key) ? 'heuristic' : 'standard';
  if (declared && typeof declared === 'object') {
    for (const key of BUDGET_KEYS) {
      if (!(key in declared)) continue;
      const value = declared[key];
      const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && (key !== 'buttonGroupWidthSpread' || value <= 1);
      if (valid) {
        values[key] = value;
        source[key] = 'declared';
      } else {
        ignored.push(key);
      }
    }
  }
  return { values, source, ignored };
}

function cap(list) {
  const items = (list || []).slice(0, ELEMENT_LIST_MAX);
  return (list || []).length > ELEMENT_LIST_MAX ? [...items, { more: list.length - ELEMENT_LIST_MAX }] : items;
}

// One measure's evidence. `value` null = NOT VERIFIABLE (reason says why); otherwise COUNTED, with
// overLimit telling the reviewer where to look first — never a pass.
function measure(id, value, limit, source, elements, extra = {}) {
  const rule = MEASURES[id];
  if (value === null || value === undefined) {
    return { status: 'NOT VERIFIABLE', value: null, limit, rule, source, overLimit: null, elements: cap(elements), ...extra };
  }
  return { status: 'COUNTED', value, limit, rule, source, overLimit: limit === null ? null : value > limit, elements: cap(elements), ...extra };
}

function spreadOf(widths) {
  if (widths.length < 2) return 0;
  const widest = Math.max(...widths);
  return widest > 0 ? Number(((widest - Math.min(...widths)) / widest).toFixed(3)) : 0;
}

function worst(list, valueOf) {
  let best = null;
  for (const item of list) if (valueOf(item) !== null && (best === null || valueOf(item) > valueOf(best))) best = item;
  return best;
}

/**
 * Summarize one view's metrics against a budget. `metrics` is one collectMetrics() result; `budget` is
 * resolveBudget(declared) or a plain declared object.
 */
function summarize(metrics, budget) {
  const { values, source } = budget && budget.values ? budget : resolveBudget(budget);
  const out = {};
  if (!metrics || metrics.visible === false) {
    for (const id of Object.keys(MEASURES)) out[id] = measure(id, null, null, 'standard', [], { reason: (metrics && metrics.reason) || 'view not shown' });
    return out;
  }
  const groups = metrics.groups || [];
  const rows = metrics.rows || [];
  const icons = metrics.icons || [];
  const active = icons.filter((icon) => !icon.disabled);
  const groupsNote = metrics.groupsTruncated ? `first ${groups.length} groups described; ${metrics.groupsTruncated} later groups not described` : '';
  const rowsNote = metrics.rowsTruncated ? `first ${metrics.rowsTruncated} rows measured; later rows not measured` : '';
  const iconsNote = metrics.iconsTruncated ? `first ${icons.length} of ${icons.length + metrics.iconsTruncated} icon controls measured; the rest are not measured — check by eye` : '';
  const withNote = (note, extra = {}) => (note ? { ...extra, reason: [extra.reason, note].filter(Boolean).join('; ') } : extra);
  // A capped count with no violation in the measured part cannot be an all-clear: nothing says the
  // unmeasured part is clean, so the measure becomes NOT VERIFIABLE instead of COUNTED 0.
  const partial = (result, truncated, note) => (truncated && result.status === 'COUNTED' && !result.overLimit
    ? { ...result, status: 'NOT VERIFIABLE', value: null, overLimit: null, reason: [result.reason, note].filter(Boolean).join('; ') }
    : result);
  const normalizeExcluded = (list) => (list || []).map((entry) => (entry && entry.element && !entry.elements
    ? { reason: entry.reason, elements: [entry.element] }
    : entry));
  const grids = metrics.grids || [];
  const screen = metrics.screenful || { filled: [], boxed: [] };
  const collapsed = screen.collapsed || { filled: [], boxed: [] };

  out['C14.filled'] = measure('C14.filled', screen.filled.length, 1, 'structural', screen.filled, {
    excluded: [
      ...(metrics.tinted && metrics.tinted.length ? [{ reason: 'tinted (low-emphasis neutral fill): listed, not counted as a primary', elements: cap(metrics.tinted) }] : []),
      ...(collapsed.filled || []),
    ],
    ...(metrics.unknownStyles ? { reason: `${metrics.unknownStyles} control(s) with an unreadable background colour were not classified; check them by eye` } : {}),
  });
  out['C14.textButtons'] = measure('C14.textButtons', screen.boxed.length, values.textButtonsPerView, source.textButtonsPerView, screen.boxed,
    { excluded: collapsed.boxed || [] });

  const widest = worst(groups, (g) => spreadOf(g.widths));
  out['C15.spread'] = partial(measure('C15.spread', widest ? spreadOf(widest.widths) : 0, values.buttonGroupWidthSpread, source.buttonGroupWidthSpread, widest ? widest.elements : [],
    withNote(groupsNote)), metrics.groupsTruncated, groupsNote);
  // AD-2: filled and outlined never mix down a repeated list (a column across rows) or along a line
  // inside a row; a footer, action bar or hero line may hold the primary plus quieter buttons.
  const mixed = groups.filter((g) => (g.axis === 'column' || g.inRow) && g.styles.includes('filled') && g.styles.includes('outlined'));
  out['C15.mix'] = partial(measure('C15.mix', mixed.length, 0, 'structural', mixed.flatMap((g) => g.elements), withNote(groupsNote)), metrics.groupsTruncated, groupsNote);

  const rowButtons = rows.filter((r) => r.filledButtons + r.boxedButtons > 0);
  const rowReason = [
    metrics.rowsTruncated ? `first ${metrics.rowsTruncated} rows measured` : '',
    metrics.structuralRows ? `${metrics.structuralRows} row(s) inferred from repeated sibling blocks (no list markup); confirm by eye` : '',
  ].filter(Boolean).join('; ');
  out['C16.rowButtons'] = partial(measure('C16.rowButtons', rowButtons.length, 0, 'structural', rowButtons.map((r) => r.element), { excluded: normalizeExcluded(metrics.rowsExcluded), ...(rowReason ? { reason: rowReason } : {}) }), metrics.rowsTruncated, rowsNote);
  const rowIcons = rows.filter((r) => r.iconActions > 1);
  out['C16.rowIcons'] = partial(measure('C16.rowIcons', rowIcons.length, 0, 'heuristic', rowIcons.map((r) => r.element), withNote(iconsNote)),
    metrics.rowsTruncated || metrics.iconsTruncated, [rowsNote, iconsNote].filter(Boolean).join('; '));

  const listRows = rows.filter((r) => r.metaLines !== null);
  const metaWorst = worst(listRows, (r) => r.metaLines);
  out['B16.metaLines'] = partial(measure('B16.metaLines', metaWorst ? metaWorst.metaLines : 0, 1, 'heuristic', listRows.filter((r) => r.metaLines > 1).map((r) => r.element)), metrics.rowsTruncated, rowsNote);
  const charsWorst = worst(listRows, (r) => r.metaChars);
  out['B16.metaChars'] = partial(measure('B16.metaChars', charsWorst ? charsWorst.metaChars : 0, values.rowMetaChars, source.rowMetaChars, listRows.filter((r) => r.metaChars > values.rowMetaChars).map((r) => r.element)), metrics.rowsTruncated, rowsNote);
  const blocks = metrics.blocks || [];
  const blockWorst = worst(blocks, (b) => b.chars);
  out['B16.blockChars'] = measure('B16.blockChars', blockWorst ? blockWorst.chars : 0, values.blockCopyChars, source.blockCopyChars, blocks.filter((b) => b.chars > values.blockCopyChars).map((b) => b.element));

  const images = metrics.imageControls || [];
  const unnamed = [...icons.filter((i) => !i.named), ...images.filter((i) => !i.named)];
  out['C17.name'] = partial(measure('C17.name', unnamed.length, 0, 'structural', unnamed.map((i) => i.element), withNote(iconsNote)), metrics.iconsTruncated, iconsNote);
  const unprobed = active.filter((i) => i.focusTooltip === null);
  const noTip = active.filter((i) => i.focusTooltip === false);
  const probed = active.length - unprobed.length;
  const probeNote = unprobed.length
    ? `${probed} of ${active.length} active icon(s) probed (probe cap); ${unprobed.length} not probed`
    : `${probed} active icon(s) probed`;
  out['C17.tooltip'] = partial(unprobed.length && !noTip.length
    ? measure('C17.tooltip', null, 0, 'structural', unprobed.map((i) => i.element), withNote(iconsNote, { reason: `focus tooltip not probed: ${probeNote}; hover is never measured — check by hand` }))
    : measure('C17.tooltip', noTip.length, 0, 'structural', noTip.map((i) => i.element), withNote(iconsNote, { reason: `focus only; ${probeNote}; hover is never measured — check by hand` })), metrics.iconsTruncated, iconsNote);
  const small = [...icons, ...images].filter((i) => (i.width < values.iconTargetPointer || i.height < values.iconTargetPointer) && !i.spacingOk);
  out['C17.targetMinimum'] = partial(measure('C17.targetMinimum', small.length, 0, source.iconTargetPointer, small.map((i) => i.element),
    withNote(iconsNote, { reason: 'WCAG 2.5.8 minimum; a target with 24 px clear spacing is excepted' })), metrics.iconsTruncated, iconsNote);
  if (metrics.touch) {
    const belowTouch = [...icons, ...images].filter((i) => i.width < values.iconTarget || i.height < values.iconTarget);
    out['C17.targetTouch'] = partial(measure('C17.targetTouch', belowTouch.length, 0, source.iconTarget, belowTouch.map((i) => i.element), withNote(iconsNote)), metrics.iconsTruncated, iconsNote);
  } else {
    out['C17.targetTouch'] = measure('C17.targetTouch', null, 0, source.iconTarget, [], { reason: 'pointer viewport: the touch recommendation does not apply' });
  }
  const faint = active.filter((i) => i.contrast !== null && i.contrast < values.iconContrast);
  const unknownContrast = active.filter((i) => i.contrast === null);
  out['C17.contrast'] = partial(unknownContrast.length && !faint.length
    ? measure('C17.contrast', null, 0, source.iconContrast, unknownContrast.map((i) => i.element), withNote(iconsNote, { reason: 'colour or backdrop not readable (image, gradient, filter or unparsed colour)' }))
    : measure('C17.contrast', faint.length, 0, source.iconContrast, faint.map((i) => i.element), withNote(iconsNote)), metrics.iconsTruncated, iconsNote);
  const destructive = icons.filter((i) => i.destructive);
  out['C17.destructive'] = measure('C17.destructive', destructive.length, null, 'standard', destructive.map((i) => i.element),
    { reason: 'whether a confirm step or undo follows needs a click; confirm by hand' });
  const styles = new Set(icons.map((i) => i.style).filter(Boolean));
  out['C10.iconStyles'] = partial(icons.length && !styles.size
    ? measure('C10.iconStyles', null, 1, 'heuristic', [], withNote(iconsNote, { reason: 'no icon draws a readable stroke or fill (font glyphs, images)' }))
    : measure('C10.iconStyles', styles.size, 1, 'heuristic', styles.size > 1 ? icons.filter((i) => i.style).map((i) => ({ ...i.element, label: `${i.element.label} [${i.style}]` })) : [],
      withNote(iconsNote, { detail: Array.from(styles) })), metrics.iconsTruncated, iconsNote);

  const sizeWorst = worst(grids, (g) => Math.max(g.heightSpread, g.widthSpread));
  out['C18.tileSize'] = measure('C18.tileSize', sizeWorst ? Math.max(sizeWorst.heightSpread, sizeWorst.widthSpread) : 0, ALIGN_TOLERANCE_PX, 'structural',
    sizeWorst && Math.max(sizeWorst.heightSpread, sizeWorst.widthSpread) > ALIGN_TOLERANCE_PX ? [sizeWorst.element, ...sizeWorst.tiles] : [],
    { excluded: normalizeExcluded(metrics.gridsExcluded) });
  const baseWorst = worst(grids, (g) => g.baselineSpread);
  out['C18.titleBaseline'] = measure('C18.titleBaseline', baseWorst ? baseWorst.baselineSpread : 0, ALIGN_TOLERANCE_PX, 'heuristic',
    baseWorst && baseWorst.baselineSpread > ALIGN_TOLERANCE_PX ? [baseWorst.element, ...baseWorst.tiles] : []);
  out['C19.actionEdge'] = metrics.actionEdge === null || metrics.actionEdge === undefined
    ? measure('C19.actionEdge', null, ALIGN_TOLERANCE_PX, 'heuristic', [], { reason: metrics.actionEdgeReason || 'no single filled primary to align' })
    : measure('C19.actionEdge', metrics.actionEdge.offset, ALIGN_TOLERANCE_PX, 'heuristic', metrics.actionEdge.elements);
  const banded = grids.filter((g) => g.emptyBand !== null && g.emptyBand > g.columnWidth);
  const bandUnknown = grids.filter((g) => g.emptyBand === null);
  out['C19.emptyBand'] = bandUnknown.length && !banded.length
    ? measure('C19.emptyBand', null, 0, 'heuristic', bandUnknown.map((g) => g.element), { reason: 'a single wrapping row cannot show whether the width is used' })
    : measure('C19.emptyBand', banded.length, 0, 'heuristic', banded.map((g) => g.element));
  const repeated = grids.filter((g) => g.repeatedImage >= 3);
  out['C20.placeholder'] = measure('C20.placeholder', Math.max(0, ...grids.map((g) => g.repeatedImage)), null, 'standard', repeated.map((g) => g.element),
    { reason: 'whether one image spans different content types is a judgement' });
  return out;
}

/** The measures over their limit, for the console summary (where a reviewer looks first). */
function overLimit(measures) {
  return Object.entries(measures || {}).filter(([, m]) => m.overLimit === true).map(([id]) => id);
}

/**
 * Runs IN THE PAGE (page.evaluate). Self-contained on purpose: no outer names are referenced.
 * args: { view: CSS selector of the view element (null = the whole page), exclude: CSS selector of
 *         chrome to skip, touch: true on a touch viewport, tooltipProbeMax: icons probed for a focus
 *         tooltip (default 20), rowMax: rows measured (default 300) }
 * Returns one view's metrics, or { visible: false } when the view is not shown.
 */
async function collectMetrics(args) {
  const isPage = !(args && args.view);
  const root = isPage ? document.body : document.querySelector(args.view);
  const exclude = (args && args.exclude) || '[data-audit-ignore]';
  const probeMax = (args && args.tooltipProbeMax) || 20;
  const rowMax = (args && args.rowMax) || 300;
  if (!root) return { visible: false, reason: 'view not found' };
  // Up the composed tree: through a shadow root to its host, so component internals are measured.
  const up = (n) => n.parentElement || (n.getRootNode && n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);
  const closestDeep = (el, selector) => { for (let n = el; n; n = up(n)) { if (n.matches && n.matches(selector)) return n; } return null; };
  const containsDeep = (scope, el) => { for (let n = el; n; n = up(n)) { if (n === scope) return true; } return false; };
  // Every element under a scope, open shadow roots included.
  const deepAll = (scope, selector) => {
    const found = [];
    const stack = [scope];
    while (stack.length) {
      const node = stack.pop();
      for (const el of node.querySelectorAll('*')) {
        if (el.matches(selector)) found.push(el);
        if (el.shadowRoot) stack.push(el.shadowRoot);
      }
    }
    return found;
  };
  const pageWidth = Math.max(innerWidth, document.documentElement.scrollWidth);
  // A clip-path that removes the whole box: an inset whose opposite sides add up to 100% (or one side
  // reaches 100%), a zero-radius circle/ellipse, or a polygon collapsed to one point. A partial inset
  // leaves part of the control visible and is not hidden.
  const clippedAway = (clipPath) => {
    const text = (clipPath || '').trim();
    if (!text || text === 'none') return false;
    const inset = /^inset\(([^)]*)\)/.exec(text);
    if (inset) {
      const parts = inset[1].trim().split(/\s+/).filter(Boolean);
      const [top, right = top, bottom = top, left = right] = parts;
      const value = (part) => {
        const match = /^(-?\d+(?:\.\d+)?)(%|px)?$/.exec(part || '');
        return match ? { n: Number(match[1]), unit: match[2] || '%' } : null;
      };
      const sides = [top, right, bottom, left].map(value);
      if (sides.every(Boolean)) {
        const percent = (side) => (side.unit === '%' ? side.n : null);
        const tb = percent(sides[0]) !== null && percent(sides[2]) !== null ? percent(sides[0]) + percent(sides[2]) : null;
        const lr = percent(sides[1]) !== null && percent(sides[3]) !== null ? percent(sides[1]) + percent(sides[3]) : null;
        if (sides.some((side) => side.unit === '%' && side.n >= 100) || (tb !== null && tb >= 100) || (lr !== null && lr >= 100)) return true;
      }
    }
    if (/^circle\(\s*0(?:[a-z%]*)[\s,)]/.test(text) || /^ellipse\(\s*0(?:[a-z%]*)[\s,)]/.test(text)) return true;
    const polygon = /^polygon\(([^)]*)\)/.exec(text);
    if (polygon) {
      const numbers = polygon[1].match(/-?\d+(?:\.\d+)?/g) || [];
      if (numbers.length && numbers.every((number) => Number(number) === 0)) return true;
    }
    return false;
  };
  const hiddenByClip = (s, rect) => /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(s.clip) || clippedAway(s.clipPath)
    || (rect && rect.width <= 1 && rect.height <= 1 && (s.overflow === 'hidden' || s.overflowX === 'hidden'));
  // Perceivable = rendered (display, visibility, opacity), with a box, inside the page, not clipped away
  // (screen-reader-only, clip-path) and not cut off by an ancestor that hides its overflow (a collapsed
  // panel, a closed drawer, a carousel). A scrolling ancestor keeps content reachable, so it never clips.
  const visibleBox = (el) => {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return false;
    if (hiddenByClip(style, rect)) return false;
    if (rect.right <= 0 || rect.left >= pageWidth || rect.bottom <= -scrollY) return false;
    let { left, top, right, bottom } = rect;
    // A fixed box escapes an ancestor's overflow clip unless that ancestor establishes its containing
    // block (transform, filter, contain: paint/layout, …); without this a visible FAB inside a clipped
    // app shell is silently dropped. The fixed element's own overflow still clips its children.
    let fixedNode = style.position === 'fixed' ? el : null;
    const containingBlock = (s) => (s.transform && s.transform !== 'none')
      || (s.filter && s.filter !== 'none')
      || (s.perspective && s.perspective !== 'none')
      || (s.backdropFilter && s.backdropFilter !== 'none')
      || (s.contain && /paint|layout|strict|content/.test(s.contain))
      || (s.willChange && /transform|perspective|filter/.test(s.willChange));
    for (let node = up(el); node && node !== document.documentElement; node = up(node)) {
      const s = getComputedStyle(node);
      if (!fixedNode && s.position === 'fixed') fixedNode = node;
      if (hiddenByClip(s, null)) return false;
      const clipX = s.overflowX === 'hidden' || s.overflowX === 'clip';
      const clipY = s.overflowY === 'hidden' || s.overflowY === 'clip';
      if (!clipX && !clipY) continue;
      const aboveFixed = fixedNode && node !== fixedNode && !fixedNode.contains(node);
      if (aboveFixed && !containingBlock(s)) continue;
      const r = node.getBoundingClientRect();
      if (clipX) { left = Math.max(left, r.left); right = Math.min(right, r.right); }
      if (clipY) { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
      if (right - left < 1 || bottom - top < 1) return false;
    }
    // A fixed box off the viewport (a closed sheet translated below, a toast at top:100vh) cannot be
    // reached by scrolling, so it is not perceivable even though its page coordinates are valid.
    if (fixedNode && (rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= innerHeight)) return false;
    return true;
  };
  // A whole-page view is shown even when the body has no height (an app shell of fixed panels).
  if (!isPage && !visibleBox(root)) return { visible: false, reason: 'view not visible' };
  const LIST_ROWS = 'li, [role="listitem"]';
  const ROWS = 'li, tbody > tr, [role="row"], [role="listitem"]';
  const NAV = 'nav, [role="navigation"], [role="menu"], [role="menubar"], [role="tablist"]';
  const excluded = (el) => Boolean(closestDeep(el, exclude));
  // An excluded list keeps a `{more}` marker instead of silently dropping causes beyond the cap.
  const limited = (list, max) => (list.length > max ? [...list.slice(0, max), { more: list.length - max }] : list);
  // Form fields and choice controls drawn as buttons are inputs, not actions (AD-1 counts actions).
  const FORM_LIKE = '[role="radio"], [role="checkbox"], [role="switch"], [role="combobox"], [role="option"], [role="listbox"], [role="slider"], [role="spinbutton"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [aria-haspopup="listbox"], [aria-checked]';
  // Any colour the browser can paint is resolved through one canvas pixel; null only when the browser
  // itself cannot parse it. Transparent is alpha 0, never a guess.
  const pixel = document.createElement('canvas');
  pixel.width = 1;
  pixel.height = 1;
  const paint = pixel.getContext('2d', { willReadFrequently: true });
  // A page repeats a handful of colours across thousands of controls; a canvas read-back per lookup is
  // expensive, so each distinct CSS colour is resolved once.
  const colorCache = new Map();
  const parseColor = (value) => {
    const text = (value || '').trim();
    if (colorCache.has(text)) return colorCache.get(text);
    let color = null;
    if (text && paint && CSS.supports('color', text)) {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = '#000';
      paint.fillStyle = text;
      paint.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
      color = { r, g, b, a: a / 255 };
    }
    colorCache.set(text, color);
    return color;
  };
  // The first opaque background behind an element along its ancestors; null when an image, a
  // gradient or an unparsed colour is in the way.
  const backdrop = (el) => {
    for (let node = up(el); node; node = up(node)) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return null;
      const color = parseColor(style.backgroundColor);
      if (!color) return null;
      if (color.a >= 0.99) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  // What is painted under the centre of a control (overlays, absolutely placed icons); null over an
  // image, video or canvas. Off-screen controls fall back to their ancestors.
  const backdropAt = (el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return backdrop(el);
    for (const node of document.elementsFromPoint(x, y)) {
      if (containsDeep(el, node) || node === el) continue;
      if (['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'IFRAME', 'svg'].includes(node.tagName)) return null;
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return null;
      const color = parseColor(style.backgroundColor);
      if (!color) return null;
      if (color.a >= 0.99) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  // The opacity a node is painted with (its own and every ancestor's); null when a filter or blend
  // mode changes the painted colour in a way a ratio cannot follow.
  const paintedOpacity = (node) => {
    let opacity = 1;
    for (let n = node; n && n.nodeType === 1; n = up(n)) {
      const s = getComputedStyle(n);
      if ((s.filter && s.filter !== 'none') || (s.mixBlendMode && s.mixBlendMode !== 'normal')) return null;
      opacity *= Number(s.opacity);
    }
    return opacity;
  };
  const luminance = (c) => {
    const channel = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const blend = (fg, alpha, bg) => ({ r: alpha * fg.r + (1 - alpha) * bg.r, g: alpha * fg.g + (1 - alpha) * bg.g, b: alpha * fg.b + (1 - alpha) * bg.b });
  const sameColor = (a, b) => a && b && Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 6;
  // How colourful a fill is (max channel minus min). Neutral washes are near 0; brand colours are high.
  const chromaOf = (color) => Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
  // The text nodes a node renders, in the composed tree: a shadow host renders its shadow root, and a
  // <slot> renders the light-DOM nodes assigned to it (a design-system <x-button>Save</x-button>).
  const composedText = (start) => {
    const out = [];
    const visit = (n) => {
      if (n.nodeType === 3) { out.push(n); return; }
      if (n.nodeType !== 1 && n.nodeType !== 11) return;
      if (n.tagName === 'SLOT') {
        const assigned = n.assignedNodes({ flatten: true });
        (assigned.length ? assigned : Array.from(n.childNodes)).forEach(visit);
        return;
      }
      if (n.tagName === 'STYLE' || n.tagName === 'SCRIPT') return;
      Array.from(n.shadowRoot ? n.shadowRoot.childNodes : n.childNodes).forEach(visit);
    };
    visit(start);
    return out;
  };
  // The words a control visibly shows: rendered text nodes only, so screen-reader-only text and
  // ligature icon fonts never count as a visible label.
  const shownWords = (el) => {
    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      return (el.value || '').trim() || (type === 'submit' ? 'Submit' : type === 'reset' ? 'Reset' : '');
    }
    const parts = [];
    {
      for (const node of composedText(el)) {
        if (!node.textContent.trim()) continue;
        const parent = node.parentElement;
        if (!parent || closestDeep(parent, '[aria-hidden="true"], [class*="material-icons"], [class*="material-symbols"]')) continue;
        const clips = [];
        for (let box = parent; box && box !== el && containsDeep(el, box); box = up(box)) {
          const style = getComputedStyle(box);
          if (hiddenByClip(style, null)) { clips.push(null); break; }
          if (style.overflow !== 'visible' || style.overflowX !== 'visible') clips.push(box.getBoundingClientRect());
        }
        if (clips.includes(null)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const area = Array.from(range.getClientRects()).reduce((sum, r) => {
          let { left, top, right, bottom } = r;
          for (const c of clips) { left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom); }
          return sum + Math.max(0, right - left) * Math.max(0, bottom - top);
        }, 0);
        if (area > 4) parts.push(node.textContent);
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };
  const hasWord = (text) => /[\p{L}\p{N}]/u.test(text);
  // Text an assistive technology reads: aria-hidden, hidden and display/visibility-hidden nodes are
  // left out; screen-reader-only text (visually clipped) stays in.
  const readable = (node, top) => {
    for (let n = node; n && n !== up(top); n = up(n)) {
      if (n.nodeType !== 1) continue;
      if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return false;
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (typeof n.className === 'string' && /material-(icons|symbols)/.test(n.className)) return false;
    }
    return true;
  };
  const readableText = (scope) => {
    const parts = [];
    for (const node of composedText(scope)) {
      if (node.textContent.trim() && readable(node.parentElement, scope)) parts.push(node.textContent);
    }
    for (const part of [scope, ...(scope.shadowRoot ? [scope.shadowRoot] : [])]) {
      for (const img of part.querySelectorAll('img[alt], svg[aria-label], [role="img"][aria-label]')) {
        if (readable(img, scope)) parts.push(img.getAttribute('alt') || img.getAttribute('aria-label') || '');
      }
      const svgTitle = part.querySelector('svg title');
      if (svgTitle && readable(svgTitle.parentElement, scope)) parts.push(svgTitle.textContent);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };
  const labelledBy = (el) => (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
    .map((id) => { const node = el.getRootNode().getElementById ? el.getRootNode().getElementById(id) : document.getElementById(id); return node ? node.textContent.trim() : ''; }).join(' ').trim();
  // The accessible-name order of the accessibility tree: aria-labelledby, aria-label, an associated
  // <label>, the readable content (input buttons: their value or default label), then title.
  const accessibleName = (el) => {
    const by = labelledBy(el);
    if (by) return by;
    const aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria;
    if (el.labels && el.labels.length) {
      const label = Array.from(el.labels).map((node) => readableText(node)).join(' ').trim();
      if (label) return label;
    }
    if (el.tagName === 'INPUT') return shownWords(el) || (el.getAttribute('title') || '').trim();
    return readableText(el) || (el.getAttribute('title') || '').trim();
  };
  const textOf = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  // A short, stable handle for an element, for the reviewer to find it.
  const pathOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = up(n)) {
      let part = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(`${part}#${n.id}`); break; }
      const classes = Array.from(n.classList).slice(0, 2);
      if (classes.length) part += `.${classes.join('.')}`;
      const parent = n.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((child) => child.tagName === n.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(n) + 1})`;
      }
      parts.unshift(part);
    }
    return parts.join(' > ');
  };
  const describe = (el, label) => {
    const r = el.getBoundingClientRect();
    return {
      label: (label || accessibleName(el) || textOf(el) || el.tagName.toLowerCase()).slice(0, 60),
      selector: pathOf(el),
      box: [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)],
    };
  };
  // A tooltip may live in the control's own tree scope (a design-system button with its tooltip in its
  // shadow root) or in the document; ids resolve in the control's root first, then the document.
  const tooltipNodes = (el) => {
    const found = [];
    const rootNode = el.getRootNode ? el.getRootNode() : document;
    const scopes = rootNode === document ? [document] : [rootNode, document];
    for (const scope of scopes) {
      for (const id of (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)) {
        const node = scope.getElementById ? scope.getElementById(id) : null;
        if (node) found.push(node);
      }
      const tooltips = scope === document ? document.querySelectorAll('[role="tooltip"]') : deepAll(scope, '[role="tooltip"]');
      for (const node of tooltips) found.push(node);
    }
    return Array.from(new Set(found));
  };
  // A pseudo-element tooltip shows words and is painted (visible, not transparent); an empty one (a
  // focus ring, a decoration) is not a tooltip.
  const pseudoShown = (el) => ['::after', '::before'].some((pseudo) => {
    const style = getComputedStyle(el, pseudo);
    const content = style.content || '';
    if (content === 'none' || content === 'normal') return false;
    const words = content.replace(/^(["'])(.*)\1$/s, '$2');
    return /[\p{L}\p{N}]/u.test(words) && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
  });
  // A tooltip the user sees on keyboard focus: one NOT shown before focus and shown within 400 ms after
  // it. Hover cannot be driven from inside the page, so it is never claimed here.
  const focusTooltip = async (el) => {
    const before = new Set(tooltipNodes(el).filter((node) => visibleBox(node)));
    const pseudoBefore = pseudoShown(el);
    el.focus({ preventScroll: true });
    let shown = false;
    for (let waited = 0; waited <= 400 && !shown; waited += 100) {
      await new Promise((resolve) => setTimeout(resolve, waited === 0 ? 20 : 100));
      if (document.getAnimations) document.getAnimations().forEach((animation) => { try { animation.finish(); } catch { /* infinite */ } });
      shown = tooltipNodes(el).some((node) => !before.has(node) && visibleBox(node)) || (!pseudoBefore && pseudoShown(el));
    }
    el.blur();
    return shown;
  };
  const isBoxedLinkButton = (el, rect, words) => el.getAttribute('role') === 'button'
    || (rect.height <= 64 && words.length <= 40 && !el.querySelector('p, div, h1, h2, h3, h4, h5, h6, li'));
  // Controls pinned on screen (a sticky or fixed header) are in every screenful.
  const pinned = (el) => {
    for (let n = el; n && n !== document.documentElement; n = up(n)) {
      const position = getComputedStyle(n).position;
      if (position === 'fixed' || position === 'sticky') return true;
    }
    return false;
  };

  const controls = deepAll(root, 'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]')
    .filter((el) => visibleBox(el) && !excluded(el) && !el.matches(FORM_LIKE))
    .map((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const words = shownWords(el);
      const inNav = Boolean(closestDeep(el, NAV));
      const base = { el, words, rect, inNav, pinned: pinned(el), unknownStyle: false };
      if (!hasWord(words)) {
        // A picture link (a logo, a thumbnail) names itself through its image; it is not an icon control.
        const picture = el.querySelector('img, picture, video, svg');
        const pictureBox = picture ? picture.getBoundingClientRect() : null;
        if (picture && pictureBox && (pictureBox.width > 48 || pictureBox.height > 48)) return { ...base, kind: 'image' };
        return { ...base, kind: 'icon' };
      }
      if (el.hasAttribute('aria-pressed')) return { ...base, kind: 'toggle' };
      const background = parseColor(style.backgroundColor);
      const gradient = style.backgroundImage && style.backgroundImage !== 'none';
      const behind = backdrop(el);
      let fill = 'none';
      if (gradient) fill = 'strong';
      else if (background && background.a >= 0.5 && !(behind && sameColor(background, behind))) {
        // TO-1 (owner decision 2026-10-28): a tint is a low-emphasis NEUTRAL wash — under 3:1 against its
        // backdrop AND nearly grey (shadcn/Primer secondary). A saturated brand fill (green, orange,
        // warning yellow) stays a filled primary even when its contrast against white is under 3:1.
        const lowContrast = Boolean(behind) && contrast(background, behind) < 3;
        fill = lowContrast && chromaOf(background) <= 40 ? 'tint' : 'strong';
      }
      const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== 'none').length;
      let kind = fill === 'strong' ? 'filled' : fill === 'tint' ? 'tinted' : (sides >= 3 ? 'outlined' : 'text');
      if (el.tagName === 'A' && kind !== 'text' && !isBoxedLinkButton(el, rect, words)) kind = 'text';
      return { ...base, kind, unknownStyle: !background && !gradient };
    })
    // In navigation, plain links are wayfinding, not actions; a boxed button or icon there still is.
    .filter((c) => !(c.inNav && c.kind === 'text'));

  const boxed = controls.filter((c) => c.kind === 'filled' || c.kind === 'outlined' || c.kind === 'tinted');
  const DESCRIBED = new Map();
  const info = (c) => { if (!DESCRIBED.has(c.el)) DESCRIBED.set(c.el, describe(c.el, c.words || null)); return DESCRIBED.get(c.el); };
  // Element boxes are read once: repeated lookups across sibling, tile and screenful analysis would
  // otherwise force the same layout thousands of times on a long page.
  const rectCache = new WeakMap();
  const rectOf = (el) => {
    if (!rectCache.has(el)) rectCache.set(el, el.getBoundingClientRect());
    return rectCache.get(el);
  };
  // Sibling blocks of one tag, class list and width are candidates for parallel options or div rows.
  const signature = (el) => `${el.tagName}.${Array.from(el.classList).sort().join('.')}`;
  const twinCache = new Map();
  const twinsOf = (node) => {
    const parent = node.parentElement;
    if (!parent) return [];
    if (!twinCache.has(parent)) {
      const bySig = new Map();
      for (const child of parent.children) {
        const sig = signature(child);
        if (!bySig.has(sig)) bySig.set(sig, []);
        bySig.get(sig).push(child);
      }
      twinCache.set(parent, bySig);
    }
    const width = rectOf(node).width;
    return (twinCache.get(parent).get(signature(node)) || []).filter((child) => child !== node && Math.abs(rectOf(child).width - width) <= 2);
  };
  // Parallel options are near each other: the same line, or stacked tiles inside one screenful. Without
  // the distance bound every short row of a long table would be "parallel" with every other one.
  const comparable = (a, b) => Math.abs(a.top - b.top) <= 2
    || (a.height < innerHeight && b.height < innerHeight && Math.abs(a.top - b.top) < innerHeight);
  // A wrapper that holds only the control (a <p> or a small action div) is not a tile: the tile is the
  // card, row or plan around it that also holds a title, copy or picture.
  const hasOtherContent = (node, c) => {
    const own = textOf(node).replace(/\s+/g, ' ').trim();
    const label = c.words.replace(/\s+/g, ' ').trim();
    if (own && label && own !== label) return true;
    return Array.from(node.querySelectorAll('img, picture, video, svg, input, h1, h2, h3, h4, h5, h6, p, li, [role="heading"]'))
      .some((el) => !c.el.contains(el) && !el.contains(c.el) && visibleBox(el));
  };
  const tileOf = (c) => {
    for (let node = c.el.parentElement; node && node !== root && node.parentElement; node = node.parentElement) {
      if (twinsOf(node).length && hasOtherContent(node, c)) return node;
    }
    return null;
  };
  const tiles = new Map(boxed.map((c) => [c, tileOf(c)]));
  const tiledParent = (el) => {
    const parent = el.parentElement;
    if (!parent) return false;
    const s = getComputedStyle(parent);
    return s.display.endsWith('grid') || (s.display.endsWith('flex') && !s.flexDirection.startsWith('column'));
  };
  // A repeated block is a list row only when it is laid out like one: side-by-side children (a row
  // flex/grid, floats or inline blocks) rather than a stacked card or a bare action wrapper. This
  // keeps three stacked feature sections out of C16 while div rows still count.
  const rowLike = (el) => {
    const style = getComputedStyle(el);
    if (style.display.endsWith('flex') && !style.flexDirection.startsWith('column')) return true;
    if (style.display.endsWith('grid') && style.gridTemplateColumns.split(/\s+/).filter(Boolean).length > 1) return true;
    const kids = Array.from(el.children).filter((child) => visibleBox(child));
    return kids.some((a, i) => kids.some((b, j) => {
      if (i === j) return false;
      const ra = rectOf(a);
      const rb = rectOf(b);
      return Math.abs(ra.left - rb.left) > 2
        && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) >= Math.min(ra.height, rb.height) / 2;
    }));
  };
  // H2: div-based rows (no li/tr) still repeat one action down a column. When the same boxed control
  // repeats in stacked sibling blocks that are not a grid or tile row, those blocks are measured as
  // list rows; the measure says they were inferred, for the reviewer to confirm.
  const structuralRows = new Set();
  const byWords = new Map();
  for (const control of boxed) {
    const tile = tiles.get(control);
    if (!tile || tile.matches(LIST_ROWS) || tiledParent(tile) || !rowLike(tile)) continue;
    const key = `${control.kind}:${control.words.toLowerCase()}`;
    if (!byWords.has(key)) byWords.set(key, []);
    byWords.get(key).push(control);
  }
  const overlapsX = (a, b) => {
    const ra = rectOf(a);
    const rb = rectOf(b);
    return Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) >= Math.min(ra.width, rb.width) / 2;
  };
  for (const list of byWords.values()) {
    const distinct = new Map();
    for (const control of list) if (!distinct.has(tiles.get(control))) distinct.set(tiles.get(control), control);
    if (distinct.size < 2) continue;
    const blocks = Array.from(distinct.keys());
    const stacked = blocks.some((a, i) => blocks.some((b, j) => i !== j && overlapsX(a, b) && Math.abs(rectOf(a).top - rectOf(b).top) > 2));
    if (stacked) for (const block of blocks) structuralRows.add(block);
  }
  const structuralRowOf = (el) => {
    for (let node = el; node && node !== document.documentElement; node = up(node)) if (structuralRows.has(node)) return node;
    return null;
  };

  // Button groups as the eye sees them: buttons whose vertical centres share a line, side by side with
  // small gaps (a touching or 1 px overlapping group counts); plus columns down repeated rows.
  const groups = [];
  const centre = (c) => (c.rect.top + c.rect.bottom) / 2;
  const lines = [];
  for (const control of boxed.slice().sort((a, b) => centre(a) - centre(b))) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(centre(line[0]) - centre(control)) <= 4) line.push(control);
    else lines.push([control]);
  }
  for (const line of lines) {
    line.sort((a, b) => a.rect.left - b.rect.left);
    let current = [];
    for (const control of line) {
      const previous = current[current.length - 1];
      const gap = previous ? control.rect.left - previous.rect.right : 0;
      if (previous && gap >= -2 && gap <= 32) current.push(control);
      else { if (current.length >= 2) groups.push({ axis: 'line', list: current }); current = [control]; }
    }
    if (current.length >= 2) groups.push({ axis: 'line', list: current });
  }
  const rowOf = new Map(controls.map((c) => [c.el, closestDeep(c.el, ROWS) || structuralRowOf(c.el)]));
  const columns = new Map();
  for (const control of boxed) {
    const row = rowOf.get(control.el);
    if (!row || !containsDeep(root, row)) continue;
    const key = Math.round(control.rect.left / 3);
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key).push(control);
  }
  for (const column of columns.values()) {
    if (new Set(column.map((c) => rowOf.get(c.el))).size >= 2) groups.push({ axis: 'column', list: column });
  }
  // Describing every control of every group is the expensive part; a long table can hold thousands of
  // row groups. The first GROUP_MAX groups are described and the rest are counted as a cap, stated in
  // the C15 reasons, so the work stays bounded on a large page.
  const GROUP_MAX = 400;
  const describedGroups = groups.slice(0, GROUP_MAX);
  const groupsTruncated = groups.length - describedGroups.length;
  const groupData = describedGroups.map((group) => ({
    axis: group.axis,
    inRow: group.list.every((c) => Boolean(rowOf.get(c.el))),
    widths: group.list.map((c) => Math.round(c.rect.width)),
    styles: group.list.map((c) => c.kind),
    elements: group.list.map(info),
  }));


  // Text blocks: the nearest non-inline box of each text node, so inline <b>/<time>/badges count once.
  const blockOf = (el) => {
    for (let node = el; node && node !== up(root); node = up(node)) {
      if (!getComputedStyle(node).display.startsWith('inline')) return node;
    }
    return el;
  };
  const textBlocks = (scope) => {
    const found = new Set();
    for (const el of scope.querySelectorAll('*')) {
      if (!visibleBox(el) || excluded(el) || closestDeep(el, NAV)) continue;
      if (el.closest('button, [role="button"], input, select, textarea, svg, [role="tooltip"]')) continue;
      if (!Array.from(el.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim())) continue;
      const block = blockOf(el);
      if (scope.contains(block)) found.add(block);
    }
    return Array.from(found);
  };
  // An avatar or initials disc (a few characters in a small box) is a picture, not a line of copy.
  const isAvatar = (block) => {
    const rect = block.getBoundingClientRect();
    return textOf(block).length <= 3 && rect.width <= 48 && rect.height <= 48;
  };
  const linesAcross = (blocks) => {
    const found = [];
    for (const block of blocks) {
      const range = document.createRange();
      range.selectNodeContents(block);
      for (const r of range.getClientRects()) {
        if (r.width <= 0 || r.height <= 0) continue;
        const line = found.find((l) => Math.min(l.bottom, r.bottom) - Math.max(l.top, r.top) >= Math.min(l.bottom - l.top, r.height) / 2);
        if (line) { line.top = Math.min(line.top, r.top); line.bottom = Math.max(line.bottom, r.bottom); } else found.push({ top: r.top, bottom: r.bottom });
      }
    }
    return found.length;
  };
  // List rows: items stacked in a list that holds actions. Items laid out as tiles (their list is a grid
  // or a flex row), header rows and prose list items with no action are not list rows; each is listed
  // in `rowsExcluded` with why.
  const rowsExcluded = [];
  const candidates = deepAll(root, ROWS)
    .filter((el) => visibleBox(el) && !excluded(el) && !closestDeep(el, NAV)
      && !(up(el) && closestDeep(up(el), ROWS) && containsDeep(root, closestDeep(up(el), ROWS))));
  const rowEls = [];
  const rowsWithControl = new Set(Array.from(rowOf.values()).filter(Boolean));
  for (const el of candidates) {
    if (el.querySelector('[role="columnheader"], th[scope="col"]')) { rowsExcluded.push({ reason: 'header row', element: describe(el) }); continue; }
    if (el.matches(LIST_ROWS) && tiledParent(el)) { rowsExcluded.push({ reason: 'tile of a grid or flex row (judged as a collection, not a list row)', element: describe(el) }); continue; }
    const holdsAction = rowsWithControl.has(el) || Boolean(el.querySelector('a[href], button, [role="button"]'));
    // A bullet of running text (in an article or prose block, or made of paragraphs) is reading content,
    // not a list row; a read-only data list keeps its copy budget.
    if (el.matches(LIST_ROWS) && !holdsAction && (closestDeep(el, 'article, [role="article"], .prose, [class*="markdown"]') || el.querySelector(':scope > p'))) {
      rowsExcluded.push({ reason: 'prose list item (running text, no action)', element: describe(el) });
      continue;
    }
    rowEls.push(el);
  }
  // Div-based rows come after the semantic ones; a block that holds (or sits inside) a semantic row is
  // already represented, and a nested structural block belongs to its outermost repeated block.
  const semanticRows = rowEls.slice();
  const structuralBlocks = Array.from(structuralRows)
    .filter((row) => !semanticRows.some((semantic) => semantic.contains(row) || row.contains(semantic)))
    .filter((row) => !Array.from(structuralRows).some((other) => other !== row && other.contains(row)))
    .sort((a, b) => rectOf(a).top - rectOf(b).top || rectOf(a).left - rectOf(b).left);
  rowEls.push(...structuralBlocks);
  const structuralRowCount = structuralBlocks.length;
  const measuredRows = rowEls.slice(0, rowMax);
  const byRow = new Map();
  for (const c of controls) {
    const row = rowOf.get(c.el);
    if (!row) continue;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(c);
  }
  const rows = measuredRows.map((row) => {
    const inRow = byRow.get(row) || [];
    const listRow = row.matches(LIST_ROWS) || structuralRows.has(row);
    let meta = [];
    if (listRow) {
      const blocks = textBlocks(row).filter((block) => !isAvatar(block));
      const TITLE = 'h1, h2, h3, h4, h5, h6, strong, b, [role="heading"]';
      const holder = blocks.find((block) => block.matches(TITLE) || block.querySelector(TITLE));
      // Use the heading/strong element itself, not the block that holds it: a div holding a <strong>
      // title and the meta lines below must not swallow those meta lines as part of the title.
      const title = holder ? (holder.matches(TITLE) ? holder : holder.querySelector(TITLE)) : blocks[0];
      meta = title ? blocks.filter((block) => block !== title && !block.contains(title) && !title.contains(block)) : [];
    }
    return {
      element: describe(row, textOf(row).slice(0, 60)),
      filledButtons: inRow.filter((c) => c.kind === 'filled').length,
      boxedButtons: inRow.filter((c) => c.kind === 'outlined' || c.kind === 'tinted').length,
      iconActions: inRow.filter((c) => c.kind === 'icon').length,
      metaLines: listRow ? linesAcross(meta) : null,
      metaChars: listRow ? meta.reduce((sum, el) => sum + textOf(el).length, 0) : null,
    };
  });

  const cardLike = (el) => Array.from(el.classList || []).some((token) => /(^|[-_])(card|tile)$/i.test(token));
  const blockScopes = [...measuredRows, ...deepAll(root, 'article, td, [role="article"]').slice(0, rowMax), ...deepAll(root, '[class]').filter(cardLike).slice(0, rowMax)];
  const blocks = blockScopes.flatMap((scope) => textBlocks(scope).map((el) => ({ chars: textOf(el).length, element: describe(el, textOf(el).slice(0, 60)) })));


  // Detailed icon evidence (shape, contrast, focus tooltip) is expensive per control; a very large page
  // is measured for the first ICON_MAX icons and the rest are reported as a cap.
  const ICON_MAX = 600;
  const iconCandidates = controls.filter((c) => c.kind === 'icon');
  const iconControls = iconCandidates.slice(0, ICON_MAX);
  // WCAG 2.5.8 spacing exception: a 24 px circle centred on the target touches no other target's circle.
  // Buckets of 24 px make the check local, so a 10,000-control table is not quadratic.
  const SPACING = 24;
  const targetBuckets = new Map();
  const bucketKey = (x, y) => `${Math.floor(x / SPACING)},${Math.floor(y / SPACING)}`;
  for (const rect of controls.map((c) => c.rect)) {
    const key = bucketKey((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    if (!targetBuckets.has(key)) targetBuckets.set(key, []);
    targetBuckets.get(key).push(rect);
  }
  const spacingOk = (rect) => {
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    const bx = Math.floor(cx / SPACING);
    const by = Math.floor(cy / SPACING);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of targetBuckets.get(`${bx + dx},${by + dy}`) || []) {
          if (other === rect) continue;
          if (Math.hypot((other.left + other.right) / 2 - cx, (other.top + other.bottom) / 2 - cy) < SPACING) return false;
        }
      }
    }
    return true;
  };
  const icons = [];
  for (const [index, c] of iconControls.entries()) {
    const ownStyle = getComputedStyle(c.el);
    const disabled = c.el.disabled === true || c.el.getAttribute('aria-disabled') === 'true';
    const drawnByBackground = (ownStyle.backgroundImage && ownStyle.backgroundImage !== 'none') || (ownStyle.maskImage && ownStyle.maskImage !== 'none');
    const scope = c.el.shadowRoot || c.el;
    const img = scope.querySelector('img');
    const masked = Array.from(scope.querySelectorAll('*')).find((node) => getComputedStyle(node).maskImage && getComputedStyle(node).maskImage !== 'none');
    const shape = scope.querySelector('svg path, svg circle, svg line, svg polyline, svg polygon, svg rect');
    const glyph = scope.querySelector('[class*="material-icons"], [class*="material-symbols"], i, [class*="icon"]');
    let colour = null;
    let painter = null;
    let extraAlpha = 1;
    let style = null;
    if (masked) { colour = parseColor(getComputedStyle(masked).backgroundColor); painter = masked; style = 'mask'; } else if (shape) {
      const shapeStyle = getComputedStyle(shape);
      const stroked = shapeStyle.stroke !== 'none';
      colour = parseColor(stroked ? shapeStyle.stroke : shapeStyle.fill);
      extraAlpha = Number(stroked ? shapeStyle.strokeOpacity : shapeStyle.fillOpacity);
      painter = shape;
      style = stroked ? `stroke ${parseFloat(shapeStyle.strokeWidth)}` : 'fill';
    } else if (glyph && !img && !drawnByBackground) { colour = parseColor(getComputedStyle(glyph).color); painter = glyph; }
    const own = parseColor(ownStyle.backgroundColor);
    const behind = own && own.a >= 0.99 ? own : backdropAt(c.el);
    const opacity = painter ? paintedOpacity(painter) : null;
    let ratio = null;
    if (colour && behind && opacity !== null) {
      const alpha = colour.a * opacity * (Number.isFinite(extraAlpha) ? extraAlpha : 1);
      if (alpha > 0) ratio = Number(contrast(blend(colour, alpha, behind), behind).toFixed(2));
    }
    const name = accessibleName(c.el);
    icons.push({
      element: info(c),
      named: Boolean(name),
      disabled,
      focusTooltip: disabled ? null : (index < probeMax ? await focusTooltip(c.el) : null),
      width: Math.round(c.rect.width),
      height: Math.round(c.rect.height),
      spacingOk: spacingOk(c.rect),
      contrast: disabled ? null : ratio,
      destructive: /delete|remove|trash|discard|destroy|erase/i.test(name),
      style,
    });
  }
  const imageControls = controls.filter((c) => c.kind === 'image').map((c) => ({
    element: info(c), named: Boolean(accessibleName(c.el)), width: Math.round(c.rect.width), height: Math.round(c.rect.height), spacingOk: spacingOk(c.rect),
  }));


  // AD-6: a collection grid is a grid or wrapping-flex container of three or more tile-sized items of
  // one kind (list items, articles, linked cards, or tiles that mostly share their inner structure).
  // Dashboards of different widgets, form layouts and small chips are listed in `gridsExcluded`. Each
  // tile is measured by its painted box (a plain stretched cell holding one card is measured by the card).
  const gridsExcluded = [];
  const painted = (el) => {
    const s = getComputedStyle(el);
    const bg = parseColor(s.backgroundColor);
    return (bg && bg.a > 0) || (s.backgroundImage && s.backgroundImage !== 'none') || (s.boxShadow && s.boxShadow !== 'none')
      || ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
  };
  const paintedBox = (tile) => {
    let box = tile;
    for (let depth = 0; depth < 3 && !painted(box); depth += 1) {
      const kids = Array.from(box.children).filter((child) => visibleBox(child));
      if (kids.length !== 1) break;
      box = kids[0];
    }
    return box;
  };
  const shapeOf = (box) => Array.from(box.children).filter((child) => visibleBox(child)).map((child) => child.tagName).join(',');
  const grids = [];
  for (const el of deepAll(root, '*')) {
    if (excluded(el) || closestDeep(el, NAV)) continue;
    const style = getComputedStyle(el);
    const isCssGrid = style.display.endsWith('grid');
    const isGrid = isCssGrid || (style.display.endsWith('flex') && style.flexWrap === 'wrap');
    if (!isGrid) continue;
    const tiles = Array.from(el.children).filter((child) => visibleBox(child));
    if (tiles.length < 3) continue;
    if (!visibleBox(el)) continue;
    const cells = tiles.map((tile) => tile.getBoundingClientRect());
    if (cells.some((rect) => rect.height < 48 || rect.width < 80)) { gridsExcluded.push({ reason: 'small items (chips, tags)', element: describe(el, '') }); continue; }
    if (el.matches('form, fieldset') || tiles.filter((tile) => tile.querySelector('input, select, textarea')).length * 2 > tiles.length) {
      gridsExcluded.push({ reason: 'form layout', element: describe(el, '') });
      continue;
    }
    const boxes = tiles.map((tile, i) => {
      const box = paintedBox(tile);
      const rect = box.getBoundingClientRect();
      const title = textBlocks(box)[0];
      return { tile, box, cell: cells[i], rect, shape: shapeOf(box), baseline: title ? title.getBoundingClientRect().top - rect.top : null };
    });
    const itemLike = tiles.every((tile) => tile.matches('li, article, [role="listitem"], [role="article"], a[href]'))
      || boxes.every((b) => b.box.matches('a[href], article'));
    const shapes = new Map();
    for (const b of boxes) shapes.set(b.shape, (shapes.get(b.shape) || 0) + 1);
    if (!itemLike && Math.max(...shapes.values()) * 3 < boxes.length * 2) {
      gridsExcluded.push({ reason: 'items of different kinds (a dashboard or bento layout)', element: describe(el, '') });
      continue;
    }
    const rowsOf = [];
    for (const b of boxes) {
      const row = rowsOf.find((list) => Math.abs(list[0].cell.top - b.cell.top) <= 2);
      if (row) row.push(b); else rowsOf.push([b]);
    }
    const spread = (values) => (values.length >= 2 ? Math.round(Math.max(...values) - Math.min(...values)) : 0);
    const rect = el.getBoundingClientRect();
    const contentWidth = rect.width - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0')
      - parseFloat(style.borderLeftWidth || '0') - parseFloat(style.borderRightWidth || '0');
    let emptyBand = null;
    const widths = boxes.map((b) => b.rect.width);
    let columnWidth = Math.round(Math.min(...cells.map((c) => c.width)));
    if (isCssGrid) {
      const tracks = style.gridTemplateColumns.split(/\s+/).map(parseFloat).filter((v) => Number.isFinite(v));
      if (tracks.length) {
        const gap = parseFloat(style.columnGap) || 0;
        emptyBand = Math.max(0, Math.round(contentWidth - tracks.reduce((sum, v) => sum + v, 0) - gap * (tracks.length - 1)));
        columnWidth = Math.round(tracks[0]);
      }
    } else if (rowsOf.length >= 2) {
      const contentRight = rect.right - parseFloat(style.paddingRight || '0') - parseFloat(style.borderRightWidth || '0');
      emptyBand = Math.max(0, Math.round(contentRight - Math.max(...rowsOf[0].map((b) => b.cell.right))));
    }
    const srcCounts = new Map();
    for (const b of boxes) {
      const image = b.tile.querySelector('img[src]');
      if (image) srcCounts.set(image.getAttribute('src'), (srcCounts.get(image.getAttribute('src')) || 0) + 1);
    }
    grids.push({
      element: describe(el, `grid of ${tiles.length}`),
      tiles: boxes.slice(0, 6).map((b) => describe(b.box, textOf(b.box).slice(0, 40))),
      heightSpread: Math.max(0, ...rowsOf.map((row) => spread(row.map((b) => b.rect.height)))),
      widthSpread: spread(widths),
      baselineSpread: Math.max(0, ...rowsOf.map((row) => spread(row.map((b) => b.baseline).filter((v) => v !== null)))),
      columnWidth,
      emptyBand,
      repeatedImage: srcCounts.size ? Math.max(...srcCounts.values()) : 0,
    });
  }


  // C14: per screenful. The same call to action repeated (a header and a hero "Sign up") counts once, so
  // do parallel options (the same button in the same place of sibling tiles of one kind and width). A
  // pinned (sticky, fixed) control is in every screenful. Every collapsed control is listed in the
  // measure's `excluded`, with why, so no evidence is dropped silently.
  const ids = new Map();
  const idOf = (el) => { if (!ids.has(el)) ids.set(el, ids.size); return ids.get(el); };
  // Controls are grouped by the sibling block they sit in (the tile), and tiles are indexed by parent
  // and sorted by top. A tile only compares with tiles inside one screenful, so a long table never
  // compares every row with every other row.
  const controlsByTile = new Map();
  const tileLists = new Map();
  for (const c of boxed) {
    const tile = tiles.get(c);
    if (!tile) continue;
    if (!controlsByTile.has(tile)) controlsByTile.set(tile, []);
    controlsByTile.get(tile).push(c);
    if (!tileLists.has(tile.parentElement)) tileLists.set(tile.parentElement, new Set());
    tileLists.get(tile.parentElement).add(tile);
  }
  for (const [parent, list] of tileLists) tileLists.set(parent, Array.from(list).sort((a, b) => rectOf(a).top - rectOf(b).top));
  const tilePeerCache = new Map();
  const peersOfTile = (tile) => {
    if (tilePeerCache.has(tile)) return tilePeerCache.get(tile);
    const list = tileLists.get(tile.parentElement) || [tile];
    const top = rectOf(tile).top;
    let low = 0;
    let high = list.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (rectOf(list[middle]).top < top - innerHeight) low = middle + 1;
      else high = middle;
    }
    const peers = [];
    for (let index = low; index < list.length && rectOf(list[index]).top < top + innerHeight; index += 1) {
      if (list[index] !== tile) peers.push(list[index]);
    }
    tilePeerCache.set(tile, peers);
    return peers;
  };
  const keyOf = (c) => {
    const tile = tiles.get(c);
    if (tile) {
      const box = rectOf(tile);
      const at = c.rect.bottom - box.bottom;
      const peers = peersOfTile(tile).flatMap((otherTile) => (controlsByTile.get(otherTile) || []).filter((other) => other.kind === c.kind));
      const twin = peers.some((other) => comparable(box, rectOf(tiles.get(other)))
        && Math.abs((other.rect.bottom - rectOf(tiles.get(other)).bottom) - at) <= 12);
      const sameWords = peers.some((other) => other.words.toLowerCase() === c.words.toLowerCase());
      const sideBySide = new Set(peers
        .filter((other) => {
          const otherBox = rectOf(tiles.get(other));
          return Math.abs(otherBox.top - box.top) <= 2 && Math.abs(otherBox.width - box.width) <= 2;
        })
        .map((other) => tiles.get(other))).size;
      // Two sibling blocks with different commits (Save profile / Update password) are two primaries;
      // only a repeated commit (same words) or a row of three or more equal options (a pricing row) is
      // one parallel choice set.
      if (twin && (sameWords || sideBySide + 1 >= 3)) {
        return { key: `parallel:${c.kind}:${idOf(tile.parentElement)}`, type: 'parallel', label: c.words };
      }
    }
    return { key: `text:${c.kind}:${c.words.toLowerCase()}`, type: 'text', label: c.words };
  };
  // The screenful holding the most distinct keys, and its controls (one per key, the rest collapsed
  // with a reason). A sliding window keeps this linear on a long page: starts are evaluated once per
  // distinct top, and the window only advances.
  const screenfulOf = (list) => {
    const items = list.map((c) => ({ c, ...keyOf(c), top: c.rect.top + scrollY })).sort((a, b) => a.top - b.top);
    const pins = items.filter((item) => item.c.pinned);
    const flowing = items.filter((item) => !item.c.pinned);
    const pinnedCounts = new Map();
    for (const item of pins) {
      if (!pinnedCounts.has(item.key)) pinnedCounts.set(item.key, []);
      pinnedCounts.get(item.key).push(item);
    }
    const counts = new Map();
    const add = (item) => { if (!counts.has(item.key)) counts.set(item.key, []); counts.get(item.key).push(item); };
    const remove = (item) => { const bucket = counts.get(item.key); if (!bucket) return; bucket.shift(); if (!bucket.length) counts.delete(item.key); };
    const distinct = () => {
      let size = counts.size + pinnedCounts.size;
      for (const key of pinnedCounts.keys()) if (counts.has(key)) size -= 1;
      return size;
    };
    let bestCount = flowing.length ? -1 : pinnedCounts.size;
    let bestStart = 0;
    let bestEnd = 0;
    let cursor = 0;
    let windowStart = 0;
    for (let start = 0; start < flowing.length; start += 1) {
      if (start > 0 && flowing[start].top === flowing[start - 1].top) continue;
      while (cursor < flowing.length && flowing[cursor].top < flowing[start].top + innerHeight) { add(flowing[cursor]); cursor += 1; }
      while (windowStart < cursor && flowing[windowStart].top < flowing[start].top) { remove(flowing[windowStart]); windowStart += 1; }
      const count = distinct();
      if (count > bestCount) { bestCount = count; bestStart = start; bestEnd = cursor; }
    }
    const byKey = new Map();
    for (const item of [...pins, ...flowing.slice(bestStart, bestEnd)]) {
      if (!byKey.has(item.key)) byKey.set(item.key, { first: item, others: [] });
      else byKey.get(item.key).others.push(item);
    }
    const elements = [];
    const collapsed = [];
    for (const { first, others } of byKey.values()) {
      elements.push(info(first.c));
      if (others.length) {
        collapsed.push({
          reason: first.type === 'parallel'
            ? `counted once in this screenful: parallel option of "${first.label}" — confirm both end in the same commit`
            : `counted once in this screenful: same label as "${first.label}" — confirm it is not a second commit`,
          elements: others.map((other) => info(other.c)),
        });
      }
    }
    return { elements, collapsed };
  };
  const filled = boxed.filter((c) => c.kind === 'filled');
  const filledScreen = screenfulOf(filled);
  const boxedScreen = screenfulOf(boxed);


  // C19: the action group holding the view's one filled primary aligns to a content edge it acts on:
  // the edge of any ancestor up to the nearest one that also holds other content. A wrapper that hugs
  // the group (its content box no wider than the group) is not an edge.
  let actionEdge = null;
  let actionEdgeReason = filled.length ? 'several filled primaries: align the one that remains' : 'no filled primary';
  if (filled.length === 1) {
    const group = groups.find((g) => g.axis === 'line' && g.list.includes(filled[0]));
    const members = group ? group.list.map((c) => c.el) : [filled[0].el];
    const left = Math.min(...members.map((el) => el.getBoundingClientRect().left));
    const right = Math.max(...members.map((el) => el.getBoundingClientRect().right));
    const holdsOther = (node) => Array.from(node.querySelectorAll('*')).some((el) => !members.some((m) => m.contains(el) || el.contains(m))
      && visibleBox(el) && (el.matches('img, svg, canvas, video, input, select, textarea, button, a[href]')
        || Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())));
    let best = Infinity;
    let edgeEl = null;
    for (let node = filled[0].el.parentElement; node && (node === root || root.contains(node)); node = node.parentElement) {
      if (members.some((m) => !node.contains(m))) continue;
      const style = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      const innerLeft = r.left + parseFloat(style.paddingLeft || '0') + parseFloat(style.borderLeftWidth || '0');
      const innerRight = r.right - parseFloat(style.paddingRight || '0') - parseFloat(style.borderRightWidth || '0');
      if (innerRight - innerLeft > right - left + 2) {
        const offset = Math.min(Math.abs(right - innerRight), Math.abs(left - innerLeft));
        if (offset < best) { best = offset; edgeEl = node; }
      }
      if (holdsOther(node)) break;
    }
    if (edgeEl) actionEdge = { offset: Math.round(best), elements: [info(filled[0]), describe(edgeEl, 'nearest content edge')] };
    else actionEdgeReason = 'no content edge around the primary';
  }

  // Styling a reviewer would see but an offline render could not load: a remote stylesheet or script
  // (a CSS framework CDN) or a web font that failed. A remote image alone does not change the measures.
  const remoteStyling = [
    ...Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]')).map((l) => l.href).filter((href) => /^https?:/i.test(href)),
    ...Array.from(document.querySelectorAll('script[src]')).map((s) => s.src).filter((src) => /^https?:/i.test(src)),
    ...(document.fonts ? Array.from(document.fonts).filter((font) => font.status === 'error').map((font) => `font ${font.family}`) : []),
  ];

  return {
    visible: true,
    touch: Boolean(args && args.touch),
    screenful: {
      filled: filledScreen.elements,
      boxed: boxedScreen.elements,
      collapsed: { filled: filledScreen.collapsed, boxed: boxedScreen.collapsed },
    },
    filledControls: filled.length,
    tinted: boxed.filter((c) => c.kind === 'tinted').map(info),
    unknownStyles: controls.filter((c) => c.unknownStyle).length,
    groups: groupData,
    groupsTruncated,
    rows,
    rowsExcluded: limited(rowsExcluded, 12),
    rowsTruncated: rowEls.length > rowMax ? rowMax : 0,
    structuralRows: structuralRowCount,
    blocks,
    icons,
    iconsTruncated: Math.max(0, iconCandidates.length - iconControls.length),
    imageControls,
    grids,
    gridsExcluded: limited(gridsExcluded, 12),
    actionEdge,
    actionEdgeReason,
    remoteStyling,
  };
}

module.exports = {
  HEURISTIC_DEFAULTS,
  BUDGET_KEYS,
  MEASURES,
  resolveBudget,
  summarize,
  overLimit,
  collectMetrics,
};
