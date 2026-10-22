'use strict';

/**
 * Knowledge search (spec KNW, BR-KNW-18): ranked sections with citations, no dependency.
 *
 * Every pack of both planes is split into sections (its digest and each heading of its body; a stub's
 * referred document contributes its own headings). A section scores by query terms in its heading
 * (weighted) and text, scaled by how rare each term is across all sections (a BM25-style saturation,
 * so one long section cannot win by repetition alone). Order is deterministic: score, then plane
 * (project first), then pack identity, then position — the same knowledge base always ranks the same.
 * Both planes are listed, even when a project pack shadows a framework pack of the same identity, so an
 * answer can name a disagreement (BR-KNW-03).
 *
 * Bounded: one read per pack file and per referred body, each capped at MAX_FILE_BYTES; at most
 * MAX_LIMIT results.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;
const MAX_FILE_BYTES = 512 * 1024;
const HEADING_WEIGHT = 3;
const SATURATION = 1.2;
const EXCERPT_CHARS = 160;
const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'its', 'may', 'of', 'on', 'or', 'our', 'should', 'that', 'the', 'their', 'this', 'to', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you']);

/** Lowercase word tokens with a light plural/verb-ending fold, so "numbers" finds "number". */
function tokens(text) {
    const out = [];
    for (const raw of String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || []) {
        if (STOPWORDS.has(raw) || raw.length < 2) continue;
        out.push(fold(raw));
    }
    return out;
}

function fold(word) {
    if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
    if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
    if (word.length > 3 && word.endsWith('es') && /(?:s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
    return word;
}

function readCapped(file) {
    try {
        const fd = fs.openSync(file, 'r');
        try {
            const buffer = Buffer.alloc(MAX_FILE_BYTES);
            const bytes = fs.readSync(fd, buffer, 0, MAX_FILE_BYTES, 0);
            return buffer.subarray(0, bytes).toString('utf8');
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
}

/** The heading anchor a Markdown host renders: punctuation removed, each space a hyphen ("A & B" → "a--b"). */
function slug(heading) {
    return String(heading).trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

/**
 * Sections of one document body: `{ heading, text, line }`, outside fenced code. `lineOffset` is the number
 * of file lines before the body (its frontmatter), so `line` is the heading's line in the file (BR-KNW-18).
 */
function sectionsOf(body, lineOffset = 0) {
    const { parseHeading } = require('./knowledge-pack.cjs');
    const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
    const sections = [];
    let current = null;
    let fenced = false;
    lines.forEach((line, index) => {
        if (/^ {0,3}(```|~~~)/.test(line)) fenced = !fenced;
        const heading = !fenced && parseHeading(line, 4);
        if (heading) {
            current = { heading: heading.text, text: [], line: index + 1 + lineOffset };
            sections.push(current);
        } else if (current) {
            current.text.push(line);
        }
    });
    return sections.map(section => ({ ...section, text: section.text.join('\n').trim() }));
}

/** `{ body, offset }`: the text after the frontmatter and how many file lines precede it. */
function bodyOf(text) {
    const source = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = source.split('\n');
    if (lines[0].trim() !== '---') return { body: source, offset: 0 };
    const close = require('./knowledge-pack.cjs').closingFenceIndex(lines);
    return close === -1 ? { body: source, offset: 0 } : { body: lines.slice(close + 1).join('\n'), offset: close + 1 };
}

function sectionsOfDocument(text) {
    const { body, offset } = bodyOf(text);
    return sectionsOf(body, offset);
}

/** Every searchable section of both planes, project first. */
function collectSections(projectDir) {
    const indexLib = require('./knowledge-index.cjs');
    const packLib = require('./knowledge-pack.cjs');
    const planes = indexLib.resolvePlanes(projectDir);
    const docs = [];
    for (const name of ['project', 'framework']) {
        const built = indexLib.buildPlane(projectDir, planes[name]);
        for (const entry of built.index.packs) {
            const packText = readCapped(path.join(projectDir, ...entry.file.split('/')));
            if (packText === null) continue;
            const parts = sectionsOfDocument(packText).map(section => ({ ...section, location: entry.file }));
            if (entry.body) {
                const bodyText = readCapped(path.join(projectDir, ...entry.body.split('/')));
                if (bodyText !== null) parts.push(...sectionsOfDocument(bodyText).map(section => ({ ...section, location: entry.body })));
            }
            parts.forEach((section, position) => {
                const clause = packLib.extractClauses(`## ${section.heading}`)[0];
                docs.push({ entry, plane: name, position, clause: clause ? clause.id : null, ...section, headingTokens: tokens(section.heading), textTokens: tokens(section.text) });
            });
        }
    }
    return docs;
}

function excerpt(text, terms) {
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    if (!flat) return '';
    const lower = flat.toLowerCase();
    let at = -1;
    for (const term of terms) {
        const found = lower.indexOf(term);
        if (found !== -1 && (at === -1 || found < at)) at = found;
    }
    const start = Math.max(0, at - 40);
    const piece = flat.slice(start, start + EXCERPT_CHARS);
    return `${start > 0 ? '…' : ''}${piece}${start + EXCERPT_CHARS < flat.length ? '…' : ''}`;
}

/**
 * Ranked sections for `query`. Each result: { pack, plane, clause, heading, location, line, excerpt,
 * labels, score }. An empty array when nothing matches.
 */
function search(projectDir, query, { limit = DEFAULT_LIMIT } = {}) {
    const terms = Array.from(new Set(tokens(query)));
    if (!terms.length) return [];
    const docs = collectSections(projectDir);
    const total = docs.length || 1;
    const idf = new Map(terms.map(term => {
        const containing = docs.filter(doc => doc.headingTokens.includes(term) || doc.textTokens.includes(term)).length;
        return [term, Math.log(1 + (total - containing + 0.5) / (containing + 0.5))];
    }));
    const scored = [];
    for (const doc of docs) {
        let score = 0;
        for (const term of terms) {
            const tf = doc.textTokens.filter(token => token === term).length + HEADING_WEIGHT * doc.headingTokens.filter(token => token === term).length;
            if (tf) score += idf.get(term) * ((tf * (SATURATION + 1)) / (tf + SATURATION));
        }
        if (score > 0) scored.push({ doc, score });
    }
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.doc.plane !== b.doc.plane) return a.doc.plane === 'project' ? -1 : 1;
        if (a.doc.entry.id !== b.doc.entry.id) return a.doc.entry.id < b.doc.entry.id ? -1 : 1;
        return a.doc.position - b.doc.position;
    });
    const capped = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(limit) ? limit : DEFAULT_LIMIT));
    return scored.slice(0, capped).map(({ doc, score }) => ({
        pack: doc.entry.id,
        plane: doc.plane,
        clause: doc.clause,
        heading: doc.heading,
        location: `${doc.location}#${slug(doc.heading)}`,
        line: doc.line,
        excerpt: excerpt(doc.text, terms),
        labels: doc.entry.labels || [],
        score: Math.round(score * 1000) / 1000
    }));
}

module.exports = { DEFAULT_LIMIT, MAX_LIMIT, tokens, sectionsOf, search };
