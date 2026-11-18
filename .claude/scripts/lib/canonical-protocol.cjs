'use strict';

const fs = require('fs');
const path = require('path');
const { extractSyncBody } = require('./extract-sync-block.cjs');

/**
 * Read the bodies of canonical shared protocols (`## SYNC:<tag>` in
 * `.claude/skills/shared/sync-inline-versions.md`). Missing tags map to null. An unreadable file yields an empty map.
 * The one reader hooks use for a canonical text they re-deliver; it composes nothing.
 */
function readCanonicalProtocols(rootDir, tags) {
    let markdown;
    try {
        const file = path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
        markdown = fs.readFileSync(file, 'utf8');
    } catch {
        return {};
    }
    return Object.fromEntries(tags.map(tag => [tag, extractSyncBody(markdown, tag)]));
}

function readCanonicalProtocol(rootDir, tag) {
    return readCanonicalProtocols(rootDir, [tag])[tag] ?? null;
}

module.exports = { readCanonicalProtocol, readCanonicalProtocols };
