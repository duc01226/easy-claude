#!/usr/bin/env node
'use strict';

/**
 * build-board: one HTML page the owner picks from by eye (references/explore/option-discovery.md).
 *
 * Usage:
 *   node .claude/skills/ui-design/scripts/build-board.cjs --out=<board.html> [--title=<text>] <input.json>...
 *
 * Inputs (each file is one of):
 *   options file   a JSON array of options (a moodboard of style families, or a layout board):
 *     { id, kind: "style-family"|"layout-archetype", name, oneLine?, feelKeywords?[], fit?{ quality: 1-3 },
 *       howItCouldLook?, mobileSpeedNotes?, localeNotes?, tellRisk?, a11yNotes?, reuseAndForks?,
 *       examples: [{ name, url?, sourceGallery?, desktop?, phone?, whatMakesItWow?, accessed?, captureStatus? }] }
 *   drafts file    the compare page of the drafted options (style × layout combinations):
 *     { kind: "drafts", directions: [{ id, name, style?, layout?, note?, href?, views: [{ name, desktop?, phone? }] }] }
 *     Rendered as a matrix: the options in columns (header: name, style, layout, note, a link to the
 *     clickable draft), the same screens in rows, phone and desktop side by side in each cell.
 *   Image and href paths are relative to the input file (or absolute); an href may also be http(s).
 *
 * Output: one page with no script and no remote resource (a CSP allows only local images and the
 * inline style), light and dark, phone-friendly, a sticky group nav, options numbered 1..N and
 * examples numbered n.k, so the owner can answer with numbers ("3, 5.2, mix 7 and 9"); a drafts
 * file adds a compare matrix whose columns are lettered A, B, C ... so the owner can answer
 * "style of B, layout of A".
 * Every text from the inputs is HTML-escaped (titles and notes may come from live pages), and only
 * http(s) URLs become links.
 *
 * Exit: 0 written; 1 the board could not be written; 2 usage error or an invalid input file.
 */

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const EXIT = Object.freeze({ OK: 0, ERROR: 1, USAGE: 2 });
const KINDS = new Set(['style-family', 'layout-archetype']);
const FIT_MAX = 3;
const USAGE = 'Usage: node .claude/skills/ui-design/scripts/build-board.cjs --out=<board.html> [--title=<text>] <input.json>...';

class UsageError extends Error {}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isWebUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// A link only for http(s); anything else (javascript:, data:, file:) is shown as plain text.
function link(url, text) {
  if (!url) return '';
  if (!isWebUrl(url)) return `<span class="src">${escapeHtml(text || url)}</span>`;
  return `<a class="src" href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(text || url)}</a>`;
}

// A file URL for an absolute path under the given path rules (Windows drive letters kept as-is).
function fileUrl(absolute, pathApi) {
  if (pathApi === path) return pathToFileURL(absolute).href;
  const parts = absolute.split(pathApi.sep);
  return `file:///${parts.map((part, index) => (index === 0 && /^[a-z]:$/i.test(part) ? part : encodeURIComponent(part))).join('/')}`;
}

// The href of `absolute` seen from `fromDir`: a relative link, or a file URL when no relative path
// exists (another Windows drive).
function relativeHref(fromDir, absolute, pathApi = path) {
  const relative = pathApi.relative(fromDir, absolute);
  if (pathApi.isAbsolute(relative)) return fileUrl(absolute, pathApi);
  return relative.split(pathApi.sep).map(encodeURIComponent).join('/');
}

// An image path relative to the board, from a path relative to its input file.
function imageHref(file, inputDir, outDir, pathApi = path) {
  if (typeof file !== 'string' || file === '') return null;
  return relativeHref(outDir, pathApi.resolve(inputDir, file), pathApi);
}

function shot(href, label, kind) {
  if (!href) return `<div class="shot missing ${kind}">no ${escapeHtml(label)} capture</div>`;
  return `<a class="shot ${kind}" href="${escapeHtml(href)}"><img src="${escapeHtml(href)}" alt="${escapeHtml(label)}" loading="lazy"></a>`;
}

function fitDots(fit) {
  if (!fit || typeof fit !== 'object') return '';
  const items = Object.entries(fit).map(([quality, raw]) => {
    const score = Math.max(0, Math.min(FIT_MAX, Number(raw) || 0));
    const dots = '●'.repeat(score) + '○'.repeat(FIT_MAX - score);
    return `<li><span class="dots" aria-hidden="true">${dots}</span> ${escapeHtml(quality)} <span class="sr">${score} of ${FIT_MAX}</span></li>`;
  });
  return items.length ? `<ul class="fit">${items.join('')}</ul>` : '';
}

function chips(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return `<ul class="chips">${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function note(label, value) {
  return value ? `<p class="note"><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</p>` : '';
}

function readInput(file) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new UsageError(`cannot read ${file}: ${String(error.message).split('\n')[0]}`);
  }
  const dir = path.dirname(path.resolve(file));
  if (Array.isArray(data)) {
    data.forEach((option, index) => {
      const where = `${file} option ${index + 1}`;
      if (!option || typeof option.name !== 'string' || option.name === '') throw new UsageError(`${where} needs a name`);
      if (!KINDS.has(option.kind)) throw new UsageError(`${where} kind must be style-family or layout-archetype`);
      if (!Array.isArray(option.examples)) throw new UsageError(`${where} needs an examples array`);
      option.examples.forEach((example, exampleIndex) => {
        if (!example || typeof example !== 'object' || typeof example.name !== 'string' || example.name === '') {
          throw new UsageError(`${where} example ${exampleIndex + 1} needs a name`);
        }
      });
    });
    return { type: 'options', dir, options: data };
  }
  if (data && data.kind === 'drafts' && Array.isArray(data.directions)) {
    data.directions.forEach((direction, index) => {
      if (!direction || typeof direction.name !== 'string' || !Array.isArray(direction.views)) {
        throw new UsageError(`${file} direction ${index + 1} needs a name and a views array`);
      }
    });
    return { type: 'drafts', dir, directions: data.directions };
  }
  throw new UsageError(`${file} is neither an options array nor a { kind: "drafts" } file`);
}

function renderOption(option, number, dir, outDir) {
  const examples = option.examples.map((example, index) => {
    const label = `${number}.${index + 1}`;
    const status = example.captureStatus && example.captureStatus !== 'ok'
      ? `<p class="status">capture: ${escapeHtml(example.captureStatus)}</p>` : '';
    return `<figure class="example" id="o${number}-${index + 1}">
<figcaption><span class="num">${label}</span> ${escapeHtml(example.name)}</figcaption>
<div class="shots">${shot(imageHref(example.desktop, dir, outDir), 'desktop', 'desk')}${shot(imageHref(example.phone, dir, outDir), 'phone', 'phone')}</div>
${example.whatMakesItWow ? `<p>${escapeHtml(example.whatMakesItWow)}</p>` : ''}${status}
<p class="meta">${link(example.url, example.url)}${example.sourceGallery ? ` · via ${escapeHtml(example.sourceGallery)}` : ''}${example.accessed ? ` · ${escapeHtml(example.accessed)}` : ''}</p>
</figure>`;
  }).join('\n');
  return `<section class="option" id="o${number}">
<header><h2><span class="num">${number}</span> ${escapeHtml(option.name)}</h2>
<p class="kind">${escapeHtml(option.kind === 'layout-archetype' ? 'Layout archetype' : 'Style family')}</p>
${option.oneLine ? `<p class="one">${escapeHtml(option.oneLine)}</p>` : ''}</header>
<div class="about">${fitDots(option.fit)}${chips(option.feelKeywords)}
${note('How it could look here', option.howItCouldLook)}${note('Phone and speed', option.mobileSpeedNotes)}${note('Locale and script', option.localeNotes)}${note('Accessibility', option.a11yNotes)}${note('Reuses and forks', option.reuseAndForks)}${note('Tell risk', option.tellRisk)}</div>
<div class="examples">${examples || '<p class="note">No examples yet.</p>'}</div>
</section>`;
}

// A link to a clickable draft: a local path relative to the board, or an http(s) URL; anything else
// (javascript:, data:, file:) is plain text.
function draftLink(href, dir, outDir, pathApi = path) {
  if (typeof href !== 'string' || href === '') return '';
  if (isWebUrl(href)) return `<a class="src" href="${escapeHtml(href)}" rel="noopener noreferrer">Open the clickable draft</a>`;
  // A scheme (javascript:, data:, file:) is text; a Windows drive path (C:\...) is a path, not a scheme.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^[a-z]:[\\/]/i.test(href)) return `<span class="src">${escapeHtml(href)}</span>`;
  return `<a class="src" href="${escapeHtml(imageHref(href, dir, outDir, pathApi))}">Open the clickable draft</a>`;
}

function letter(index) {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

// The compare matrix: options in columns, the same screens in rows (in the first option's order,
// then any screen only a later option has).
function renderDrafts(directions, dir, outDir) {
  const names = [];
  for (const direction of directions) {
    for (const view of direction.views) if (view && !names.includes(view.name)) names.push(view.name);
  }
  const head = directions.map((direction, index) => `<th scope="col" id="d${index + 1}"><b><span class="num">${letter(index)}</span> ${escapeHtml(direction.name)}</b>
${direction.style ? `<span class="axis">Style: ${escapeHtml(direction.style)}</span>` : ''}${direction.layout ? `<span class="axis">Layout: ${escapeHtml(direction.layout)}</span>` : ''}
${direction.note ? `<span class="one">${escapeHtml(direction.note)}</span>` : ''}${draftLink(direction.href, dir, outDir)}</th>`).join('');
  const rows = names.map((name) => `<tr><th scope="row">${escapeHtml(name)}</th>${directions.map((direction) => {
    const view = direction.views.find((item) => item && item.name === name);
    if (!view) return `<td><div class="shot missing">no ${escapeHtml(name)} screen</div></td>`;
    return `<td><div class="cell">${shot(imageHref(view.phone, dir, outDir), 'phone', 'phone')}${shot(imageHref(view.desktop, dir, outDir), 'desktop', 'desk')}</div></td>`;
  }).join('')}</tr>`).join('\n');
  return `<section class="option compare" id="compare">
<header><h2>Compare the options</h2><p class="one">The same screens for every option: phone on the left, desktop on the right. Click a picture for full size.</p></header>
<div class="wrap"><table><thead><tr><th></th>${head}</tr></thead>
<tbody>${rows}</tbody></table></div>
</section>`;
}

const STYLE = `:root{--bg:#fafaf9;--fg:#1c1917;--muted:#57534e;--line:#d6d3d1;--card:#fff;--accent:#1d4ed8}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e;--line:#44403c;--card:#1c1917;--accent:#93c5fd}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1400px;margin:0 auto;padding:0 16px 48px}h1{font-size:1.6rem;margin:24px 0 4px}
nav{position:sticky;top:0;z-index:1;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 16px;overflow-x:auto;white-space:nowrap}
nav a{color:var(--accent);margin-right:14px;text-decoration:none}
.option{border-top:1px solid var(--line);padding:24px 0}.option h2{margin:0;font-size:1.3rem}
.num{display:inline-block;min-width:2.2em;font-variant-numeric:tabular-nums;color:var(--accent)}
.kind,.meta,.status,.note{color:var(--muted);margin:4px 0}.one{margin:6px 0 0;max-width:70ch}
.about{margin:12px 0}.fit,.chips{list-style:none;padding:0;margin:8px 0;display:flex;flex-wrap:wrap;gap:6px 16px}
.chips li{border:1px solid var(--line);border-radius:999px;padding:2px 10px}.dots{letter-spacing:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.examples{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:16px}
.example{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px}
.example figcaption{font-weight:600;margin-bottom:8px}.shots{display:grid;grid-template-columns:3fr 1fr;gap:8px;align-items:start}
.shot img{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:4px}
.missing{display:flex;align-items:center;justify-content:center;min-height:90px;border:1px dashed var(--line);border-radius:4px;color:var(--muted);font-size:.85rem;text-align:center}
a.src{color:var(--accent);word-break:break-all}
.wrap{overflow-x:auto}table{border-collapse:collapse}th,td{border-top:1px solid var(--line);padding:10px;vertical-align:top;text-align:left}
thead th{min-width:280px}thead th b{display:block;font-size:1.05rem}.axis{display:block;color:var(--muted);font-size:.9rem}
thead th .one{display:block;color:var(--muted);font-size:.9rem;margin:4px 0 6px;max-width:40ch}tbody th{width:120px;font-size:.9rem}
.cell{display:grid;grid-template-columns:1fr 3fr;gap:6px;align-items:start;min-width:260px}`;

function renderBoard(inputs, outFile, title) {
  const outDir = path.dirname(outFile);
  const sections = [];
  const navItems = [];
  let number = 0;
  let hasDrafts = false;
  for (const input of inputs) {
    if (input.type === 'drafts') {
      hasDrafts = true;
      sections.push(renderDrafts(input.directions, input.dir, outDir));
      input.directions.forEach((direction, index) => {
        navItems.push(`<a href="#d${index + 1}">${letter(index)}. ${escapeHtml(direction.name)}</a>`);
      });
      continue;
    }
    for (const item of input.options) {
      number += 1;
      sections.push(renderOption(item, number, input.dir, outDir));
      navItems.push(`<a href="#o${number}">${number}. ${escapeHtml(item.name)}</a>`);
    }
  }
  const hint = hasDrafts
    ? 'Pick one option, or mix them: "style of B, layout of A", or one part of each. A swap from the research board ("A in style 7") works too, and so do "more" and "none fit".'
    : 'The evidence behind the options on the compare page. Each family and archetype has a number: use it there to swap a part, for example "A in style 7" or "C with layout 12".';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style></head>
<body><nav aria-label="Options">${navItems.join('')}</nav>
<main><h1>${escapeHtml(title)}</h1>
<p class="note">${escapeHtml(hint)}</p>
${sections.join('\n')}
</main></body></html>
`;
}

function parseArgs(argv) {
  const options = { out: null, title: 'Option board', inputs: [] };
  for (const arg of argv) {
    if (arg === '--help') return { help: true };
    const match = /^--(out|title)=(.*)$/.exec(arg);
    if (match) {
      options[match[1]] = match[2];
    } else if (arg.startsWith('--')) {
      throw new UsageError(`unknown argument: ${arg}`);
    } else {
      options.inputs.push(arg);
    }
  }
  if (!options.out) throw new UsageError('--out=<board.html> is required');
  if (options.inputs.length === 0) throw new UsageError('give at least one options or drafts JSON file');
  return options;
}

function main(argv = process.argv.slice(2)) {
  let options;
  let inputs;
  try {
    options = parseArgs(argv);
    if (options.help) {
      console.log(USAGE);
      return EXIT.OK;
    }
    inputs = options.inputs.map(readInput);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Usage error: ${error.message}\n${USAGE}`);
    return EXIT.USAGE;
  }
  const outFile = path.resolve(options.out);
  try {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, renderBoard(inputs, outFile, options.title), 'utf8');
  } catch (error) {
    console.error(`build-board error: could not write ${outFile}: ${error.message}`);
    return EXIT.ERROR;
  }
  console.log(`board: ${outFile}`);
  return EXIT.OK;
}

module.exports = { main, renderBoard, readInput, escapeHtml, isWebUrl, relativeHref, draftLink, EXIT };

if (require.main === module) {
  process.exitCode = main();
}
