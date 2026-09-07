#!/usr/bin/env node
/**
 * SessionEnd Hook - Cleanup on session end
 *
 * Fires: When session ends (clear, compact, user exit)
 * Purpose: Clean up tmpclaude temp/swap files and stale snapshots on session end
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { cleanupAll } = require('./lib/temp-file-cleanup.cjs');
const { cleanupSwapFiles, deleteSessionSwap } = require('./lib/swap-engine.cjs');
const { getSnapshotPath } = require('./lib/ck-paths.cjs');
const { canonicalDirectory, revokeSessionLeases } = require('./lib/git-operation-lease.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');

function revokeGitLeases(reason, sessionId, projectDir) {
    if (!sessionId || (reason !== 'clear' && reason !== 'exit')) return;

    try {
        projectDir = canonicalDirectory(projectDir);
        const storeDir = process.env.CK_GIT_LEASE_STORE;
        const revoked = revokeSessionLeases({ projectDir, sessionId, ...(storeDir ? { storeDir } : {}) });
        debug('session-end', `Revoked ${revoked} Git lease(s) for session ${sessionId}`);
    } catch (error) {
        // Cleanup remains non-blocking; a malformed/missing project or store
        // must not turn SessionEnd into a blocking hook or broaden its scope.
        debug('session-end', `Git lease cleanup skipped: ${error.message}`);
    }
}

runHookSync('session-end', event => {
    // Resolve once before every mutation: an invalid explicit project must
    // never redirect lease revocation, temp cleanup or swap deletion to cwd.
    const resolution = resolveProjectRoot({ cwd: event.cwd || process.cwd(), scriptPath: __filename, env: process.env });
    if (resolution.error) {
        debug('session-end', `Cleanup skipped: ${resolution.error}`);
        return;
    }
    const reason = event.reason || 'unknown';
    const sessionId = event.session_id || null;

    debug('session-end', `Reason: ${reason}, Session: ${sessionId}`);

    // Clear/exit revoke only this session's leases. Compact intentionally does
    // not revoke, refresh or otherwise extend a lease; expiry remains the
    // crash-recovery bound.
    revokeGitLeases(reason, sessionId, resolution.rootDir);

    // Clean up tmpclaude temp files (project root + .claude/ recursively)
    cleanupAll(resolution.rootDir);

    // Clean up swap files based on reason
    if (sessionId) {
        if (reason === 'clear' || reason === 'exit') {
            // Full cleanup on clear/exit - delete entire swap directory
            deleteSessionSwap(sessionId);
            debug('session-end', `Deleted swap directory for session ${sessionId}`);
            try {
                const snapshotPath = getSnapshotPath(sessionId);
                if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
            } catch (e) {
                debug('session-end', `Failed to clean snapshot: ${e.message}`);
            }
        } else if (reason === 'compact') {
            // On compact, only cleanup old files (keep recent for recovery)
            cleanupSwapFiles(sessionId, 24); // 24 hour retention
            debug('session-end', `Cleaned old swap files for session ${sessionId}`);
        }
    }
});
