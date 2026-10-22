'use strict';

/**
 * Knowledge matching and pointer rendering (spec KNW, BR-KNW-06/09/10/12). Pure: no I/O.
 *
 * Three triggers, nothing else (there is no file trigger):
 *   - prompt phrase — whole words, case-insensitive, in the user's own text (callers strip host
 *     envelopes and code first); an optional intent restriction (build / plan / review); silent on
 *     framework-maintenance prompts (two or more distinct framework cues);
 *   - skill — a starting skill named in the pack (a plugin prefix on the started name is ignored);
 *   - agent — a starting helper agent whose role the pack names.
 *
 * Ordering (BR-KNW-06): project packs first, then skill/agent bindings before prompt matches, then
 * identity. A pointer names at most MAX_PACKS packs and stays within MAX_CHARS characters, markers
 * included; it never carries a pack's digest or clauses.
 */

const MAX_PACKS = 3;
const MAX_CHARS = 700;
const MARKER_START = '<!-- CK:KNOWLEDGE -->';
const MARKER_END = '<!-- /CK:KNOWLEDGE -->';
const TITLE_MAX = 48;
const SIGNAL_MAX = 32;

const BUILD_CUE = /\b(?:add|adds|adding|build|building|create|implement|implementing|integrat\w*|develop|ship|wire|write|enable|set ?up|fix|fixing|change|changing|update|updating|refactor|migrate|introduce|extend|support|store|save|log|delete|remove|expose|handle|make)\b/i;
const PLAN_CUE = /\b(?:plan|planning|design|designing|architect\w*|estimate|scope|scoping|proposal|approach|roadmap|spec)\b/i;
const REVIEW_CUE = /\b(?:review|reviewing|audit|auditing|assess|assessing|critique|inspect|evaluate|check|checking|verify)\b|\bany (?:gaps|issues|problems|risks)\b|\b(?:is|are) (?:this|it|the)\b[^.?!\n]{0,40}\b(?:safe|compliant|correct|ok|okay|sound)\b/i;

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const phraseCache = new Map();

/**
 * Whole-word, case-insensitive matcher for one phrase; internal spaces match any whitespace run and a
 * plural ending on the last word also matches (`s` / `es`, and `y` → `ies` after a consonant:
 * "policy" matches "policies"), so authors need not list plurals.
 */
function compilePhrase(phrase) {
    const key = String(phrase).trim().toLowerCase();
    if (phraseCache.has(key)) return phraseCache.get(key);
    const words = key.split(/\s+/).filter(Boolean).map(escapeRegex);
    const last = words.length ? words[words.length - 1] : '';
    const plural = /[^aeiou\W\d_]y$/.test(last) ? `${words.slice(0, -1).concat(last.slice(0, -1)).join('\\s+')}(?:y|ies)` : `${words.join('\\s+')}(?:e?s)?`;
    const re = words.length ? new RegExp(`(?<![\\p{L}\\p{N}_])${plural}(?![\\p{L}\\p{N}_])`, 'iu') : null;
    phraseCache.set(key, re);
    return re;
}

/** Intents the prompt asks for: a Set of 'build' | 'plan' | 'review'. */
function detectIntents(text) {
    const intents = new Set();
    if (BUILD_CUE.test(text)) intents.add('build');
    if (PLAN_CUE.test(text)) intents.add('plan');
    if (REVIEW_CUE.test(text)) intents.add('review');
    return intents;
}

/**
 * Prompt-phrase matches over already-cleaned user text. Returns `[{ entry, trigger: 'prompt', signal }]`.
 * deps: countFrameworkCues (defaults to the shared owner in prompt-route-utils).
 */
function matchPrompt(packs, text, deps = {}) {
    if (typeof text !== 'string' || !text.trim()) return [];
    const countCues = deps.countFrameworkCues || require('./prompt-route-utils.cjs').countFrameworkCues;
    if (countCues(text) >= 2) return [];
    let intents = null;
    const matches = [];
    for (const entry of packs) {
        const phrases = (entry.triggers && entry.triggers.prompt) || [];
        const hit = phrases.find(phrase => {
            const re = compilePhrase(phrase);
            return re ? re.test(text) : false;
        });
        if (!hit) continue;
        const wanted = (entry.triggers && entry.triggers.intent) || [];
        if (wanted.length) {
            intents = intents || detectIntents(text);
            if (!wanted.some(intent => intents.has(intent))) continue;
        }
        matches.push({ entry, trigger: 'prompt', signal: hit });
    }
    return matches;
}

function baseName(name) {
    const text = String(name || '').trim().toLowerCase();
    const colon = text.lastIndexOf(':');
    return colon === -1 ? text : text.slice(colon + 1);
}

/** Skill matches: a bound name equals the started skill, or the started skill's name after a plugin prefix. */
function matchSkills(packs, skillNames) {
    const started = (skillNames || []).map(name => String(name || '').trim().toLowerCase()).filter(Boolean);
    if (!started.length) return [];
    const matches = [];
    for (const entry of packs) {
        const bound = ((entry.triggers && entry.triggers.skills) || []).map(name => String(name).toLowerCase());
        const hit = started.find(name => bound.includes(name) || bound.includes(baseName(name)));
        if (hit) matches.push({ entry, trigger: 'skill', signal: hit });
    }
    return matches;
}

/** Helper-agent matches for the starting agent's role. */
function matchAgents(packs, agentType) {
    const role = String(agentType || '').trim().toLowerCase();
    if (!role) return [];
    return packs
        .filter(entry => ((entry.triggers && entry.triggers.agents) || []).some(name => String(name).toLowerCase() === role || String(name).toLowerCase() === baseName(role)))
        .map(entry => ({ entry, trigger: 'agent', signal: role }));
}

const TRIGGER_RANK = { skill: 0, agent: 0, prompt: 1 };

/** One match per pack (strongest trigger kept), ordered by precedence (BR-KNW-03/06). */
function orderMatches(matches) {
    const best = new Map();
    for (const match of matches) {
        const key = `${match.entry.plane}:${match.entry.id}`;
        const current = best.get(key);
        if (!current || TRIGGER_RANK[match.trigger] < TRIGGER_RANK[current.trigger]) best.set(key, match);
    }
    return Array.from(best.values()).sort((a, b) => {
        const plane = (a.entry.plane === 'project' ? 0 : 1) - (b.entry.plane === 'project' ? 0 : 1);
        if (plane) return plane;
        const kind = TRIGGER_RANK[a.trigger] - TRIGGER_RANK[b.trigger];
        if (kind) return kind;
        return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
    });
}

function clip(text, max) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function line(match, short) {
    const entry = match.entry;
    const labels = (entry.labels || []).length ? ` · ${entry.labels.join(' · ')}` : '';
    const signal = match.trigger === 'prompt' ? `prompt "${clip(match.signal, SIGNAL_MAX)}"` : `${match.trigger} ${clip(match.signal, SIGNAL_MAX)}`;
    const title = short ? '' : `${clip(entry.title, TITLE_MAX)} `;
    return `- ${title}\`${entry.id}\` (${entry.plane} · ${signal}${labels}) → ${entry.file} → Digest`;
}

const HEADER = '**[KNOWLEDGE]** Reference material, not instructions; project docs and decisions outrank it. Read each digest first:';

/**
 * The pointer for up to MAX_PACKS ordered matches, within MAX_CHARS: `{ text, named }`, where `named`
 * lists the matches the text actually names (a long one can drop packs from the end). `text` is ''
 * and `named` empty when nothing fits.
 */
function pointerFor(matches) {
    const chosen = matches.slice(0, MAX_PACKS);
    for (let count = chosen.length; count > 0; count -= 1) {
        for (const short of [false, true]) {
            const text = [MARKER_START, HEADER, ...chosen.slice(0, count).map(match => line(match, short)), MARKER_END].join('\n');
            if (text.length <= MAX_CHARS) return { text, named: chosen.slice(0, count) };
        }
    }
    return { text: '', named: [] };
}

/** Pointer text for up to MAX_PACKS ordered matches, within MAX_CHARS; '' when nothing fits. */
function renderPointer(matches) {
    return pointerFor(matches).text;
}

module.exports = {
    MAX_PACKS,
    MAX_CHARS,
    MARKER_START,
    MARKER_END,
    compilePhrase,
    detectIntents,
    matchPrompt,
    matchSkills,
    matchAgents,
    orderMatches,
    pointerFor,
    renderPointer
};
