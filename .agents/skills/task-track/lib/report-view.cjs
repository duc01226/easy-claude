'use strict';

const crypto = require('node:crypto');
const { projectPathConcerns } = require('../../../hooks/lib/task-tracking-concerns.cjs');
const { vocabularyBlock } = require('../../../hooks/lib/task-tracking-vocabulary.cjs');

// The tracker owns the words. This is the block every read carries: kinds, states and link relations, with the name
// shown for each. The report keeps no list of the words. What stays here is what a view decides: the order it reads
// them in, and which kinds its remaining-work filter lists (the work kinds, written out in `filter` in the page script;
// initiatives and groups are left out).
const VOCABULARY = vocabularyBlock();
const STATE_NAMES = Object.freeze(VOCABULARY.labels.states);
const KIND_NAMES = Object.freeze(VOCABULARY.labels.kinds);
const KIND_WORDS = Object.freeze(Object.fromEntries(VOCABULARY.kinds.map(kind => [kind, [KIND_NAMES[kind].toLowerCase(), VOCABULARY.labels.kindsPlural[kind].toLowerCase()]])));
const LINK_NAMES = Object.freeze(VOCABULARY.labels.linkRoles);
const DELIVERY_KIND = VOCABULARY.deliveryKind;
const GROUP_KINDS = Object.freeze(VOCABULARY.groupKinds);
// The lifecycle line. Blocked work waits beside In progress; canceled work is off the line.
const STATIONS = Object.freeze(['draft', 'planned', 'ready', 'in_progress', 'verifying', 'done']);
// A person's blocks read from what needs them next to what is finished.
const PEOPLE_ORDER = Object.freeze(['verifying', 'in_progress', 'blocked', 'ready', 'planned', 'draft', 'done']);
const PROOF_NAMES = Object.freeze({ current: 'Proved', stale: 'Proof stale', missing: 'No proof', unknown: 'Proof unknown' });
const MIGRATE = 'migrate --root <checkout>';
// What the snapshot says about the vocabulary its source stores. Two vocabularies at once, or a migration that stopped
// part-way, means nothing was read as work.
function storedVocabulary(snapshot) { return snapshot.vocabulary?.project || null; }
function unreadableSource(snapshot) { const stored = storedVocabulary(snapshot); return !!stored?.code && stored.storedVersion === null; }
const UNASSIGNED = '__unassigned__';
const PIP_LIMIT = 8;
const BLOCK_LIMIT = 120;
const DENSE_BLOCKS = 40;
const LABELLED_BLOCKS = 12;
const FEW_BLOCKS = 4;
const GHOST_BLOCKS = 8;
const WAITING_LIMIT = 12;
const PERSON_BLOCKS = 24;
// Inline line icons, one path each, drawn in the current text colour. Nothing is loaded.
const ICONS = Object.freeze({ check: 'M5 12.5l4.5 4.5L19 7.5', clock: 'M12 7.5V12l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.4', seal: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z',
    person: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0',
    lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
    print: 'M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z' });

// All record content is data. Never interpret markdown, HTML or record paths here.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function inlineJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function array(value) { return Array.isArray(value) ? value : []; }
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
function words(value) { return String(value || 'unknown').replace(/_/g, ' '); }
function capital(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function plural(total, one, many) { return `${total} ${total === 1 ? one : many}`; }
function recordKey(item) { return JSON.stringify([item.id, item.ownerPath]); }
function recordAnchor(item) { return `record-${encodeURIComponent(recordKey(item))}`; }
function stateName(state) { return STATE_NAMES[state] || words(state); }
function stateClass(state) { return STATE_NAMES[state] ? state : 'other'; }
function onLine(item) { return STATIONS.includes(item.state) || item.state === 'blocked'; }
function idTail(id) { return id.includes('-') ? id.slice(id.lastIndexOf('-') + 1) : id; }
function instant(value) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(0, 10)} ${value.slice(11, 16)} UTC` : value || 'Date unknown';
}
function day(value) { return /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10) : value || 'Date unknown'; }
function memberLabel(id, members) {
    if (!id) return 'Unassigned';
    const member = members.find(person => person.id === id);
    return member ? `${member.displayName}${member.active === false ? ' (inactive)' : ''}` : `Unknown member (${id})`;
}
function acceptanceLabel(item) {
    if (item.acceptance?.accepted === true) return 'Accepted delivery';
    return item.state === 'done' ? 'Recorded Done; acceptance unverified' : 'Not accepted';
}
function verificationLabel(item) {
    return ({ current: 'Current verification', stale: 'Stale verification', missing: 'No current proof', unknown: 'Verification unknown' })[item.verification?.status] || 'Verification unknown';
}
function kindBreakdown(records) {
    const totals = new Map();
    for (const item of records) totals.set(item.kind, (totals.get(item.kind) || 0) + 1);
    const known = Object.keys(KIND_WORDS);
    return [...known.filter(kind => totals.has(kind)), ...[...totals.keys()].filter(kind => !known.includes(kind))]
        .map(kind => plural(totals.get(kind), KIND_WORDS[kind]?.[0] || kind, KIND_WORDS[kind]?.[1] || kind)).join(', ');
}
function groupLabel(item, snapshot) {
    return item?.groupRole ? snapshot.hierarchy?.labels?.[item.groupRole] || item.groupRole : 'Generic group';
}
function groupName(id, snapshot) {
    const matching = array(snapshot.items).filter(item => item.id === id);
    return matching.length === 1 ? `${groupLabel(matching[0], snapshot)} ${id}: ${matching[0].title}` : `Unavailable group ${id}`;
}
function scopeName(snapshot) {
    const scope = snapshot.metrics?.scope || snapshot.scope;
    return scope?.kind === 'group' && scope.itemId ? groupName(scope.itemId, snapshot) : null;
}
function groupAnchor(id, parent) { return `inspect-group-${encodeURIComponent(JSON.stringify(parent ? [parent, id] : [id]))}`; }
function pathAnchor(path) { return `inspect-path-${encodeURIComponent(path)}`; }
function linkedPath(path) { return `<a href="#${escapeHtml(pathAnchor(path))}">Inspect path ${escapeHtml(path)}</a>`; }
function renderHierarchy(snapshot, byId) {
    const scope = snapshot.scope || {};
    const choose = ids => array(ids).map(id => byId.get(id)).filter(Boolean);
    const list = (name, records) => `<details><summary>${escapeHtml(name)} (${records.length})</summary><ul class="reasons" aria-label="${escapeHtml(name)}">${records.map(item => `<li>${linkedRecord(item.id, byId)}</li>`).join('')}</ul></details>`;
    const groups = array(snapshot.hierarchy?.groups);
    // Only direct edges get native contexts. Never expand every ancestry path through a diamond.
    const contexts = groups.flatMap(group => [[group.id], ...array(group.parentGroupIds).map(parent => [parent, group.id])]);
    const inspections = contexts.map(path => {
        const id = path.at(-1), item = byId.get(id);
        if (!item) return '';
        const group = groups.find(candidate => candidate.id === id);
        const parent = path.length > 1 ? path[0] : null;
        return `<section class="card" id="${escapeHtml(groupAnchor(id, parent))}" data-group-context="${escapeHtml(JSON.stringify(path))}" aria-label="Inspected group/path ${escapeHtml(path.join(' / '))}">
<h3 tabindex="-1">Inspected group/path: ${escapeHtml(path.map(value => groupName(value, snapshot)).join(' / '))}</h3>
<p class="note">Delivery scope: ${escapeHtml(scopeName(snapshot) || 'Whole project')}. These are inspection links; the fixed delivery count and eligible list remain unchanged.</p>
<p>Group purpose: ${escapeHtml(groupLabel(item, snapshot))}${item.groupRole ? ` (${escapeHtml(item.groupRole)})` : ''}</p><p>${escapeHtml(item.intent || 'No outcome recorded.')}</p>
${list('Direct members', choose(item.memberItemIds))}
<details><summary>Direct child groups (${array(group?.directGroupIds).length})</summary><ul class="reasons" aria-label="Direct child groups">${array(group?.directGroupIds).map(child => `<li><a href="#${escapeHtml(groupAnchor(child, id))}" data-inspect-group="${escapeHtml(child)}" data-from-group="${escapeHtml(id)}">Inspect group ${escapeHtml(child)}: ${escapeHtml(byId.get(child)?.title || 'Unavailable')}</a></li>`).join('')}</ul></details>
<details><summary>Other direct affiliations (${array(group?.parentGroupIds).length})</summary><ul class="reasons">${array(group?.parentGroupIds).map(other => `<li><a href="#${escapeHtml(groupAnchor(id, other))}" data-inspect-group="${escapeHtml(id)}" data-from-group="${escapeHtml(other)}" data-alternate-affiliation="true">Enter through ${escapeHtml(other)}</a></li>`).join('')}</ul></details>
<p><a href="#${escapeHtml(parent ? groupAnchor(parent) : 'work')}" class="control" data-inspection-back>Back to previous context</a> ${linkedRecord(id, byId)}</p></section>`;
    }).join('');
    const related = scope.kind === 'group' ? `${list('Excluded tasks', choose(scope.excludedTaskIds))}${list('Supporting work', choose(scope.memberIds).filter(item => item.kind !== DELIVERY_KIND && !GROUP_KINDS.includes(item.kind)))}${list('Outside delivery scope', array(snapshot.items).filter(item => item.id !== scope.itemId && !array(scope.memberIds).includes(item.id)))}`
        : list('Ungrouped tasks', choose(snapshot.hierarchy?.ungroupedTaskIds));
    const rootLinks = groups.map(group => `<li><a href="#${escapeHtml(groupAnchor(group.id))}" data-inspect-group="${escapeHtml(group.id)}">${escapeHtml(groupName(group.id, snapshot))}</a></li>`).join('');
    return `<div class="disclosures">${related}<details><summary>Inspect groups (${groups.length})</summary><ul class="reasons">${rootLinks}</ul></details></div><p id="inspected-group-path" class="note" role="status">Inspected group/path: ${escapeHtml(scope.kind === 'group' ? groupName(scope.itemId, snapshot) : 'Direct project entry')}</p><div aria-label="Group inspection">${inspections}</div>`;
}
function renderPathConcerns(snapshot, byId) {
    const paths = [...new Set(array(snapshot.items).flatMap(item => array(item.links).map(link => link.path).filter(path => typeof path === 'string')))];
    // One walk of the snapshot answers every panel; each entry is the exact single-path concern query for its path.
    return projectPathConcerns(snapshot, paths).map(({ path, result, error }) => {
        if (error) {
            if (!['UNSAFE_PATH', 'INVALID_INPUT'].includes(error.code)) throw error;
            return `<section class="card" id="${escapeHtml(pathAnchor(path))}" aria-label="Exact linked concerns for ${escapeHtml(path)}"><h3 tabindex="-1">Linked concerns unavailable</h3><p>${escapeHtml(error.message)}. No replacement path was inferred.</p><a class="control" href="#work">Back to Work</a></section>`;
        }
        return `<section class="card" id="${escapeHtml(pathAnchor(path))}" aria-label="Exact linked concerns for ${escapeHtml(path)}"><h3 tabindex="-1">Linked concerns: ${escapeHtml(path)}</h3><p class="note">Exact path selection, as of ${escapeHtml(instant(result.asOf))}. Coverage: ${escapeHtml(result.coverage)}. Path availability is unverified in this offline snapshot. Delivery scope remains ${escapeHtml(scopeName(snapshot) || 'Whole project')}.</p><ul class="reasons">${result.relationships.map(link => `<li>${escapeHtml(link.direction)}: ${linkedRecord(link.owner.itemId, byId)} (${escapeHtml(link.owner.ownerPath)}) declares ${escapeHtml(link.relation)}; ${escapeHtml(link.resolution)}. ${escapeHtml(link.rationale)}</li>`).join('')}</ul><a class="control" href="#work">Back to Work</a></section>`;
    }).join('');
}
function jsonDetails(label, values) {
    return `<details><summary>${escapeHtml(label)} (${values.length})</summary><ol class="evidence">${values.map(value => `<li><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></li>`).join('')}</ol></details>`;
}

// Four separately recorded facts get four separate marks: state, responsible person, proof and acceptance.
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[name]}"/></svg>`; }
function dot(name, small) { return `<span class="dot is-${name}${small ? ' dot--s' : ''}" aria-hidden="true"></span>`; }
function kindMark(item) {
    return `<span class="kind${item.kind === DELIVERY_KIND && item.state !== 'canceled' ? ' kind--delivery' : ''}">${escapeHtml(KIND_NAMES[item.kind] || item.kind)}</span>`;
}
function stateMark(item) { return `<span class="mark state is-${stateClass(item.state)}">${dot(stateClass(item.state), true)}<span>${escapeHtml(stateName(item.state))}</span></span>`; }
function proofMark(item) {
    const status = PROOF_NAMES[item.verification?.status] ? item.verification.status : 'unknown';
    const total = array(item.criteria).length;
    return `<span class="mark proof proof--${status}">${total ? `<span class="pips" aria-hidden="true">${'<span class="pip"></span>'.repeat(Math.min(total, PIP_LIMIT))}</span>` : ''}${total > PIP_LIMIT ? `<span>+${total - PIP_LIMIT}</span>` : ''}<span>${total ? PROOF_NAMES[status] : 'No criteria'}</span></span>`;
}
function sealMark(item) {
    if (item.acceptance?.accepted === true) return `<span class="seal">${icon('check')}Accepted</span>`;
    return `<span class="seal seal--none">${item.state === 'done' ? 'Done, not accepted' : 'Not accepted'}</span>`;
}
function flags(item) { return item.retired ? '<span class="flag">Retired</span>' : ''; }

// Type comes from the reader's own platform: the report is one file and loads nothing, so it names no bundled face.
// Titles and figures ask for the heaviest weight the platform stack offers.
const STYLES = `
:root{color-scheme:light dark;--work-paper:#F1F4F7;--record-sheet:#FFFFFF;--tray:#E7ECF1;--record-ink:#122230;--record-note:#3D5164;--record-faint:#586C7F;--record-edge:#6F8394;--hairline:#D5DDE5;--line-strong:#AEBBC8;--ownership-action:#1B5FC4;--action-wash:#E2ECFB;--on-action:#FFFFFF;--proof-current:#0A775F;--proof-stale:#855600;--stale-wash:#FAEDCB;--stale-fill:#E5A41B;--blocked:#B3470B;--blocked-wash:#FBE6D9;--verifying:#6341BF;--verifying-wash:#EBE5F9;
--font-display:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;--font-text:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;--font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
--caption:.75rem;--small:.8125rem;--body:.9375rem;--lead:1rem;--section:1.375rem;--title:1.625rem;--headline:1.875rem;--display:2.375rem;--masthead:3.75rem;--hero:4.5rem;--radius-card:16px;--radius-panel:14px;--radius-control:10px}
@media (prefers-color-scheme:dark){:root{--work-paper:#0F1820;--record-sheet:#0B1218;--tray:#16212B;--record-ink:#E7EDF3;--record-note:#B4C1CE;--record-faint:#8B9DAE;--record-edge:#7C91A3;--hairline:#25333E;--line-strong:#3D4F5E;--ownership-action:#82B4FF;--action-wash:#162A45;--on-action:#07111D;--proof-current:#52D1AF;--proof-stale:#F0C050;--stale-wash:#31280F;--stale-fill:#F0C050;--blocked:#FF9C66;--blocked-wash:#382014;--verifying:#B9A4FF;--verifying-wash:#231C3F}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-padding-top:16px;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--record-sheet);color:var(--record-ink);font:400 var(--body)/1.5 var(--font-text);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,p,ul,ol,dl,dd,pre{margin:0}
ul,ol{padding:0;list-style:none}
h1,h2,h3,h4,p,li,dt,dd,a,button,summary,pre{overflow-wrap:anywhere}
a{color:var(--ownership-action);text-underline-offset:3px}
button,input,select{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--ownership-action);outline-offset:2px}
.record-detail h3:focus{outline:none}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.icon{flex-shrink:0;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.mono{font-family:var(--font-mono);font-size:var(--caption);font-weight:400}
.id{font:400 var(--caption)/1.5 var(--font-mono);color:var(--record-faint)}
.note{font-size:.84375rem;color:var(--record-faint)}
.eyebrow{font:700 var(--caption)/1.4 var(--font-text);letter-spacing:.06em;text-transform:uppercase;color:var(--record-faint)}
.is-none{color:var(--record-faint)}
.skip{position:absolute;top:-100px;left:16px;z-index:2;padding:12px 14px;border-radius:var(--radius-control);background:var(--record-sheet);font-weight:700}
.skip:focus{top:16px}
.page{max-width:1180px;margin:0 auto;padding:44px 40px 56px;display:flex;flex-direction:column;gap:40px}
.page>*{min-width:0}
button,.control{min-height:44px;max-width:100%;padding:0 16px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line-strong);border-radius:var(--radius-control);background:transparent;color:var(--record-ink);font-weight:600;text-decoration:none;cursor:pointer}
button:hover,.control:hover{background:var(--tray)}
button.primary{border-color:var(--ownership-action);background:var(--ownership-action);color:var(--on-action);font-weight:700}
button.primary:hover{border-color:var(--record-ink);background:var(--record-ink);color:var(--record-sheet)}
.actions{display:flex;flex-wrap:wrap;gap:10px}
html:not(.enhanced) .enhancement-only,html.enhanced .static-only{display:none}
.masthead{display:flex;flex-direction:column;gap:22px}
.masthead-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px 32px}
.masthead-title{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:6px}
.kicker{display:flex;align-items:center;gap:10px;font-size:var(--small);font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--record-note)}
.kicker .icon{width:18px;height:18px}
h1{font:900 var(--masthead)/1.02 var(--font-display);letter-spacing:-.035em;-webkit-font-smoothing:auto}
.standfirst{font-size:1.0625rem;color:var(--record-note)}
.rule{height:6px;border-radius:3px;background:var(--record-ink)}
.source-strip{display:flex;flex-direction:column;gap:16px}
.source-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px 28px}
.source-facts>div{min-width:0;display:flex;flex-direction:column;gap:2px}
.source-facts dt{font:700 var(--caption)/1.5 var(--font-text);letter-spacing:.06em;text-transform:uppercase;color:var(--record-faint)}
.source-facts dd{font-weight:600}
.source-facts .mono{font-size:var(--body);font-weight:600}
.fact-sub{display:block;font-weight:400;color:var(--record-note)}
.fact-line{display:flex;align-items:flex-start;gap:7px}
.fact-line .icon{width:15px;height:15px;margin-top:4px}
.fact--good{color:var(--proof-current)}
.fact--warn{color:var(--proof-stale)}
.fact--stop{color:var(--blocked)}
.notice{padding:12px 16px;border-radius:12px;display:flex;align-items:flex-start;gap:10px;background:var(--stale-wash)}
.notice .icon{margin-top:3px;color:var(--proof-stale)}
.notice--stop{background:var(--blocked-wash)}
.notice--stop .icon{color:var(--blocked)}
.card{min-width:0;padding:24px 26px;border:1px solid var(--line-strong);border-radius:var(--radius-card);display:flex;flex-direction:column;gap:18px}
.split{display:flex;flex-wrap:wrap;align-items:stretch;gap:20px}
.split>.summary{flex:2 1 520px}
.split>.health{flex:1 1 320px;gap:14px}
.hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px 24px}
.hero-lead{min-width:0;display:flex;flex-direction:column;gap:4px}
.eyebrow-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}
.scope-id{font-size:var(--small);font-weight:700;color:var(--record-note)}
.hero-count{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px}
.hero-figure{font:900 var(--hero)/.95 var(--font-display);letter-spacing:-.04em;-webkit-font-smoothing:auto}
.hero-unit{font-size:1.25rem;font-weight:600;color:var(--record-note)}
.hero-rate{display:flex;flex-direction:column;align-items:flex-end}
.hero-rate strong{font:800 2rem/1.1 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.hero-rate span{font-size:var(--small);color:var(--record-faint)}
.hero-title{font:800 var(--headline)/1.15 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.hero-copy{max-width:62ch;color:var(--record-note);text-wrap:pretty}
.ledger{font-weight:600}
.blocks{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:8px}
.blocks--few{grid-template-columns:repeat(auto-fill,minmax(96px,132px))}
.blocks--dense{grid-template-columns:repeat(auto-fill,minmax(14px,1fr));gap:4px}
.blocks--ghost{grid-template-columns:repeat(8,minmax(0,1fr))}
.block-cell{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.block{width:100%;height:54px;border-radius:10px;display:grid;place-items:center}
.block .icon{width:22px;height:22px}
.blocks--dense .block{height:14px;border-radius:3px}
.blocks--dense .icon{display:none}
.block-id{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 var(--caption)/1.3 var(--font-mono);color:var(--record-faint)}
.block--verified{background:var(--proof-current);color:var(--record-sheet)}
.block--accepted{background:var(--record-ink);color:var(--record-sheet);box-shadow:inset 0 -8px 0 var(--stale-fill)}
.block--accepted .icon{margin-bottom:6px}
.block--awaiting{border:2px solid var(--verifying);background:var(--verifying-wash);color:var(--verifying)}
.block--open{border:2px dashed var(--record-edge)}
.block--ghost{border:2px dashed var(--line-strong)}
.block--ghost:nth-child(2){opacity:.8}
.block--ghost:nth-child(3){opacity:.65}
.block--ghost:nth-child(4){opacity:.5}
.block--ghost:nth-child(5){opacity:.38}
.block--ghost:nth-child(6){opacity:.28}
.block--ghost:nth-child(7){opacity:.18}
.block--ghost:nth-child(8){opacity:.1}
.legend{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:.875rem;color:var(--record-note)}
.legend li{display:flex;align-items:center;gap:8px}
.legend strong{color:var(--record-ink)}
.legend .block{flex-shrink:0;width:14px;height:14px;border-radius:4px;box-shadow:none}
.legend .block--accepted{box-shadow:inset 0 -4px 0 var(--stale-fill)}
.card-foot{padding-top:16px;border-top:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 20px}
.caption{flex:1 1 320px;font-size:.84375rem;line-height:1.5;color:var(--record-note)}
.health--unknown{border:2px dashed var(--line-strong)}
.health-headline{font:800 var(--headline)/1.15 var(--font-display);letter-spacing:-.02em;text-wrap:balance;-webkit-font-smoothing:auto}
.health-reason{font-size:.96875rem;line-height:1.55;color:var(--record-note);text-wrap:pretty}
.health-facts{margin-top:auto;padding-top:16px;border-top:1px solid var(--hairline);display:grid;grid-template-columns:96px minmax(0,1fr);gap:6px 12px;font-size:.875rem}
.health-facts dt{color:var(--record-faint)}
.health-facts dd{font-weight:600}
.health-note{font-size:var(--small);line-height:1.45;color:var(--record-faint)}
.health--unknown .health-note{margin-top:auto;padding-top:14px;border-top:1px solid var(--hairline)}
.standing{padding-bottom:22px;gap:10px}
.card-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px}
.card-head h2{font:800 var(--section)/1.25 var(--font-display);letter-spacing:-.015em;-webkit-font-smoothing:auto}
.aside{font-size:.875rem;color:var(--record-faint)}
.line{--line-y:67px;position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:start}
.line::before{content:"";position:absolute;left:calc(100%/12);right:calc(100%/12);top:var(--line-y);height:6px;border-radius:3px;background:var(--line-strong)}
.line>li{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.count{font:900 var(--display)/48px var(--font-display);letter-spacing:-.03em;-webkit-font-smoothing:auto}
.dot-zone{height:44px;display:flex;align-items:center}
.station-name{font-weight:700}
.station-kinds{padding:0 6px;font:400 var(--caption)/1.5 var(--font-mono);color:var(--record-faint)}
.station--none .count,.station--none .station-name{color:var(--record-faint)}
.station--none .station-name{font-weight:600}
.line .station--none .dot{width:18px;height:18px;border:3px solid var(--line-strong);background:var(--record-sheet)}
.siding{margin-top:10px;display:flex;align-items:center;gap:6px}
.siding-hook{width:12px;height:14px;margin-top:-10px;border-left:3px solid var(--blocked);border-bottom:3px solid var(--blocked);border-bottom-left-radius:8px}
.siding-tag{padding:2px 10px;border-radius:999px;background:var(--blocked-wash);color:var(--blocked);font-size:var(--small);font-weight:700}
.is-draft,.is-planned,.is-canceled,.is-other{--state:var(--record-faint)}
.is-ready,.is-in_progress{--state:var(--ownership-action)}
.is-blocked{--state:var(--blocked)}
.is-verifying{--state:var(--verifying)}
.is-done{--state:var(--proof-current)}
.dot{flex-shrink:0;width:24px;height:24px;border:5px solid var(--state);border-radius:50%;background:var(--record-sheet)}
.dot.is-planned,.dot.is-in_progress,.dot.is-verifying,.dot.is-done,.dot.is-blocked{background:var(--state)}
.dot.is-blocked{border-radius:5px}
.dot.is-canceled,.dot.is-other{border-width:2px;border-style:dashed}
.dot--s{width:14px;height:14px;border-width:3px}
.dot--s.is-blocked{border-radius:3px}
.section{display:flex;flex-direction:column;gap:6px}
.section-head{padding-bottom:10px;border-bottom:3px solid var(--record-ink);display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px}
.section-head h2{font:800 var(--title)/1.2 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.section-head .aside{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:0 .4em}
#work-count::after{content:"."}
.queue>li{padding:14px 0;border-bottom:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}
.tag{padding:6px 10px;border-radius:8px;display:flex;align-items:center;gap:8px;background:var(--tray);color:var(--record-note);font-size:var(--small);font-weight:700;line-height:1.3}
.tag .icon{width:15px;height:15px}
.tag--verifying{background:var(--verifying-wash);color:var(--verifying)}
.tag--stale{background:var(--stale-wash);color:var(--proof-stale)}
.tag--blocked{background:var(--blocked-wash);color:var(--blocked)}
.queue .tag{flex:0 0 232px}
.queue-text{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:1px}
.queue-title{font-size:var(--lead);font-weight:700;color:var(--record-ink);text-decoration-color:var(--line-strong);text-decoration-thickness:1.5px}
.queue-title:hover{text-decoration-color:currentColor}
.queue-why{font-size:.875rem;color:var(--record-note)}
.queue-who{flex:0 0 120px;font-weight:600}
.work-region{gap:14px}
.filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 12px}
.filters label{min-width:0;display:flex;flex-direction:column;gap:5px;font-size:var(--small);font-weight:600}
.filters .field{flex:1 1 160px}
.filters .field--search{flex:2 1 220px}
.filters input:not([type=checkbox]),.filters select{width:100%;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--record-edge);border-radius:var(--radius-control);background:var(--record-sheet);font-size:var(--body);font-weight:400}
.filters input::placeholder{color:var(--record-faint);opacity:1}
.filters select{appearance:none;padding-right:34px;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 17px) 50%,calc(100% - 12px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.filters .check{min-height:44px;flex-direction:row;align-items:center;gap:8px;font-size:var(--body);cursor:pointer}
.check input{width:20px;height:20px;margin:0;flex-shrink:0;accent-color:var(--ownership-action)}
.table{border:1px solid var(--line-strong);border-radius:var(--radius-panel);overflow:hidden}
.table-head,.row-line{display:grid;grid-template-columns:minmax(0,1fr) 128px 168px 124px 128px;gap:14px;padding:12px 18px}
.table-head{padding-block:11px;background:var(--tray);color:var(--record-note);font-size:var(--caption);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.work-row{border-top:1px solid var(--hairline)}
.row-line{align-items:center;color:var(--record-ink);text-decoration:none}
.row-line:hover{background:var(--work-paper)}
.row-line:focus-visible{outline-offset:-3px}
.work-row.is-open>.row-line{background:var(--action-wash)}
.cell{min-width:0}
.cell--work{display:flex;align-items:flex-start;gap:10px}
.cell--work .kind{order:-1;min-width:50px;margin-top:3px;text-align:center}
.work-text{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px}
.work-title{font-size:.96875rem;font-weight:600;line-height:1.3}
.work-row--off .work-title{color:var(--record-faint);text-decoration:line-through}
.cell--owner{font-weight:500}
.kind{flex-shrink:0;padding:2px 6px;border:1px solid var(--line-strong);border-radius:4px;color:var(--record-note);font:600 .65625rem/1.4 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.kind--delivery{border-color:var(--record-ink);background:var(--record-ink);color:var(--record-sheet)}
.mark{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.state{font-weight:600}
.state.is-draft,.state.is-planned{color:var(--record-note)}
.state.is-blocked{color:var(--blocked)}
.state.is-canceled,.state.is-other{color:var(--record-faint)}
.pips{display:inline-flex;align-items:center;gap:3px}
.pip{width:10px;height:10px;border:1.5px solid var(--record-edge);border-radius:2px}
.proof{font-size:.84375rem;font-weight:600;color:var(--record-faint)}
.proof--current{color:var(--proof-current)}
.proof--current .pip{border-color:var(--proof-current);background:var(--proof-current)}
.proof--stale{color:var(--proof-stale)}
.proof--stale .pip{border-color:var(--proof-stale);background:var(--stale-fill);transform:rotate(45deg) scale(.86)}
.seal{padding:2px 10px 2px 7px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;background:var(--record-ink);color:var(--record-sheet);font-size:var(--small);font-weight:700;white-space:nowrap}
.seal .icon{width:11px;height:11px;stroke-width:3}
.seal--none{padding:1px 10px;border:1.5px dashed var(--record-edge);background:transparent;color:var(--record-faint);font-weight:600}
.flag{padding:0 8px;border-radius:999px;background:var(--tray);color:var(--record-note);font-size:var(--caption);font-weight:700;white-space:nowrap}
.hint{padding:14px 16px;border-radius:12px;background:var(--work-paper);color:var(--record-note)}
.empty{padding:20px 22px;border:2px dashed var(--line-strong);border-radius:var(--radius-panel);color:var(--record-note)}
.empty-heading{margin-bottom:4px;color:var(--record-ink);font:800 1.25rem/1.25 var(--font-display);letter-spacing:-.01em}
.record-details{min-width:0;display:flex;flex-direction:column;gap:14px}
.record-detail{min-width:0;display:flex;flex-direction:column;gap:14px}
.record-details>.record-detail{padding:20px 22px;border:1px solid var(--line-strong);border-radius:var(--radius-panel)}
.work-row>.record-detail{padding:6px 18px 22px 78px;background:var(--action-wash)}
.work-row>.record-detail .detail-head{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.work-row>.record-detail dt,.work-row>.record-detail .id{color:var(--record-note)}
.detail-head{display:flex;flex-direction:column;gap:6px}
.badge,.marks{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.record-detail h3{font:800 var(--section)/1.25 var(--font-display);letter-spacing:-.015em;-webkit-font-smoothing:auto}
.detail-body{display:flex;flex-wrap:wrap;gap:20px 32px}
.detail-main{flex:2 1 380px;min-width:0;display:flex;flex-direction:column;gap:12px}
.intent{max-width:66ch;color:var(--record-note);white-space:pre-wrap;text-wrap:pretty}
.facts{flex:1 1 260px;min-width:0;display:grid;grid-template-columns:104px minmax(0,1fr);gap:7px 12px;align-content:start;font-size:.875rem}
.facts dt{color:var(--record-faint)}
.facts dd{font-weight:600}
.facts a{color:inherit;text-decoration-color:var(--record-edge)}
.facts .id{display:block}
.record-section{display:flex;flex-direction:column;gap:6px}
h4{font:700 var(--small)/1.4 var(--font-text);color:var(--record-note)}
.criteria{border:1px solid var(--line-strong);border-radius:12px;background:var(--record-sheet)}
.criteria li{padding:10px 14px;display:flex;align-items:flex-start;gap:12px}
.criteria li+li{border-top:1px solid var(--hairline)}
.criteria .id{flex-shrink:0;margin-top:2px;font-weight:600;color:var(--record-note)}
.reasons{padding-left:20px;list-style:disc}
.disclosures{display:flex;flex-direction:column}
.callout{padding:10px 14px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;background:var(--blocked-wash)}
.callout .icon{margin-top:3px;color:var(--blocked)}
summary{min-height:44px;padding:10px 0;cursor:pointer;font-weight:600;color:var(--ownership-action)}
.evidence{padding-left:20px;list-style:decimal;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
pre{max-width:100%;white-space:pre-wrap;font:400 var(--caption)/1.5 var(--font-mono)}
.people-content{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}
.people-list{display:flex;flex-wrap:wrap}
.people-list>li{flex:1 1 100%;min-width:0;padding:2px 0;border-bottom:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;gap:0 18px}
.person-name{flex:0 0 240px;min-width:0;min-height:44px;display:flex;align-items:center;font-size:var(--lead);font-weight:700}
.person-name.is-quiet{color:var(--record-note)}
.person-pick{padding:0;border:0;border-radius:6px;justify-content:flex-start;text-align:start;text-decoration:underline;text-decoration-color:var(--line-strong);text-decoration-thickness:1.5px;text-underline-offset:4px}
.person-pick:hover{background:transparent;text-decoration-color:currentColor}
.person-blocks{flex:0 0 200px;display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.pb{width:30px;height:14px;border-radius:4px;background:var(--state)}
.pb--hollow{border:3px solid var(--state);background:transparent}
.person-sum{flex:1 1 280px;min-width:0;padding:6px 0;color:var(--record-note)}
.limits{padding:22px 26px;border-radius:var(--radius-card);background:var(--work-paper);display:flex;flex-direction:column;gap:14px}
.limits h2{font:800 1.25rem/1.25 var(--font-display);letter-spacing:-.01em;-webkit-font-smoothing:auto}
.limits>p,.limits li{color:var(--record-note)}
.identity{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px 28px;font-size:.875rem}
.identity>div{min-width:0;display:flex;flex-direction:column;gap:1px}
.identity dt{color:var(--record-faint)}
.identity dd{font:400 .78125rem/1.5 var(--font-mono)}
.footer{padding-top:20px;border-top:1px solid var(--line-strong);font-size:.84375rem;line-height:1.55;color:var(--record-faint)}
.footer p{max-width:90ch}
@media (max-width:999px){.table-head,.row-line{grid-template-columns:minmax(0,1fr) 104px 128px 112px 116px;gap:12px}}
@media (max-width:860px){:root{--masthead:2.75rem}
.page{padding:28px 20px 40px;gap:32px}
.table-head{display:none}
.row-line{display:flex;flex-wrap:wrap;gap:8px 16px;padding:12px 14px}
.cell--work{flex:1 0 100%}
.work-row>.record-detail{padding:4px 14px 18px}
.queue .tag{flex:0 1 auto}
.queue-who{flex:1 1 auto;order:1;text-align:end}
.queue-text{flex:1 1 100%;order:2}}
@media (max-width:560px){:root{--masthead:2.125rem;--hero:3.5rem;--title:1.375rem;--headline:1.5rem;--display:1.625rem}
.page{padding:20px 16px 32px;gap:28px}
.card,.limits{padding:18px 16px}
.record-details>.record-detail{padding:16px}
.hero-rate{align-items:flex-start}
.filters{display:grid;grid-template-columns:minmax(0,1fr)}
.section-head .aside{justify-content:flex-start}
.line{grid-template-columns:minmax(0,1fr);gap:2px}
.line::before{content:none}
.line>li{padding:0 4px;display:grid;grid-template-columns:40px 44px minmax(0,1fr);align-items:center;column-gap:4px;text-align:start}
.line>li:not(:last-child)::before{content:"";position:absolute;left:67px;top:22px;width:6px;height:calc(100% + 2px);border-radius:3px;background:var(--line-strong)}
.dot-zone{position:relative}
.count{justify-self:end;line-height:44px}
.dot-zone{justify-content:center}
.station-kinds,.siding{grid-column:3;padding:0}
.siding{margin:0 0 6px}
.blocks--ghost{grid-template-columns:repeat(4,minmax(0,1fr))}
.blocks--ghost .block:nth-child(n+5){display:none}
.person-name{flex:1 1 100%}
.person-blocks{flex:0 1 auto}
.person-sum{flex:1 1 100%;padding-top:0}
.facts{grid-template-columns:minmax(0,1fr);gap:1px}
.facts dd{padding-bottom:8px}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
@page{margin:14mm}
@media print{:root{color-scheme:light;--work-paper:#FFFFFF;--record-sheet:#FFFFFF;--tray:#EEF1F4;--record-ink:#122230;--record-note:#3D5164;--record-faint:#586C7F;--record-edge:#6F8394;--hairline:#B9C4CE;--line-strong:#8FA0AF;--ownership-action:#1B5FC4;--action-wash:#FFFFFF;--on-action:#FFFFFF;--proof-current:#0A775F;--proof-stale:#855600;--stale-wash:#FFFFFF;--stale-fill:#E5A41B;--blocked:#B3470B;--blocked-wash:#FFFFFF;--verifying:#6341BF;--verifying-wash:#FFFFFF;--masthead:2.5rem;--hero:3.25rem;--display:2rem;--title:1.375rem;--headline:1.5rem}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:none;padding:0;gap:20px}
.skip,.filters,.actions,.enhancement-only,.detail-foot{display:none!important}
html.enhanced .static-only{display:flex!important}
a{color:inherit;text-decoration:none}
.masthead{gap:14px}
.blocks{grid-template-columns:repeat(auto-fit,minmax(30px,1fr));gap:6px}
.card{padding:16px 18px;gap:12px}
.block{height:40px}
.card,.queue>li,.work-row,.record-detail,.people-list>li,.limits,.notice{break-inside:avoid}
.section-head,.card-head,.table-head{break-after:avoid}
.work-row[hidden]{display:block!important}
.record-detail[hidden]{display:flex!important}
.work-row>.record-detail{padding:4px 12px 14px;border-top:1px dashed var(--hairline)}
#filter-empty,#selected-outside,#interaction-error{display:none!important}
.limits{border:1px solid var(--line-strong)}
.notice,.callout{border:1px solid var(--line-strong)}
summary{min-height:0;padding:0;color:inherit;list-style:none}
details>*{display:block!important}
details>.evidence{display:grid!important}
pre{font-size:.625rem}
details::details-content{content-visibility:visible;display:block}}
@media print and (min-width:600px){.source-facts{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 18px}
.split{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:14px}
.hero{flex-wrap:nowrap}
.queue .tag{flex:0 0 200px;order:0}
.queue-text{flex:1 1 240px;order:0}
.queue-who{flex:0 0 110px;order:0;text-align:start}
.table-head{display:grid}
.table-head,.row-line{grid-template-columns:minmax(0,1fr) 96px 112px 104px 108px;gap:10px;padding:8px 12px}
.row-line{display:grid}
.evidence{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

// Static executable text: its CSP hash never changes with snapshot or manifest data.
function enhanceReport() {
    'use strict';
    const documentRoot = document.documentElement;
    const search = document.getElementById('work-search');
    const owner = document.getElementById('work-owner');
    const state = document.getElementById('work-state');
    const remaining = document.getElementById('work-remaining');
    const countLabel = document.getElementById('work-count');
    const empty = document.getElementById('filter-empty');
    const heading = document.getElementById('work-heading');
    const home = document.querySelector('.record-details');
    const rows = Array.from(document.querySelectorAll('.work-row'));
    const details = Array.from(document.querySelectorAll('.record-detail'));
    const selectedOutside = document.getElementById('selected-outside');
    let selected = null;
    let restoring = false;
    const snapshot = JSON.parse(document.getElementById('task-track-data').textContent);
    const groups = Array.isArray(snapshot.hierarchy?.groups) ? snapshot.hierarchy.groups : [];
    const groupPanels = Array.from(document.querySelectorAll('[data-group-context]'));
    const pathPanels = Array.from(document.querySelectorAll('[aria-label^="Exact linked concerns for "]'));
    const inspected = document.getElementById('inspected-group-path');
    let chosenPath = location.hash ? [] : snapshot.scope?.kind === 'group' ? [snapshot.scope.itemId] : [];
    let inspection = null;
    let pathUnavailable = false;
    const contexts = [];
    function validPath(path) {
        return Array.isArray(path) && path.length <= 64 && new Set(path).size === path.length && path.every((id, index) =>
            groups.some(group => group.id === id && (!index || groups.find(parent => parent.id === path[index - 1])?.directGroupIds?.includes(id))));
    }
    function groupName(id) {
        const item = snapshot.items.find(record => record.id === id);
        const label = item?.groupRole ? snapshot.hierarchy?.labels?.[item.groupRole] || item.groupRole : 'Generic group';
        return item ? label + ' ' + id + ': ' + item.title : 'Unavailable group ' + id;
    }
    function currentContext() {
        return { path: [...chosenPath], selected, inspection, search: search.value, owner: owner.value, state: state.value, remaining: remaining.checked };
    }
    function rememberContext() { if (contexts.length === 64) contexts.shift(); contexts.push(currentContext()); }
    function showInspection(focus) {
        const last = chosenPath.at(-1), parent = chosenPath.at(-2);
        const panel = inspection ? document.getElementById(inspection) : groupPanels.find(node => {
            const path = JSON.parse(node.dataset.groupContext);
            return path.at(-1) === last && (parent ? path.length === 2 && path[0] === parent : path.length === 1);
        });
        groupPanels.concat(pathPanels).forEach(node => { node.hidden = node !== panel; });
        inspected.textContent = (pathUnavailable ? 'Path unavailable. No removed or guessed parent is used. ' : '') + 'Inspected group/path: ' + (chosenPath.length ? chosenPath.map(groupName).join(' / ') : 'Direct record or project entry')
            + (selected ? ' / ' + (details.find(node => node.dataset.itemKey === selected)?.dataset.itemId || '') : '')
            + (inspection?.startsWith('inspect-path-') ? ' / Exact path selection' : '');
        if (focus && panel) { panel.scrollIntoView({ block: 'start' }); panel.querySelector('h3')?.focus({ preventScroll: true }); }
        return !!(focus && panel);
    }
    function backContext(event) {
        if (!contexts.length) return false;
        event?.preventDefault();
        const previous = contexts.pop();
        pathUnavailable = !validPath(previous.path); chosenPath = pathUnavailable ? [] : previous.path;
        inspection = previous.inspection; selected = previous.selected;
        search.value = previous.search; owner.value = previous.owner; state.value = previous.state; remaining.checked = previous.remaining;
        filter();
        // Going back always lands somewhere: the restored record, the restored inspection, or the Work heading when neither was open.
        const inspecting = showInspection(true);
        if (selected) reveal(true); else if (!inspecting) heading.focus();
        return true;
    }
    function remember() {
        if (restoring) return;
        const parameters = new URLSearchParams();
        if (selected) parameters.set('item', selected);
        if (chosenPath.length) parameters.set('path', JSON.stringify(chosenPath));
        if (inspection) parameters.set('inspection', inspection);
        if (search.value) parameters.set('search', search.value);
        if (owner.value) parameters.set('owner', owner.value);
        if (state.value) parameters.set('state', state.value);
        if (remaining.checked) parameters.set('remaining', '1');
        try { history.replaceState(null, '', '#' + parameters.toString()); } catch (_) { /* File origins may restrict history; in-page state remains usable. */ }
    }
    // Every record card lives in the list under the table, in snapshot order. Only the selected one leaves it, to open under its own row.
    function sendHome(detail) {
        if (detail.parentNode === home) return;
        home.insertBefore(detail, details.slice(details.indexOf(detail) + 1).find(later => later.parentNode === home) || null);
    }
    function reveal(scroll) {
        const detail = details.find(candidate => candidate.dataset.itemKey === selected);
        if (!detail) return;
        if (scroll) (detail.closest('.work-row') || detail).scrollIntoView({ block: 'start' });
        detail.querySelector('h3').focus({ preventScroll: true });
    }
    function select(id, focus) {
        selected = details.some(detail => detail.dataset.itemKey === id) ? id : null;
        const selectedRow = rows.find(row => row.dataset.itemKey === selected);
        const shownRow = selectedRow && !selectedRow.hidden ? selectedRow : null;
        details.forEach(detail => {
            const open = detail.dataset.itemKey === selected;
            detail.hidden = !open;
            if (open && shownRow) { if (detail.parentNode !== shownRow) shownRow.appendChild(detail); } else sendHome(detail);
        });
        rows.forEach(row => {
            const open = row.dataset.itemKey === selected;
            row.classList.toggle('is-open', open);
            row.querySelector('a').setAttribute('aria-expanded', String(open));
        });
        document.getElementById('detail-empty').hidden = selected !== null || rows.length === 0;
        selectedOutside.hidden = !selected || shownRow !== null;
        selectedOutside.textContent = selectedRow ? 'Selected item is outside the current filters. Clear filters to see its work row.'
            : 'Selected item is outside the fixed delivery list. Its record remains available for inspection; delivery membership is unchanged.';
        if (focus) reveal(false);
        showInspection(false); remember();
    }
    function filter() {
        const term = search.value.toLocaleLowerCase();
        let visible = 0;
        rows.forEach(row => {
            row.hidden = (term && !row.dataset.search.toLocaleLowerCase().includes(term))
                || (owner.value && row.dataset.owner !== owner.value)
                || (state.value && row.dataset.state !== state.value)
                || (remaining.checked && !['task', 'story', 'subtask'].includes(row.dataset.kind))
                || (remaining.checked && (row.dataset.accepted === 'true' || row.dataset.retired === 'true' || row.dataset.state === 'canceled'));
            if (!row.hidden) visible++;
        });
        announce(visible);
        empty.hidden = visible !== 0 || rows.length === 0;
        select(selected, false);
    }
    function announce(visible) {
        countLabel.textContent = visible + ' of ' + rows.length + ' inspected records shown' + (countLabel.dataset.coverage === 'complete' ? '' : '; project total unknown');
    }
    function restore() {
        restoring = true;
        const fragment = location.hash.slice(1);
        const parameters = new URLSearchParams(fragment);
        const nativeTarget = document.getElementById(fragment);
        if (nativeTarget?.dataset.groupContext) {
            const path = JSON.parse(nativeTarget.dataset.groupContext);
            if (validPath(path)) { chosenPath = path; inspection = null; pathUnavailable = false; }
            else { chosenPath = []; pathUnavailable = true; }
            restoring = false; showInspection(true); return;
        }
        if (nativeTarget && pathPanels.includes(nativeTarget)) {
            inspection = nativeTarget.id; restoring = false; showInspection(true); return;
        }
        if (parameters.has('path')) {
            try { const path = JSON.parse(parameters.get('path')); pathUnavailable = !validPath(path); chosenPath = pathUnavailable ? [] : path; }
            catch (_) { chosenPath = []; pathUnavailable = true; }
        }
        if (parameters.has('inspection')) inspection = groupPanels.concat(pathPanels).find(node => node.id === parameters.get('inspection'))?.id || null;
        search.value = parameters.get('search') || '';
        owner.value = parameters.get('owner') || '';
        state.value = parameters.get('state') || '';
        remaining.checked = parameters.get('remaining') === '1';
        let id = parameters.get('item');
        const linked = fragment.startsWith('record-');
        if (linked) {
            try { id = decodeURIComponent(fragment.slice(7)); } catch (_) { id = null; }
        }
        selected = id || null;
        filter();
        restoring = false;
        // A record link elsewhere on the page lands on that record, not on wherever the page happened to be.
        if (linked) reveal(true);
    }
    try {
        [search, owner, state, remaining].forEach(control => control.addEventListener('input', filter));
        document.getElementById('clear-filters').addEventListener('click', () => {
            search.value = ''; owner.value = ''; state.value = ''; remaining.checked = false; filter(); search.focus();
        });
        document.getElementById('inspect-remaining')?.addEventListener('click', () => {
            remaining.checked = true; filter(); heading.focus();
        });
        document.getElementById('print-report')?.addEventListener('click', () => window.print());
        rows.forEach(row => row.querySelector('a').addEventListener('click', event => {
            event.preventDefault();
            rememberContext();
            if (row.dataset.itemKey === selected) select(null, false); else select(row.dataset.itemKey, true);
        }));
        document.querySelectorAll('[data-owner-filter]').forEach(button => button.addEventListener('click', () => {
            owner.value = button.dataset.ownerFilter; filter(); heading.focus();
        }));
        document.querySelectorAll('.return-link, [data-inspection-back]').forEach(link => link.addEventListener('click', event => {
            if (!backContext(event) && link.classList.contains('return-link')) { event.preventDefault(); heading.focus(); }
        }));
        document.querySelectorAll('[data-inspect-group]').forEach(link => link.addEventListener('click', event => {
            event.preventDefault();
            const from = link.dataset.fromGroup, id = link.dataset.inspectGroup;
            const path = link.dataset.alternateAffiliation ? [from, id] : from && chosenPath.at(-1) === from ? chosenPath.concat(id) : from ? [from, id] : [id];
            if (!validPath(path)) { inspected.textContent = 'Path unavailable. No removed or guessed parent is used.'; return; }
            rememberContext(); chosenPath = path; pathUnavailable = false; inspection = null; select(null, false); showInspection(true); remember();
        }));
        document.querySelectorAll('a[href^="#record-"]').forEach(link => {
            if (link.closest('.work-row')) return;
            link.addEventListener('click', event => {
                event.preventDefault(); rememberContext();
                try { select(decodeURIComponent(link.getAttribute('href').slice(8)), true); reveal(true); }
                catch (_) { inspected.textContent = 'Linked record unavailable. No identity was inferred.'; }
            });
        });
        document.querySelectorAll('a[href^="#inspect-path-"]').forEach(link => link.addEventListener('click', event => {
            const panel = document.getElementById(link.getAttribute('href').slice(1));
            if (!panel || !pathPanels.includes(panel)) return;
            event.preventDefault(); rememberContext(); inspection = panel.id; showInspection(true); remember();
        }));
        window.addEventListener('hashchange', restore);
        // Paper gets every row whatever the filters say, then every record card in order, with every disclosure open.
        window.addEventListener('beforeprint', () => {
            details.forEach(sendHome);
            groupPanels.concat(pathPanels).forEach(panel => { panel.hidden = false; });
            announce(rows.length);
            document.querySelectorAll('details').forEach(element => { element.dataset.printOpen = element.open ? 'true' : 'false'; element.open = true; });
        });
        window.addEventListener('afterprint', () => {
            document.querySelectorAll('details').forEach(element => { element.open = element.dataset.printOpen === 'true'; delete element.dataset.printOpen; });
            filter();
        });
        documentRoot.classList.add('enhanced');
        restore();
    } catch (_) {
        documentRoot.classList.remove('enhanced');
        rows.forEach(row => { row.hidden = false; row.classList.remove('is-open'); });
        details.forEach(detail => { detail.hidden = false; sendHome(detail); });
        groupPanels.concat(pathPanels).forEach(panel => { panel.hidden = false; });
        document.getElementById('interaction-error').hidden = false;
    }
}
const SCRIPT = `(${enhanceReport.toString()})();`;
function cspHash(content) { return `'sha256-${crypto.createHash('sha256').update(content).digest('base64')}'`; }
// The only inline script and stylesheet a report carries. A page that shows a report inside itself names these two and nothing else inline.
const REPORT_INLINE_SOURCES = Object.freeze({ script: cspHash(SCRIPT), style: cspHash(STYLES) });

function factRow(label, value, sub) {
    return `<dt>${escapeHtml(label)}</dt><dd>${value}${sub ? `<span class="fact-sub">${sub}</span>` : ''}</dd>`;
}

// A linked record is named by its title when this snapshot holds exactly one record with that identity.
function linkedRecord(id, byId) {
    const target = byId.get(id);
    return target ? `<a href="#${escapeHtml(recordAnchor(target))}">${escapeHtml(target.title)}</a> <span class="id">${escapeHtml(id)}</span>`
        : `<span class="mono">${escapeHtml(id)}</span><span class="fact-sub">Not a unique record in this snapshot</span>`;
}

function renderFacts(item, members, byId, snapshot) {
    const history = array(item.history);
    const entered = [...history].reverse().find(entry => entry.afterState === item.state && entry.beforeState !== entry.afterState) || history.find(entry => entry.operation === 'create' && entry.afterState === item.state);
    const proofs = array(item.proofs).filter(proof => proof && typeof proof === 'object');
    const latest = proofs.reduce((newest, proof) => !newest || String(proof.observedAt || '') > String(newest.observedAt || '') ? proof : newest, null);
    const decision = item.acceptance?.accepted === true ? array(item.acceptanceHistory).at(-1) : null;
    const attested = item.health?.status === 'attested';
    const relations = new Map();
    for (const link of array(item.links)) {
        if (!link || typeof link !== 'object') continue;
        const name = LINK_NAMES[link.relation] || capital(words(link.relation));
        relations.set(name, [...(relations.get(name) || []), link.itemId ? linkedRecord(link.itemId, byId) : (link.path ? linkedPath(link.path) : '<span class="mono">Unknown</span>')]);
    }
    return `<dl class="facts">${[
        entered?.at ? factRow('Since', escapeHtml(`${stateName(item.state)} since ${day(entered.at)}`)) : '',
        factRow('Responsible', escapeHtml(`${memberLabel(item.assigneeId, members)}${item.assigneeId ? ` (${item.assigneeId})` : ''}`)),
        factRow('Collaborators', escapeHtml(array(item.collaboratorIds).map(id => memberLabel(id, members)).join(', ') || 'None recorded')),
        factRow('Proof', escapeHtml(verificationLabel(item)), [item.verification?.reason, latest ? `Latest proof: ${words(latest.kind)}, ${words(latest.result)}, ${instant(latest.observedAt)}` : null].filter(Boolean).map(escapeHtml).join('. ')),
        factRow('Acceptance', escapeHtml(acceptanceLabel(item)), [item.acceptance?.reason, decision?.acceptedAt ? `${decision.actor ? memberLabel(decision.actor, members) : 'An unrecorded actor'}, ${instant(decision.acceptedAt)}` : null].filter(Boolean).map(escapeHtml).join('. ')),
        ...[...relations].map(([name, targets]) => factRow(name, targets.join('<br>'))),
        GROUP_KINDS.includes(item.kind) ? factRow('Group purpose', escapeHtml(`${groupLabel(item, snapshot)}${item.groupRole ? ` (${item.groupRole})` : ''}`)) : '',
        array(item.memberItemIds).length ? factRow('Group members', item.memberItemIds.map(id => linkedRecord(id, byId)).join('<br>')) : '',
        factRow('Owning file', `<span class="mono">${escapeHtml(item.ownerPath || 'Unknown')}</span>`),
        factRow('Revision', `<span class="mono">${escapeHtml(item.revision ?? 'Unknown')}</span>`),
        factRow('Record health', escapeHtml(attested ? item.health.assessment : 'Not attested'), escapeHtml(attested
            ? `${item.health.displayName || item.health.ownerId} (${item.health.ownerId}), observed ${instant(item.health.observedAt)}. ${item.health.reason}`
            : item.health?.reason || 'No dated owner attestation available'))
    ].join('')}</dl>`;
}

// One card per record. With scripts it opens under its row in the table; without them, on paper, or when filters
// hide the row, it stands in the list under the table with its own heading.
function renderDetail(item, members, byId, snapshot) {
    const anchor = escapeHtml(recordAnchor(item));
    const reasons = array(item.prerequisiteReasons);
    const blocker = typeof item.blocker === 'string' ? { reason: item.blocker } : item.blocker;
    const retained = [['Proof', item.proofs], ['Acceptance history', item.acceptanceHistory], ['Recorded activity', item.activity], ['Change history', item.history]];
    const absent = [['links', item.links], ['group members', item.memberItemIds], ...retained.map(([label, values]) => [label.toLowerCase(), values])]
        .filter(([, values]) => !array(values).length).map(([label]) => label);
    const disclosures = retained.filter(([, values]) => array(values).length).map(([label, values]) => jsonDetails(label, values)).join('');
    return `<article class="record-detail" id="${anchor}" data-item-id="${escapeHtml(item.id)}" data-item-key="${escapeHtml(recordKey(item))}" aria-labelledby="${anchor}-heading">
<header class="detail-head"><p class="badge">${kindMark(item)}<span class="id">${escapeHtml(item.id)}</span>${flags(item)}</p><h3 id="${anchor}-heading" tabindex="-1">${escapeHtml(item.title)}</h3><p class="marks">${stateMark(item)}<span class="mark${item.assigneeId ? '' : ' is-none'}">${escapeHtml(memberLabel(item.assigneeId, members))}</span>${proofMark(item)}${sealMark(item)}</p></header>
<div class="detail-body"><div class="detail-main"><p class="intent">${escapeHtml(item.intent || 'No outcome recorded. Inspect the owning artifact before starting work.')}</p>
${blocker ? `<p class="callout">${icon('alert')}<span><strong>${item.state === 'blocked' ? 'Blocked.' : 'Recorded blocker.'}</strong> ${escapeHtml(blocker.reason || 'No blocker reason is recorded.')}${blocker.at ? ` <span class="fact-sub">Blocked since ${escapeHtml(day(blocker.at))}${blocker.resumeState ? `; resumes to ${escapeHtml(stateName(blocker.resumeState))}` : ''}.</span>` : ''}</span></p>` : ''}
<section class="record-section"><h4>Acceptance criteria</h4>${array(item.criteria).length ? `<ul class="criteria">${item.criteria.map(criterion => `<li><span class="id">${escapeHtml(criterion.id)}</span><span>${escapeHtml(criterion.text)}</span></li>`).join('')}</ul>` : '<p class="note">No acceptance criteria recorded.</p>'}</section>
${reasons.length ? `<section class="record-section"><h4>Readiness limits</h4><ul class="reasons">${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></section>` : ''}
${disclosures ? `<div class="disclosures">${disclosures}</div>` : ''}
${absent.length ? `<p class="note">Not retained in this snapshot: ${escapeHtml(absent.join(', '))}.</p>` : ''}
${item.legacy || item.optOut ? `<p class="note">${item.legacy ? 'Legacy record; tracked metadata has not been adopted. ' : ''}${item.optOut ? 'Automatic tracking is opted out.' : ''}</p>` : ''}</div>
${renderFacts(item, members, byId, snapshot)}</div>
<p class="detail-foot"><a class="control return-link" href="#work">Back to Work</a></p></article>`;
}

// One block per eligible task. The counted sentence stays authoritative: nothing is drawn unless the blocks agree with it.
function deliveryBlocks(snapshot, metrics) {
    if (!metrics.total || metrics.total > BLOCK_LIMIT) return '';
    const byId = new Map();
    for (const item of array(snapshot.items)) byId.set(item.id, byId.has(item.id) ? null : item);
    const eligible = array(metrics.eligibleIds).map(id => byId.get(id)).filter(Boolean);
    const groups = { verified: [], accepted: [], awaiting: [], open: [] };
    for (const item of eligible) {
        const proved = item.verification?.status === 'current';
        groups[item.acceptance?.accepted === true ? (proved ? 'verified' : 'accepted') : item.state === 'verifying' && proved ? 'awaiting' : 'open'].push(item);
    }
    if (eligible.length !== metrics.total || groups.verified.length !== metrics.currentlyVerified
        || groups.verified.length + groups.accepted.length !== metrics.accepted) return '';
    const names = { verified: 'accepted with current proof', accepted: 'accepted, proof not current', awaiting: 'proved, waiting for acceptance', open: 'not accepted yet' };
    const marks = { verified: 'check', accepted: 'clock', awaiting: 'seal' };
    const present = Object.keys(names).filter(name => groups[name].length);
    const labelled = metrics.total <= LABELLED_BLOCKS;
    const density = metrics.total > DENSE_BLOCKS ? ' blocks--dense' : metrics.total <= FEW_BLOCKS ? ' blocks--few' : '';
    return `<div class="blocks${density}" role="img" aria-label="${escapeHtml(`${metrics.total} tasks, one block each: ${present.map(name => `${groups[name].length} ${names[name]}`).join('; ')}`)}">${present.map(name => groups[name].map(item => `<span class="block-cell" title="${escapeHtml(`${item.id}: ${item.title}`)}"><span class="block block--${name}">${marks[name] ? icon(marks[name]) : ''}</span>${labelled ? `<span class="block-id">${escapeHtml(idTail(item.id))}</span>` : ''}</span>`).join('')).join('')}</div><ul class="legend">${present.map(name => `<li><span class="block block--${name}" aria-hidden="true"></span><span><strong>${groups[name].length}</strong> ${names[name]}</span></li>`).join('')}</ul>`;
}

function renderSummary(snapshot) {
    const metrics = snapshot.metrics;
    const complete = snapshot.coverage === 'complete' && metrics?.coverage === 'complete';
    const total = count(metrics?.total), accepted = count(metrics?.accepted), remaining = count(metrics?.remaining), verified = count(metrics?.currentlyVerified);
    const valid = total !== null && accepted !== null && remaining !== null && verified !== null && accepted <= total && verified <= accepted && remaining === total - accepted;
    // The heading names the fact; the scope it was counted for stands beside it and never changes with the filters.
    const heading = `<div class="eyebrow-line"><h2 id="progress-heading" class="eyebrow">Delivery scope</h2><span class="scope-id">${escapeHtml(scopeName(snapshot) || 'Whole project')}</span></div>`;
    if (!metrics || !valid) return `<section class="summary card" aria-labelledby="progress-heading"><div class="hero-lead">${heading}<p class="hero-title">Progress unavailable</p></div><p class="hero-copy">No trustworthy delivery denominator is available. Read the inspection limits below; this does not mean the project has no work.</p></section>`;
    const percentage = complete && total > 0 && typeof metrics.percentage === 'number' && Number.isFinite(metrics.percentage) && Math.abs(metrics.percentage - accepted / total * 100) < 0.000001;
    const ledger = `<p class="ledger">${accepted} of ${plural(total, 'eligible task', 'eligible tasks')} accepted, ${verified} with current proof; ${remaining} not accepted.</p>`;
    let body;
    if (percentage) {
        const blocks = deliveryBlocks(snapshot, metrics);
        body = `<div class="hero"><div class="hero-lead">${heading}<p class="hero-count"><span class="hero-figure">${accepted}</span> <span class="hero-unit">of ${plural(total, 'task', 'tasks')} accepted</span></p></div><p class="hero-rate"><strong>${metrics.percentage.toFixed(1)}%</strong> <span>accepted in this exact scope</span></p></div>${blocks || ledger}`;
    } else if (total === 0 && complete) {
        body = `<div class="hero-lead">${heading}<p class="hero-title">No delivery scope yet</p></div><p class="hero-copy">Delivery counts tasks, one block each. No eligible tasks in this delivery scope; no percentage applies. That is not the same as zero percent.</p><div class="blocks blocks--ghost" aria-hidden="true">${'<span class="block block--ghost"></span>'.repeat(GHOST_BLOCKS)}</div>`;
    } else {
        body = `<div class="hero-lead">${heading}<p class="hero-title">Delivery unknown</p></div><p class="hero-copy">No delivery blocks are drawn. Percentage withheld because scope or coverage is incomplete. The counts cover inspected work only.</p>${ledger}`;
    }
    const caption = `Each task counts once. Excluded: ${count(metrics.canceled) ?? 'unknown'} canceled, ${count(metrics.retired) ?? 'unknown'} retired. Initiatives, stories and subtasks sit outside this count. An acceptance made in the past does not show that proof still applies today.`;
    return `<section class="summary card" aria-labelledby="progress-heading">${body}<div class="card-foot"><p class="caption">${caption}</p><div class="actions enhancement-only"${array(snapshot.items).length ? '' : ' hidden'}><button type="button" id="inspect-remaining" class="primary">Inspect remaining work</button></div></div></section>`;
}

function renderHealth(health, group) {
    const note = 'A dated assessment by the owner of this exact scope; a child record cannot stand in for it. Activity and percentages never set it.';
    if (health?.status === 'attested') {
        return `<section class="health card" aria-labelledby="health-heading"><h2 id="health-heading" class="eyebrow">${group ? 'Group' : 'Project'} health, owner-attested</h2><p class="health-headline">${escapeHtml(health.assessment)}</p><p class="health-reason">${escapeHtml(health.reason)}</p><dl class="health-facts"><dt>Attested by</dt><dd>${escapeHtml(health.displayName || health.ownerId)} (${escapeHtml(health.ownerId)})</dd><dt>Observed</dt><dd>${escapeHtml(instant(health.observedAt))}</dd><dt>Health owner</dt><dd><span class="mono">${escapeHtml(health.itemId)}</span></dd></dl><p class="health-note">${note}</p></section>`;
    }
    return `<section class="health health--unknown card" aria-labelledby="health-heading"><h2 id="health-heading" class="eyebrow">${group ? 'Group' : 'Project'} health</h2><p class="health-headline">Unknown</p><p class="health-reason">${escapeHtml(health?.reason || 'No dated owner attestation available')}</p><p class="health-note">${note}</p></section>`;
}

function renderStanding(items) {
    const open = items.filter(item => !item.retired);
    const inState = state => open.filter(item => item.state === state);
    const blocked = inState('blocked').length;
    const off = [[inState('canceled').length, 'canceled'], [items.length - open.length, 'retired'], [open.filter(item => !STATE_NAMES[item.state]).length, 'in another recorded state']]
        .filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
    return `<section class="standing card" aria-labelledby="standing-heading"><div class="card-head"><h2 id="standing-heading">Where work stands</h2><p class="aside">${plural(open.filter(onLine).length, 'open record', 'open records')} by recorded state.${off.length ? ` Off the line: ${off.join(', ')}.` : ''}</p></div><ol class="line">${STATIONS.map(state => {
        const records = inState(state);
        return `<li${records.length ? '' : ' class="station--none"'}><span class="count">${records.length}</span><span class="dot-zone">${dot(state)}</span><span class="station-name">${STATE_NAMES[state]}</span>${records.length ? `<span class="station-kinds">${escapeHtml(kindBreakdown(records))}</span>` : ''}${state === 'in_progress' && blocked ? `<span class="siding"><span class="siding-hook" aria-hidden="true"></span><span class="siding-tag">${blocked} blocked</span></span>` : ''}</li>`;
    }).join('')}</ol></section>`;
}

// Records the tracker will not move by itself: a decision, a blocker or an owner is missing.
function renderWaiting(snapshot, members) {
    const ready = new Set(array(snapshot.ready));
    const waiting = [];
    for (const item of array(snapshot.items)) {
        if (item.retired || item.state === 'canceled') continue;
        const proved = item.verification?.status === 'current';
        const accepted = item.acceptance?.accepted === true;
        const blocker = typeof item.blocker === 'string' ? { reason: item.blocker } : item.blocker;
        if (item.state === 'verifying' && proved && !accepted) waiting.push([item, 'verifying', 'seal', 'Proved, not accepted', 'Every criterion has current passing proof. Acceptance is a separate decision.']);
        else if (accepted && !proved) waiting.push([item, 'stale', 'clock', 'Accepted, proof not current', `${item.verification?.reason || 'Current proof is not established'}. The acceptance stands.`]);
        else if (item.state === 'blocked') waiting.push([item, 'blocked', 'alert', 'Blocked', `${blocker?.reason || 'No blocker reason is recorded'}.${blocker?.at ? ` Blocked since ${day(blocker.at)}.` : ''}`]);
        else if (item.state === 'ready' && !ready.has(item.id)) waiting.push([item, 'plain', 'alert', 'Ready, cannot start', array(item.prerequisiteReasons)[0] || 'Current prerequisites are unresolved.']);
        else if (item.state === 'ready' && !item.assigneeId) waiting.push([item, 'plain', 'person', 'Ready, unassigned', 'Nobody is responsible yet, so it cannot start.']);
    }
    if (!waiting.length) return '';
    return `<section class="waiting section" aria-labelledby="waiting-heading"><div class="section-head"><h2 id="waiting-heading">Waiting on a person</h2><p class="aside">${plural(waiting.length, 'record', 'records')} the tool will not move by itself</p></div><ul class="queue">${waiting.slice(0, WAITING_LIMIT).map(([item, tone, mark, name, why]) => `<li><span class="tag${tone === 'plain' ? '' : ` tag--${tone}`}">${icon(mark)}<span>${name}</span></span><span class="queue-text"><a class="queue-title" href="#${escapeHtml(recordAnchor(item))}">${escapeHtml(item.title)}</a><span class="queue-why">${escapeHtml(why)}</span></span><span class="queue-who${item.assigneeId ? '' : ' is-none'}">${escapeHtml(memberLabel(item.assigneeId, members))}</span></li>`).join('')}</ul>${waiting.length > WAITING_LIMIT ? `<p class="note">${waiting.length - WAITING_LIMIT} more waiting records are listed under Work.</p>` : ''}</section>`;
}

function renderRow(item, members) {
    return `<li class="work-row${item.state === 'canceled' ? ' work-row--off' : ''}" data-item-id="${escapeHtml(item.id)}" data-item-key="${escapeHtml(recordKey(item))}" data-search="${escapeHtml(`${item.id} ${item.title} ${item.intent || ''}`)}" data-owner="${escapeHtml(item.assigneeId || UNASSIGNED)}" data-state="${escapeHtml(item.state || 'unknown')}" data-kind="${escapeHtml(item.kind)}" data-accepted="${item.acceptance?.accepted === true}" data-retired="${!!item.retired}"><a class="row-line" href="#${escapeHtml(recordAnchor(item))}"><span class="cell cell--work"><span class="work-text"><span class="work-title"><span class="sr-only">${escapeHtml(item.id)}: </span>${escapeHtml(item.title)}</span><span class="id" aria-hidden="true">${escapeHtml(item.id)}</span>${flags(item)}</span>${kindMark(item)}</span><span class="cell">${stateMark(item)}</span><span class="cell cell--owner${item.assigneeId && item.state !== 'canceled' ? '' : ' is-none'}"><span class="sr-only">Responsible: </span>${escapeHtml(memberLabel(item.assigneeId, members))}</span><span class="cell">${proofMark(item)}</span><span class="cell">${sealMark(item)}</span></a></li>`;
}

// Who holds what, one block per open record. Sorted by name: it is a directory, not a ranking.
function renderPeople(items, owners) {
    const rows = owners.map(owner => {
        const held = items.filter(item => (item.assigneeId || UNASSIGNED) === owner.id);
        if (owner.id === UNASSIGNED && !held.length) return '';
        const open = held.filter(item => !item.retired && onLine(item));
        const ordered = PEOPLE_ORDER.flatMap(state => open.filter(item => item.state === state));
        const off = [[held.filter(item => !item.retired && item.state === 'canceled').length, 'canceled'], [held.filter(item => item.retired).length, 'retired'],
            [held.filter(item => !item.retired && !STATE_NAMES[item.state]).length, 'in another recorded state']].filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
        const summary = `${open.length ? `${plural(open.length, 'record', 'records')}: ${PEOPLE_ORDER.map(state => [open.filter(item => item.state === state).length, state]).filter(([total]) => total).map(([total, state]) => `${total} ${STATE_NAMES[state].toLowerCase()}`).join(', ')}` : 'No open records'}.${off.length ? ` Off the line: ${off.join(', ')}.` : ''}`;
        const quiet = owner.active === false || owner.id === UNASSIGNED || owner.unknown ? ' is-quiet' : '';
        const name = escapeHtml(owner.label);
        return `<li><span class="person-name static-only${quiet}">${name}</span><button type="button" class="person-name person-pick enhancement-only${quiet}" data-owner-filter="${escapeHtml(owner.id)}" aria-label="${name}: show records in Work">${name}</button><span class="person-blocks" aria-hidden="true">${ordered.slice(0, PERSON_BLOCKS).map(item => `<span class="pb is-${item.state}${['ready', 'draft'].includes(item.state) ? ' pb--hollow' : ''}"></span>`).join('')}${ordered.length > PERSON_BLOCKS ? `<span class="id">+${ordered.length - PERSON_BLOCKS}</span>` : ''}</span><span class="person-sum">${escapeHtml(summary)}</span></li>`;
    }).join('');
    return `<section class="people" aria-labelledby="people-heading"${items.length ? '' : ' hidden'}><div class="people-content"><div class="section-head"><h2 id="people-heading">Responsibility</h2><p class="aside">One block is one open record. Alphabetical, not a ranking</p></div><ul class="people-list">${rows}</ul><p class="note enhancement-only">Select a name to show that person's records in Work.</p></div></section>`;
}

function renderSource(snapshot, items, unavailable) {
    const complete = snapshot.coverage === 'complete';
    const tone = unavailable ? 'stop' : { complete: 'good', partial: 'warn' }[snapshot.coverage] || 'stop';
    const inspected = `${plural(items.length, 'record', 'records')} inspected`;
    const stored = storedVocabulary(snapshot);
    // The report is read-only either way; a checkout that stores the earlier words is told how to move on. A pinned ref is not.
    const migration = stored?.code === 'MIGRATION_REQUIRED' && snapshot.source?.kind !== 'shared'
        ? `<p class="notice">${icon('lock')}<span><strong>Migration required: this project is read-only.</strong> It stores the earlier vocabulary. Work is shown in the current words and every count is unchanged. Preview the migration with the task tool: <span class="mono">${escapeHtml(`${MIGRATE} --dry-run`)}</span>. Then run it without <span class="mono">--dry-run</span>.</span></p>` : '';
    const coverage = unavailable ? 'Unavailable; no trustworthy work count' : `${capital(words(snapshot.coverage))}, ${inspected}${complete ? '' : '; project total unknown'}`;
    const source = snapshot.source || {};
    return `<section class="source source-strip" aria-labelledby="source-heading"><h2 id="source-heading" class="sr-only">Snapshot source</h2><dl class="source-facts"><div><dt>As of</dt><dd><span class="mono">${escapeHtml(instant(snapshot.asOf))}</span></dd></div><div><dt>Source</dt><dd>${escapeHtml(source.label || 'Source unavailable')}${source.ref ? `<span class="fact-sub">${escapeHtml(source.ref)}${source.oid ? ` at ${escapeHtml(String(source.oid).slice(0, 12))}` : ''}</span>` : ''}</dd></div><div><dt>Coverage</dt><dd class="fact-line fact--${tone}">${icon(tone === 'good' ? 'check' : 'alert')}<span>${escapeHtml(coverage)}</span></dd></div><div><dt>Shared freshness</dt><dd>${escapeHtml(capital(words(source.remoteFreshness)))}. Regenerate to see later edits</dd></div></dl>${unreadableSource(snapshot)
        ? `<p class="notice notice--stop">${icon('alert')}<span><strong>No work can be read from this project.</strong> ${escapeHtml(stored.reason)}. No work is counted or listed.</span></p>`
        : unavailable
            ? `<p class="notice notice--stop">${icon('alert')}<span><strong>Inspection unavailable.</strong> Native sources are not converted into portable records. No trustworthy work count can be supplied for this profile.</span></p>`
            : complete ? '' : `<p class="notice">${icon('alert')}<span><strong>Inspection is incomplete.</strong> Read the limits below before treating this list as the whole project.</span></p>`}${migration}</section>`;
}

function renderLimits(snapshot, unavailable) {
    const diagnostics = array(snapshot.diagnostics), excluded = array(snapshot.excluded), ready = array(snapshot.ready);
    const profile = `${snapshot.profile?.identity || snapshot.profile?.kind || 'Unknown'}${snapshot.profile?.version === undefined ? '' : ` v${snapshot.profile.version}`}${unavailable ? ' / Unsupported inspection capability' : ''}`;
    const fact = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
    return `<section class="limits" aria-labelledby="limits-heading"><h2 id="limits-heading">Inspection limits and snapshot identity</h2>${diagnostics.length
        ? `<ul class="reasons">${diagnostics.map(diagnostic => `<li>${escapeHtml(diagnostic.itemId || '')}${diagnostic.itemId ? ': ' : ''}${diagnostic.path ? `<span class="mono">${escapeHtml(diagnostic.path)}</span>: ` : ''}${escapeHtml(diagnostic.code || 'Unknown')}: ${escapeHtml(diagnostic.reason || 'No explanation supplied')}</li>`).join('')}</ul>`
        : `<p>No inspection diagnostics were recorded for this snapshot${snapshot.coverage === 'complete' ? ', so the counts above cover the whole selected scope' : ''}.</p>`}<dl class="source identity">${fact('Fingerprint', snapshot.fingerprint || 'Unknown')}${fact('Profile', profile)}${fact('Checkout', snapshot.project?.root || 'Unknown')}${fact('Scope revision', snapshot.metrics?.scopeRevision || 'Unknown')}${fact('Proved ready to start', ready.join(', ') || 'None in this snapshot')}</dl>${excluded.length
        ? `<details><summary>Why other records are not ready to start (${excluded.length})</summary><ul class="reasons">${excluded.map(entry => `<li><span class="mono">${escapeHtml(entry?.itemId || 'Unknown')}</span>: ${escapeHtml(array(entry?.reasons).join('; ') || 'No reason supplied')}</li>`).join('')}</ul></details>`
        : '<p class="note">No selection exclusions recorded.</p>'}</section>`;
}

function renderReport(snapshot, manifest) {
    if (!snapshot || typeof snapshot !== 'object' || !manifest || typeof manifest !== 'object') throw new TypeError('Report needs a snapshot and ownership manifest');
    const items = array(snapshot.items), members = array(snapshot.members);
    const name = snapshot.project?.name || 'Selected project';
    const isGroup = snapshot.scope?.kind === 'group';
    const deliveryIds = new Set(array(snapshot.scope?.eligibleTaskIds));
    const byId = new Map();
    for (const item of items) byId.set(item.id, byId.has(item.id) ? null : item);
    const deliveryItems = isGroup ? items.filter(item => deliveryIds.has(item.id) && byId.get(item.id) === item) : items;
    const states = [...new Set(items.map(item => String(item.state || 'unknown')))].sort();
    const unknownOwners = [...new Set(items.map(item => item.assigneeId).filter(id => id && !members.some(member => member.id === id)))];
    const owners = [{ id: UNASSIGNED, displayName: 'Unassigned' }, ...members, ...unknownOwners.map(id => ({ id, displayName: `Unknown member (${id})` }))];
    const byName = (a, b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const directory = [...[...members].sort(byName).map(member => ({ ...member, label: memberLabel(member.id, members) })),
        ...unknownOwners.sort().map(id => ({ id, label: `Unknown member (${id})`, unknown: true })), { id: UNASSIGNED, label: 'Unassigned' }];
    const unavailable = snapshot.coverage === 'unavailable' || snapshot.profile?.available === false;
    const limited = unavailable || snapshot.coverage !== 'complete';
    const unreadable = unreadableSource(snapshot);
    const group = scopeName(snapshot);
    const standfirst = unreadable ? 'This project cannot be read. No work is counted or listed.'
        : unavailable ? 'Inspection unavailable. No work could be read for this profile.'
        : limited ? 'Partly inspected. Only the records that could be read are shown.'
            // A group snapshot counts delivery for that group only, while the lists below still hold every inspected record.
            : group ? `Delivery counted for ${group}. The primary list contains exactly its eligible tasks; other records remain available through inspection links.`
                : 'Whole project. What was accepted, what is proved, and what waits on a person.';
    const policy = `default-src 'none'; script-src ${REPORT_INLINE_SOURCES.script}; style-src ${REPORT_INLINE_SOURCES.style}; base-uri 'none'; form-action 'none'; object-src 'none'; connect-src 'none'`;
    return `<!doctype html>
<!-- task-track-generated:v1 -->
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(name)}: work snapshot</title><style>${STYLES}</style></head>
<body><a class="skip" href="#work">Skip to Work</a><main class="page"><header class="masthead"><div class="masthead-row"><div class="masthead-title"><p class="kicker">${icon('lock')}<span>Work snapshot, read-only</span></p><h1>${escapeHtml(name)}</h1><p class="standfirst">${escapeHtml(standfirst)}</p></div><div class="actions enhancement-only"><button type="button" id="print-report">${icon('print')}Print snapshot</button></div></div><div class="rule" aria-hidden="true"></div>
${renderSource(snapshot, items, unavailable)}</header>
<div class="split">${renderSummary(snapshot)}${renderHealth(snapshot.health, group)}</div>
${deliveryItems.length ? renderStanding(deliveryItems) : ''}${renderWaiting(isGroup ? { ...snapshot, items: deliveryItems } : snapshot, members)}
<section id="work" class="work-region section" aria-labelledby="work-heading"><div class="section-head"><h2 id="work-heading" tabindex="-1">Work</h2><div class="aside"><p id="work-count" role="status" aria-live="polite" data-coverage="${escapeHtml(snapshot.coverage || 'unknown')}">${deliveryItems.length} ${isGroup ? 'eligible delivery tasks' : 'inspected records'}${limited ? '; project total unknown' : ''}</p>${items.length ? '<p class="enhancement-only">Filters never change the delivery count above</p>' : ''}</div></div>
<div class="filters enhancement-only"${items.length ? '' : ' hidden'}><label class="field field--search">Search work<input id="work-search" type="search" maxlength="2000" autocomplete="off" placeholder="Title, identity or outcome"></label><label class="field">Responsible person<select id="work-owner"><option value="">All people</option>${owners.map(member => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.displayName)}${member.active === false ? ' (inactive)' : ''}</option>`).join('')}</select></label><label class="field">Recorded state<select id="work-state"><option value="">All states</option>${states.map(state => `<option value="${escapeHtml(state)}">${escapeHtml(capital(stateName(state)))}</option>`).join('')}</select></label><label class="check"><input id="work-remaining" type="checkbox"><span>Remaining work</span></label><button type="button" id="clear-filters">Clear filters</button></div>
<p id="interaction-error" class="hint" hidden>Filtering could not start. All inspected records remain available below. Reopen this report to retry.</p>
${deliveryItems.length ? `<div class="table"><div class="table-head" aria-hidden="true"><span>Work</span><span>State</span><span>Responsible</span><span>Proof</span><span>Acceptance</span></div><ul class="work-list" aria-label="${isGroup ? 'Eligible delivery tasks' : 'Work list'}">${deliveryItems.map(item => renderRow(item, members)).join('')}</ul></div>`
        : `<div class="empty"><p class="empty-heading">${limited ? 'Work inspection is limited' : isGroup ? 'No eligible delivery tasks' : 'No tracked work yet'}</p><p>${limited ? 'Work could not be fully inspected. Check the limits below and regenerate; zero inspected records is not proof of an empty project.' : isGroup ? 'This fixed group scope has no eligible delivery tasks. Inspect excluded, supporting or outside records separately; no percentage applies.' : 'No work records were found in the selected snapshot. Capture an initiative or task through the project tool or assistant, then regenerate this report.'}</p></div>`}<p id="filter-empty" class="hint" hidden>No records match these filters. Clear filters to inspect all records in this snapshot.</p>
<div class="record-details" aria-label="Inspected records, separate from fixed delivery scope"${items.length ? '' : ' hidden'}><p id="detail-empty" class="note enhancement-only">Select a row to open its outcome, criteria and proof.</p><p id="selected-outside" class="hint" hidden>Selected item is outside the current filters. Clear filters to see its work row.</p>${items.map(item => renderDetail(item, members, byId, snapshot)).join('')}</div>
${renderHierarchy(snapshot, byId)}${renderPathConcerns(snapshot, byId)}
${items.length ? `<p class="note"><span class="enhancement-only">${isGroup ? 'Remaining work in this primary list means unaccepted eligible tasks. ' : 'Remaining work means unaccepted tasks, stories and subtasks. '}</span>This snapshot cannot save changes; use the project tool or the managed workspace.</p>` : ''}</section>
${renderPeople(items, directory)}
${renderLimits(snapshot, unavailable && !unreadable)}
<noscript><p class="hint">Scripts are disabled. Every inspected record and its detail is listed above; filtering and person selection require scripts. Use the browser Find command and native record links to inspect work.</p></noscript><footer class="footer"><p>Changes are made in each member's own checkout and shared through the team's Git process. This report neither writes records nor shares local proposals. It is one self-contained file: it loads nothing from the network and stays readable with scripts turned off.</p></footer></main>
<script id="task-track-manifest" type="application/json">${inlineJson(manifest)}</script>
<script id="task-track-data" type="application/json">${inlineJson(snapshot)}</script>
<script>${SCRIPT}</script></body></html>`;
}

module.exports = { renderReport, REPORT_INLINE_SOURCES };
