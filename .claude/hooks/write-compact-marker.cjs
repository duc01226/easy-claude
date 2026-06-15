#!/usr/bin/env node
'use strict';

/**
 * PreCompact Hook: Write session-specific marker file when conversation is compacted
 *
 * Writes a session-scoped marker whose EXISTENCE signals to
 * `post-compact-recovery.cjs` (next SessionStart resume|compact) that a compact
 * occurred — gating partial-progress recovery, the transcript snapshot, and the
 * AI-principle re-anchoring. The marker is an existence flag; it carries no payload.
 *
 * Fixes #178: Uses /tmp/ck/ namespace for temp files
 */

const fs = require('fs');
const {
  MARKERS_DIR,
  DEBUG_DIR,
  SESSION_ID_DEFAULT,
  ensureDir,
  getMarkerPath,
  getDebugLogPath
} = require('./lib/ck-paths.cjs');

/**
 * Append debug info to session-specific log file
 */
function debugLog(sessionId, message) {
  try {
    ensureDir(DEBUG_DIR);
    const logPath = getDebugLogPath(sessionId);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    // Silent fail
  }
}

// COMPACT INVARIANT: This hook must fire BEFORE post-compact-recovery sees the marker.
// The marker's existence is the signal post-compact-recovery keys on (it reads no payload).
// Workflow state is separately managed by todo-tracker.cjs and workflow-step-tracker.cjs.

// Read JSON from stdin (PreCompact payload)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Use SESSION_ID_DEFAULT as fallback (shared constant — must match all marker readers)
    const sessionId = data.session_id || SESSION_ID_DEFAULT;

    // Log received payload for debugging
    debugLog(sessionId, `PreCompact payload: ${JSON.stringify(data)}`);

    // Ensure marker directory exists
    ensureDir(MARKERS_DIR);

    // Write session-specific marker; its existence tells post-compact-recovery.cjs
    // a compact occurred (gates partial-progress recovery, snapshot, re-anchoring).
    const markerPath = getMarkerPath(sessionId);
    const marker = {
      sessionId: sessionId,
      trigger: data.trigger || 'unknown',
      timestamp: Date.now()
    };
    fs.writeFileSync(markerPath, JSON.stringify(marker));

    debugLog(sessionId, `Compact marker written at ${markerPath}`);

  } catch (err) {
    debugLog('error', `Error: ${err.message}`);
    // Silent fail - don't break the compact
  }
});
