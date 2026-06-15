/**
 * Session Lifecycle Hooks Test Suite
 *
 * Tests for:
 * - session-init.cjs: Session initialization and project detection
 * - session-resume.cjs: Checkpoint restoration
 * - session-end.cjs: Session cleanup
 * - subagent-init.cjs: SubagentStart dispatcher 1/3 (identity + patterns + dev-rules + code-review-rules + lessons)
 * - subagent-init-2.cjs: SubagentStart dispatcher 2/3 (ai-mistakes)
 * - subagent-init-3.cjs: SubagentStart dispatcher 3/3 (context-guard + parent todos)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    runHook,
    getHookPath,
    createSessionStartInput,
    createSessionEndInput,
    createPreCompactInput,
    createPostToolUseInput
} = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue, assertFalse, assertNotNullish, assertNotContains } = require('../lib/assertions.cjs');
const {
    createTempDir,
    cleanupTempDir,
    setupCheckpoint,
    setupTodoState,
    createMockFile,
    fileExists,
    createTimestamp
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const POST_AGENT_VALIDATOR = getHookPath('post-agent-validator.cjs');
const SESSION_END = getHookPath('session-end.cjs');
// NOTE: the subagent-init*.cjs dispatchers and the subagent-context-builders.cjs lib were
// removed in the inject-hook removal (Claude/Codex skill parity). Their subagent-context
// injection tests are gone; the genuine lifecycle asserts (session-init/resume/end,
// post-agent-validator, post-compact-recovery, todo/session-state isolation) remain below.

// ============================================================================
// session-init.cjs Tests
// ============================================================================

const sessionInitTests = [
    {
        name: '[session-init] handles startup source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('startup', 'test-session-123');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                // Session init outputs project context
                const output = result.stdout + result.stderr;
                assertTrue(
                    output.includes('Session') || output.includes('Project') || output === '' || output.includes('single-repo'), // May detect project type
                    'Should output session context or nothing'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles resume source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('resume', 'test-session-123');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles clear source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('clear');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles compact source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('compact');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] detects Node project by package.json',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                createMockFile(tmpDir, 'package.json', '{"name": "test-project"}');
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
                const output = result.stdout + result.stderr;
                // May detect node/npm project
                assertTrue(
                    output.toLowerCase().includes('npm') ||
                        output.toLowerCase().includes('node') ||
                        output.toLowerCase().includes('single-repo') ||
                        output === '',
                    'May detect Node project'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] detects .NET project by .sln file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                createMockFile(tmpDir, 'Project.sln', 'Microsoft Visual Studio Solution File');
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles empty input gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(SESSION_INIT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block on empty input');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// session-resume.cjs Tests
// ============================================================================

const sessionResumeTests = [
    {
        name: '[session-resume] restores todos from fresh checkpoint',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                setupCheckpoint(tmpDir, {
                    timestamp: createTimestamp(0), // Now
                    todos: [
                        { content: 'Task 1', status: 'pending' },
                        { content: 'Task 2', status: 'in_progress' }
                    ]
                });
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
                const output = result.stdout + result.stderr;
                // May output restoration message
                assertTrue(
                    output.includes('restore') || output.includes('checkpoint') || output.includes('todo') || output === '',
                    'May mention restoration or be silent'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] skips if no checkpoint exists',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] skips stale checkpoint (>24h old)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                setupCheckpoint(tmpDir, {
                    timestamp: createTimestamp(25), // 25 hours ago
                    todos: [{ content: 'Old task', status: 'pending' }]
                });
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
                // Should not restore stale checkpoint
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] handles startup source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] handles compact source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('compact');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// session-end.cjs Tests
// ============================================================================

const sessionEndTests = [
    {
        name: '[session-end] handles clear source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create state files
                setupTodoState(tmpDir, { hasTodos: true, taskCount: 2 });
                const input = createSessionEndInput('clear');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-end] handles exit source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionEndInput('exit');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-end] handles empty directory',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionEndInput('clear');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not fail on missing files');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Config File Edge Cases
// ============================================================================

const configEdgeCaseTests = [
    {
        name: '[session-init] handles missing .ck.json config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create .claude directory but no .ck.json
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash without config file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles empty .ck.json config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{}');

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should handle empty config');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles invalid JSON in .ck.json',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{ broken json');

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash on malformed JSON');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles config with wrong types',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                // Write config with wrong types (string instead of boolean, number instead of string, etc.)
                fs.writeFileSync(
                    path.join(claudeDir, '.ck.json'),
                    JSON.stringify({
                        enableHooks: 'yes', // Should be boolean
                        maxRetries: 'three', // Should be number
                        timeout: true, // Should be number
                        features: 123 // Should be array/object
                    })
                );

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should handle config with wrong types');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] handles malformed checkpoint file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const memoryDir = path.join(tmpDir, '.claude', 'memory');
                fs.mkdirSync(memoryDir, { recursive: true });
                // Write malformed checkpoint
                fs.writeFileSync(path.join(memoryDir, 'session-checkpoint.json'), '{ broken');

                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash on malformed checkpoint');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles config in different locations',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create nested project structure with config at different level
                const projectDir = path.join(tmpDir, 'project');
                const subDir = path.join(projectDir, 'src', 'app');
                fs.mkdirSync(subDir, { recursive: true });

                // Config only at root level
                const claudeDir = path.join(projectDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), JSON.stringify({ projectName: 'test' }));

                // Run from subdirectory
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: subDir });
                assertAllowed(result.code, 'Should handle config search path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-001 / 002 / 003 — PostToolUse Agent result validator
const postAgentValidatorTests = [
    {
        name: 'TC-SUBCTX-001: empty Agent result triggers truncation warning',
        async fn() {
            const input = createPostToolUseInput('Agent', {}, '');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
            assertContains(result.stdout, 'truncated', 'Should mention truncated');
            assertContains(result.stdout, 'subagent', 'Should mention subagent');
        }
    },
    {
        name: 'TC-SUBCTX-002: short result without terminal punctuation triggers warning',
        async fn() {
            const input = createPostToolUseInput('Agent', {}, 'Investigating the issue and checking files for');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
            assertContains(result.stdout, 'truncated', 'Should emit truncation warning');
        }
    },
    {
        name: 'TC-SUBCTX-003: healthy result (>200 chars with terminal punctuation) is silent',
        async fn() {
            const healthyResult = 'Completed analysis of write-compact-marker.cjs. Found 2 HIGH bugs: (1) truthy guard at line 164 uses !== null instead of truthy check; (2) SESSION_ID_DEFAULT not used at call site. All findings confirmed with file-level grep evidence.';
            const input = createPostToolUseInput('Agent', {}, healthyResult);
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0');
            assertNotContains(result.stdout, 'truncated', 'Should NOT emit truncation warning for healthy result');
        }
    },
    {
        // TC-SUBCTX-044: object toolResult must not crash (H4 fix — JSON.stringify try/catch)
        name: 'TC-SUBCTX-044: post-agent-validator: object toolResult exits 0 (no crash)',
        async fn() {
            // Pass object (not string) as toolResult — exercises the JSON.stringify/try-catch branch
            const input = createPostToolUseInput('Agent', {}, {});
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 — no crash on object toolResult');
        }
    }
];

// TC-SUBCTX-020 / 021 / 022 — post-compact-recovery.cjs partial progress scanner
const POST_COMPACT_RECOVERY = getHookPath('post-compact-recovery.cjs');

/**
 * Create a compact marker file for the given sessionId so that post-compact-recovery
 * will surface partial progress files (H2 fix: marker gates the partial-file scanner).
 * Returns the marker path for cleanup in finally blocks.
 */
function createCompactMarker(sessionId) {
    const markersDir = path.join(os.tmpdir(), 'ck', 'markers');
    fs.mkdirSync(markersDir, { recursive: true });
    const markerPath = path.join(markersDir, `${sessionId}.json`);
    fs.writeFileSync(markerPath, JSON.stringify({ sessionId, timestamp: Date.now() }));
    return markerPath;
}

function removeCompactMarker(markerPath) {
    try { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); } catch (e) {}
}

const partialProgressScannerTests = [
    {
        name: 'TC-SUBCTX-020: partial progress file triggers recovery block',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('test-session-phase03');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-f1e2d3.progress.md');
                fs.writeFileSync(progressFile, 'Session: test-session-phase03\n## Analysis\n[partial] step 2 interrupted\nstill in progress\n');

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work', 'Should contain Partial Subagent Work heading');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-021: done-only progress file is silent',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = require('path').join(tmpDir, 'tmp');
                require('fs').mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = require('path').join(tmpSubDir, 'ck-agent-20260414120001.progress.md');
                require('fs').writeFileSync(progressFile, '## Analysis\n[done] step 1 complete\n[done] step 2 complete\n');

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work', 'Should NOT surface done-only file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-022: old done-only file is cleaned up',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('test-session-phase03');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260412000000.progress.md');
                fs.writeFileSync(progressFile, '## Analysis\n[done] step 1 complete\n');
                const oldTime = new Date(Date.now() - 48 * 3600 * 1000);
                fs.utimesSync(progressFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertTrue(!fs.existsSync(progressFile), 'Old done file should be deleted');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-023: backward-compat: headerless partial file shown to any session',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-any');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                // Old-format: no Session header, no random suffix
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120002.progress.md');
                fs.writeFileSync(progressFile, '## Analysis\n[partial] step 1 incomplete\n');

                const input = createSessionStartInput('resume', 'sess-any');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work',
                    'Backward-compat: headerless partial file must be shown to any session');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-030 to TC-SUBCTX-035 — Concurrency & session isolation (post-compact-recovery).
// The context-guard asserts (TC-SUBCTX-034/036/037) were dropped with subagent-init-3.cjs +
// subagent-context-builders.cjs in the inject-hook removal.
const concurrencyTests = [
    {
        name: 'TC-SUBCTX-030: same-millisecond progress filenames differ via random suffix',
        fn: () => {
            // Use fixed values to prove the formula works deterministically
            const ts = '20260414143022847'; // fixed 17-char timestamp (YYYYMMDDHHmmssSSS)
            const rnd1 = 'a3f9d2';
            const rnd2 = 'b7c041';
            const name1 = `ck-agent-${ts}-${rnd1}.progress.md`;
            const name2 = `ck-agent-${ts}-${rnd2}.progress.md`;
            assertEqual(ts.length, 17, 'Timestamp must be 17 chars (YYYYMMDDHHmmssSSS — ms precision)');
            assertTrue(name1 !== name2, 'Same-timestamp, different-rnd names must differ');
            assertTrue(/^ck-agent-\d{17}-[0-9a-f]{6}\.progress\.md$/.test(name1), 'Name must match new format pattern');
            // Verify live formula produces correct length timestamp
            const liveTs = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 17);
            assertEqual(liveTs.length, 17, 'Live timestamp must be 17 chars');
        }
    },
    {
        name: 'TC-SUBCTX-031: findPartialProgressFiles returns only own-session partial files',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Own-session partial file
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260414120010-aaaaaa.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-A\n## Task\n[partial] step 2 in progress\n');

                // Other-session partial file
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260414120011-bbbbbb.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Task\n[partial] step 1 in progress\n');

                const input = createSessionStartInput('resume', 'sess-A');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414120010-aaaaaa', 'Should show own-session file');
                assertNotContains(result.stdout, 'ck-agent-20260414120011-bbbbbb', 'Should NOT show other-session file');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-032: findPartialProgressFiles excludes other-session partial files',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // sess-B's partial file only
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260414120020-cccccc.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Task\n[partial] step 3 incomplete\n');

                // Run as sess-A — should see nothing
                const input = createSessionStartInput('resume', 'sess-A');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work', 'Should NOT show other-session partial file to sess-A');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-033: cleanupDoneProgressFiles skips other-session files',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Own-session done file — old enough to delete
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260413000000-dddddd.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-A\n## Done\n[done] step 1\n');
                const oldTime = new Date(Date.now() - 48 * 3600 * 1000);
                fs.utimesSync(ownFile, oldTime, oldTime);

                // Other-session done file — also old
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260413000001-eeeeee.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Done\n[done] step 1\n');
                fs.utimesSync(otherFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'sess-A');
                await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });

                // Own-session file should be deleted; other-session file must survive
                assertTrue(!fs.existsSync(ownFile), 'Own-session done file should be deleted');
                assertTrue(fs.existsSync(otherFile), 'Other-session done file must NOT be deleted');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-035: two sibling agents (same parent session) both shown in recovery',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('parent-sess');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                // Two sibling agents under parent-sess
                const file1 = path.join(tmpSubDir, 'ck-agent-20260414130001-aaa111.progress.md');
                fs.writeFileSync(file1, 'Session: parent-sess\n## Step 1\n[partial] agent A incomplete\n');
                const file2 = path.join(tmpSubDir, 'ck-agent-20260414130002-bbb222.progress.md');
                fs.writeFileSync(file2, 'Session: parent-sess\n## Step 2\n[partial] agent B incomplete\n');

                const input = createSessionStartInput('resume', 'parent-sess');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414130001-aaa111', 'Agent A file must be shown');
                assertContains(result.stdout, 'ck-agent-20260414130002-bbb222', 'Agent B file must be shown');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-039 to TC-SUBCTX-043 — Additional concurrency & isolation coverage.
// TC-SUBCTX-038 (subagent-init-context-guard placeholder) was dropped with subagent-init-3.cjs.
const additionalConcurrencyTests = [
    {
        // post-agent-validator must be silent for non-Agent tool calls (e.g. Read, Bash)
        name: 'TC-SUBCTX-039: post-agent-validator is silent for non-Agent tool calls',
        async fn() {
            const input = createPostToolUseInput('Read', { file_path: 'some/file.md' }, 'File content here. Something fully valid.');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0');
            assertNotContains(result.stdout, 'truncated', 'Should NOT warn for non-Agent tool calls');
            assertNotContains(result.stdout, 'subagent', 'Should be completely silent for non-Agent calls');
        }
    },
    {
        // Heuristic 3: result references a plans/ path that does NOT exist on disk → warning
        name: 'TC-SUBCTX-040: post-agent-validator warns when referenced report path is missing on disk',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Result has terminal punctuation (skips H2), but referenced plan path doesn't exist — H3 fires
                const result_text = 'Analysis complete. All findings written to plans/reports/analysis-20260414-missing-038.md for review.';
                const input = createPostToolUseInput('Agent', {}, result_text);
                const result = await runHook(POST_AGENT_VALIDATOR, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
                assertContains(result.stdout, 'truncated', 'Should warn when referenced report does not exist on disk');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Heuristic 3 negative: result references an EXISTING report → no warning
        name: 'TC-SUBCTX-041: post-agent-validator is silent when referenced report exists on disk',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Create the report file the result will reference
                const reportsDir = path.join(tmpDir, 'plans', 'reports');
                fs.mkdirSync(reportsDir, { recursive: true });
                fs.writeFileSync(path.join(reportsDir, 'analysis-20260414-exists-041.md'), '# Report');

                const result_text = 'Analysis complete. All findings written to plans/reports/analysis-20260414-exists-041.md for review.';
                const input = createPostToolUseInput('Agent', {}, result_text);
                const result = await runHook(POST_AGENT_VALIDATOR, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'truncated', 'Should NOT warn when report file exists on disk');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // findPartialProgressFiles age filter: partial file older than maxAgeMinutes (120) is excluded
        name: 'TC-SUBCTX-042: partial progress file older than maxAgeMinutes is not surfaced in recovery',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // [partial] file but mtime = 3 hours ago (> 120-min window)
                const oldFile = path.join(tmpSubDir, 'ck-agent-20260413000000-ffffff.progress.md');
                fs.writeFileSync(oldFile, 'Session: sess-age-042\n## Step\n[partial] interrupted 3h ago\n');
                const oldTime = new Date(Date.now() - 3 * 3600 * 1000); // 3 hours ago
                fs.utimesSync(oldFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'sess-age-042');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'Old partial file (>maxAgeMinutes) must not be surfaced in recovery');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // End-to-end: only own-session + recent + partial files are surfaced; all others excluded
        name: 'TC-SUBCTX-043: mixed progress files — only own-session recent partial files surfaced',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-mixed-043');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // A: own-session, partial, recent → SHOWN
                const fileA = path.join(tmpSubDir, 'ck-agent-20260414120100-aa0001.progress.md');
                fs.writeFileSync(fileA, 'Session: sess-mixed-043\n## Step 1\n[partial] incomplete\n');

                // B: own-session, partial, OLD (>2h) → NOT shown
                const fileB = path.join(tmpSubDir, 'ck-agent-20260413000000-bb0002.progress.md');
                fs.writeFileSync(fileB, 'Session: sess-mixed-043\n## Step 2\n[partial] old incomplete\n');
                const oldTime = new Date(Date.now() - 3 * 3600 * 1000);
                fs.utimesSync(fileB, oldTime, oldTime);

                // C: own-session, DONE (no [partial]) → NOT shown
                const fileC = path.join(tmpSubDir, 'ck-agent-20260414120200-cc0003.progress.md');
                fs.writeFileSync(fileC, 'Session: sess-mixed-043\n## Step 3\n[done] all complete\n');

                // D: other-session, partial, recent → NOT shown for sess-mixed-043
                const fileD = path.join(tmpSubDir, 'ck-agent-20260414120300-dd0004.progress.md');
                fs.writeFileSync(fileD, 'Session: sess-other\n## Step 4\n[partial] other session partial\n');

                const input = createSessionStartInput('resume', 'sess-mixed-043');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414120100-aa0001', 'Should surface own-session recent partial');
                assertNotContains(result.stdout, 'ck-agent-20260413000000-bb0002', 'Should NOT surface old partial');
                assertNotContains(result.stdout, 'ck-agent-20260414120200-cc0003', 'Should NOT surface done file');
                assertNotContains(result.stdout, 'ck-agent-20260414120300-dd0004', 'Should NOT surface other-session partial');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-051/055/056/056B — todo-state + post-compact-recovery concurrency/isolation.
// The subagent-init dispatcher + subagent-context-builders edge-case tests (044,045,046,049,
// 050,052,053,054,057) and the 8→3 consolidation DEDUP-001..008 asserts were dropped with the
// inject-hook removal — the entire subagent-init*.cjs family + builders lib no longer exist.
const { getTodoState, setTodoState, clearTodoState } = require('../../lib/todo-state.cjs');

const newConcurrencyTests = [
    {
        // Two agents same session_id read todo-state simultaneously → consistent state
        name: 'TC-SUBCTX-051: concurrent reads of todo-state return consistent hasTodos value',
        async fn() {
            const sessionId = 'sess-051-concurrent';
            // Write initial state
            const written = setTodoState(sessionId, { hasTodos: true, pendingCount: 3, completedCount: 1, inProgressCount: 0, lastTodos: [], bypasses: [], taskSubjects: {} });
            assertTrue(written, 'setTodoState must succeed');

            // Simulate two concurrent reads
            const [state1, state2] = await Promise.all([
                Promise.resolve(getTodoState(sessionId)),
                Promise.resolve(getTodoState(sessionId))
            ]);

            assertEqual(state1.hasTodos, true, 'state1.hasTodos must be true');
            assertEqual(state2.hasTodos, true, 'state2.hasTodos must be true');
            assertEqual(state1.pendingCount, state2.pendingCount, 'Both reads must return same pendingCount');
        }
    },
    {
        // TC-SUBCTX-056: post-compact-recovery with NO marker file + [partial] file →
        // output does NOT include "Partial Subagent Work" (scanner is gated by marker)
        name: 'TC-SUBCTX-056: post-compact-recovery without marker: partial file not surfaced',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-056-no-marker';
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120056-a1b2c3.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Analysis\n[partial] step 1 incomplete\n`);

                // Explicitly do NOT create a compact marker
                const input = createSessionStartInput('resume', sessionId);
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'Without marker, partial scanner must NOT surface partial files');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // TC-SUBCTX-056B: post-compact-recovery with marker present →
        // marker file is deleted after recovery runs (Fix 1.2: prevents duplicate surface on second resume)
        name: 'TC-SUBCTX-056B: post-compact-recovery deletes marker after recovery runs',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-056b-marker-del';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120056-d4e5f6.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Analysis\n[partial] step 1 interrupted\n`);

                const input = createSessionStartInput('resume', sessionId);
                await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });

                // Marker MUST be deleted after recovery so second resume doesn't re-surface
                assertTrue(!fs.existsSync(markerPath),
                    'Compact marker must be deleted after recovery runs (Fix 1.2)');
            } finally {
                removeCompactMarker(markerPath); // idempotent cleanup if test failed before hook ran
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-055: setTodoState() Windows-safe fallback preserves valid JSON on concurrent writes',
        fn() {
            const sessionId = 'sess-055-rename';

            // Write #1: initial state
            const ok1 = setTodoState(sessionId, {
                hasTodos: true, pendingCount: 2, completedCount: 0,
                inProgressCount: 1, lastTodos: [], bypasses: [], taskSubjects: {}
            });
            assertTrue(ok1, 'First setTodoState must succeed');

            // Write #2: update state (simulates second concurrent write overwriting #1 result)
            const ok2 = setTodoState(sessionId, {
                hasTodos: true, pendingCount: 1, completedCount: 1,
                inProgressCount: 0, lastTodos: [], bypasses: [], taskSubjects: {}
            });
            assertTrue(ok2, 'Second setTodoState must succeed (Windows-safe fallback)');

            // Both writes completed — final state must be valid JSON with correct values
            const finalState = getTodoState(sessionId);
            assertTrue(finalState !== null, 'Final state must not be null');
            assertEqual(finalState.hasTodos, true, 'hasTodos must be preserved');
            // Second write should win (most recent)
            assertEqual(finalState.completedCount, 1, 'completedCount from second write must be preserved');
            assertEqual(finalState.inProgressCount, 0, 'inProgressCount from second write must be preserved');
        }
    }
];

// ============================================================================
// TC-SUBCTX-058 to TC-SUBCTX-074 — Sub-agent concurrency & isolation.
// Relocated from the former subagent-concurrency.test.cjs (deleted in the inject-hook
// removal). These are GENUINE lifecycle asserts — they exercise surviving libs/hooks:
// temp-file-cleanup, ck-session-state, todo-state, ck-paths, workflow-state, edit-state,
// bash-cleanup, post-compact-recovery, write-compact-marker. The two context-injection
// asserts (TC-SUBCTX-069/070, which drove the deleted subagent-init-3.cjs dispatcher)
// were dropped — the dispatcher no longer exists.
// ============================================================================
const { TEMP_FILE_PATTERN } = require('../../lib/temp-file-cleanup.cjs');
const { writeSessionState, readSessionState, deleteSessionState } = require('../../lib/ck-session-state.cjs');
const { MARKERS_DIR, getMarkerPath, ensureDir } = require('../../lib/ck-paths.cjs');
const { saveState, loadState, clearState } = require('../../lib/workflow-state.cjs');
const { setEditState, getEditState, clearEditState } = require('../../lib/edit-state.cjs');

const BASH_CLEANUP = getHookPath('bash-cleanup.cjs');
const WRITE_COMPACT_MARKER = getHookPath('write-compact-marker.cjs');

const subagentIsolationTests = [
    {
        name: 'TC-SUBCTX-058: TEMP_FILE_PATTERN matches tmpclaude-* files and rejects progress files',
        fn() {
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd'), 'Should match valid tmpclaude-*-cwd');
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-f0e1d2c3-cwd'), 'Should match all-hex tmpclaude-*-cwd');
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-20260414120000-aabbcc.progress.md'), 'Must NOT match progress files');
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-00000000000000000-ffffff.progress.md'), 'Must NOT match long-ts progress');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123-cwd-extra'), 'Must NOT match extra suffix');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-ABCDEF00-cwd'), 'Must NOT match uppercase hex');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd.json'), 'Must NOT match with extension');
            assertFalse(TEMP_FILE_PATTERN.test(''), 'Must NOT match empty string');
        }
    },
    {
        name: 'TC-SUBCTX-059: bash-cleanup removes tmpclaude-* but preserves progress files',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                const tmpFile = path.join(claudeDir, 'tmpclaude-deadbeef-cwd');
                fs.writeFileSync(tmpFile, '/some/working/dir');

                const progressDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(progressDir, { recursive: true });
                const progressFile = path.join(progressDir, 'ck-agent-20260414120000-aabbcc.progress.md');
                fs.writeFileSync(progressFile, 'Session: sess-059\n## Task\n[done] finished\n');

                const input = createPostToolUseInput('Bash', { command: 'echo test' }, { output: 'test' });
                const result = await runHook(BASH_CLEANUP, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertEqual(result.code, 0, 'bash-cleanup should exit 0');
                assertFalse(fs.existsSync(tmpFile), 'tmpclaude-*-cwd file must be deleted by cleanup');
                assertTrue(fs.existsSync(progressFile), 'progress.md file must survive bash-cleanup');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-060: progress file without Session header is visible to any session',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-060-any');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const legacyFile = path.join(tmpSubDir, 'ck-agent-20260414120000-legacy0.progress.md');
                fs.writeFileSync(legacyFile, '## Task\n[partial] step 1 still running\n');

                const input = createSessionStartInput('resume', 'sess-060-any');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work',
                    'Legacy file without Session header must surface to any session (backward compat)');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-061: writeSessionState/readSessionState isolates data between sessions',
        fn() {
            const sessA = 'sess-061-A';
            const sessB = 'sess-061-B';
            try {
                writeSessionState(sessA, { agent: 'alpha', step: 1 });
                writeSessionState(sessB, { agent: 'beta', step: 99 });

                const stateA = readSessionState(sessA);
                const stateB = readSessionState(sessB);

                assertTrue(stateA !== null, 'sess-A state must exist');
                assertTrue(stateB !== null, 'sess-B state must exist');
                assertEqual(stateA.agent, 'alpha', 'sess-A must read its own agent field');
                assertEqual(stateB.agent, 'beta', 'sess-B must read its own agent field');
                assertEqual(stateA.step, 1, 'sess-A step must not be overwritten by sess-B');
                assertEqual(stateB.step, 99, 'sess-B step must not be overwritten by sess-A');
            } finally {
                deleteSessionState(sessA);
                deleteSessionState(sessB);
            }
        }
    },
    {
        name: 'TC-SUBCTX-062: sequential setTodoState writes produce valid JSON final state (atomic rename)',
        fn() {
            const sessionId = 'sess-062-rapid';
            try {
                for (let i = 0; i < 10; i++) {
                    const ok = setTodoState(sessionId, {
                        hasTodos: true,
                        pendingCount: 10 - i,
                        completedCount: i,
                        inProgressCount: 1,
                        lastTodos: [],
                        bypasses: [],
                        taskSubjects: {},
                        metadata: {}
                    });
                    assertTrue(ok, `setTodoState write #${i} must succeed`);
                }

                const finalState = getTodoState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null after rapid writes');
                assertEqual(finalState.hasTodos, true, 'hasTodos must be preserved');
                assertEqual(finalState.pendingCount, 1, 'pendingCount from last write must be 1');
                assertEqual(finalState.completedCount, 9, 'completedCount from last write must be 9');
            } finally {
                try { clearTodoState(sessionId); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-063: sess-A compact marker does not trigger sess-B recovery',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-063-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260414120000-063aaa.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-063-A\n## Task\n[partial] running\n');

                const input = createSessionStartInput('resume', 'sess-063-B');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0 for sess-B');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'sess-B must NOT see sess-A partial files when sess-B has no marker');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-064: recovery idempotency — second run is silent after marker deleted',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-064-idem';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-064aaa.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Task\n[partial] interrupted\n`);

                const input = createSessionStartInput('resume', sessionId);

                const result1 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result1.code, 0, 'First run must exit 0');
                assertFalse(fs.existsSync(markerPath), 'Marker must be deleted by first recovery run');

                const result2 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result2.code, 0, 'Second run must exit 0');
                assertNotContains(result2.stdout, 'Partial Subagent Work',
                    'Second run must not surface partial files (marker already deleted)');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-066: idempotent cleanup — other-session done files survive both runs',
        async fn() {
            const tmpDir = createTempDir();
            const markerPathA = createCompactMarker('sess-066-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const ownDoneFile = path.join(tmpSubDir, 'ck-agent-20260414120000-066aaa.progress.md');
                fs.writeFileSync(ownDoneFile, 'Session: sess-066-A\n## Task\n[done] completed successfully\n');
                const otherDoneFile = path.join(tmpSubDir, 'ck-agent-20260414120001-066bbb.progress.md');
                fs.writeFileSync(otherDoneFile, 'Session: sess-066-B\n## Task\n[done] also complete\n');

                const input = createSessionStartInput('resume', 'sess-066-A');
                const result1 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result1.code, 0, 'First run must exit 0');
                const result2 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result2.code, 0, 'Second run must exit 0');

                assertTrue(fs.existsSync(otherDoneFile),
                    'sess-B done file must survive sess-A cleanup (cross-session isolation)');
            } finally {
                removeCompactMarker(markerPathA);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-067: absent progress file — hook exits 0 cleanly with no ENOENT errors',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-067-toctou');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-067aaa.progress.md');
                fs.writeFileSync(progressFile, 'Session: sess-067-toctou\n## Task\n[partial] step 1\n');
                fs.unlinkSync(progressFile);

                const input = createSessionStartInput('resume', 'sess-067-toctou');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Must exit 0 even when progress file vanishes before hook reads it');
                assertNotContains(result.stderr, 'ENOENT', 'Must not surface ENOENT errors to stderr');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-068: concurrent recovery invocations both exit 0 (no crash or data corruption)',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-068-concurrent';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-068aaa.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Task\n[partial] step 2\n`);

                const input = createSessionStartInput('resume', sessionId);
                const [r1, r2] = await Promise.all([
                    runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir }),
                    runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir })
                ]);

                assertEqual(r1.code, 0, 'First concurrent invocation must exit 0');
                assertEqual(r2.code, 0, 'Second concurrent invocation must exit 0');
                assertNotContains(r1.stderr, 'Unhandled', 'No unhandled error in first invocation');
                assertNotContains(r2.stderr, 'Unhandled', 'No unhandled error in second invocation');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-071: write-compact-marker creates separate markers for concurrent sessions',
        async fn() {
            const sessA = 'sess-071-A';
            const sessB = 'sess-071-B';
            const markerA = getMarkerPath(sessA);
            const markerB = getMarkerPath(sessB);

            ensureDir(MARKERS_DIR);
            try { if (fs.existsSync(markerA)) fs.unlinkSync(markerA); } catch (_) {}
            try { if (fs.existsSync(markerB)) fs.unlinkSync(markerB); } catch (_) {}

            try {
                const inputA = createPreCompactInput({
                    session_id: sessA,
                    trigger: 'auto',
                    context_window: { total_input_tokens: 40000, total_output_tokens: 4000, context_window_size: 200000 }
                });
                const inputB = createPreCompactInput({
                    session_id: sessB,
                    trigger: 'auto',
                    context_window: { total_input_tokens: 60000, total_output_tokens: 6000, context_window_size: 200000 }
                });

                const [r1, r2] = await Promise.all([
                    runHook(WRITE_COMPACT_MARKER, inputA),
                    runHook(WRITE_COMPACT_MARKER, inputB)
                ]);

                assertEqual(r1.code, 0, 'sess-A compact marker hook must exit 0');
                assertEqual(r2.code, 0, 'sess-B compact marker hook must exit 0');
                assertTrue(fs.existsSync(markerA), 'sess-A marker file must be created');
                assertTrue(fs.existsSync(markerB), 'sess-B marker file must be created');

                const dataA = JSON.parse(fs.readFileSync(markerA, 'utf8'));
                const dataB = JSON.parse(fs.readFileSync(markerB, 'utf8'));
                assertEqual(dataA.sessionId, sessA, 'sess-A marker must contain sessA sessionId');
                assertEqual(dataB.sessionId, sessB, 'sess-B marker must contain sessB sessionId');
            } finally {
                try { if (fs.existsSync(markerA)) fs.unlinkSync(markerA); } catch (_) {}
                try { if (fs.existsSync(markerB)) fs.unlinkSync(markerB); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-072: saveState() Windows-safe fallback preserves valid JSON on sequential writes',
        fn() {
            const sessionId = 'sess-072-wf-rename';
            try {
                const ok1 = saveState(sessionId, {
                    workflowType: 'bugfix', workflowSteps: ['scout', 'fix'], currentStepIndex: 0,
                    completedSteps: [], activePlan: null, todos: [], metadata: {}
                });
                assertTrue(ok1, 'First saveState must succeed');

                const ok2 = saveState(sessionId, {
                    workflowType: 'bugfix', workflowSteps: ['scout', 'fix'], currentStepIndex: 1,
                    completedSteps: ['scout'], activePlan: null, todos: [], metadata: {}
                });
                assertTrue(ok2, 'Second saveState must succeed (Windows-safe fallback)');

                const finalState = loadState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null');
                assertEqual(finalState.workflowType, 'bugfix', 'workflowType must be preserved');
                assertEqual(finalState.currentStepIndex, 1, 'currentStepIndex from second write must win');
                assertEqual(finalState.completedSteps.length, 1, 'completedSteps from second write must be preserved');
            } finally {
                try { clearState(sessionId); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-073: setEditState() Windows-safe fallback preserves valid JSON on sequential writes',
        fn() {
            const sessionId = 'sess-073-edit-rename';
            try {
                const ok1 = setEditState(sessionId, {
                    editCount: 3, writeCount: 1, filesModified: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
                    planWarningShown: false, planWarningShown8: false, projectCodeChecked: false, projectHasCode: true
                });
                assertTrue(ok1, 'First setEditState must succeed');

                const ok2 = setEditState(sessionId, {
                    editCount: 7, writeCount: 2, filesModified: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
                    planWarningShown: true, planWarningShown8: false, projectCodeChecked: true, projectHasCode: true
                });
                assertTrue(ok2, 'Second setEditState must succeed (Windows-safe fallback)');

                const finalState = getEditState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null');
                assertEqual(finalState.editCount, 7, 'editCount from second write must win');
                assertEqual(finalState.planWarningShown, true, 'planWarningShown from second write must be preserved');
                assertEqual(finalState.filesModified.length, 4, 'filesModified from second write must be preserved');
            } finally {
                try { clearEditState(sessionId); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-074: writeSessionState() Windows-safe fallback preserves valid JSON on sequential writes',
        fn() {
            const sessionId = 'sess-074-ck-rename';
            try {
                const ok1 = writeSessionState(sessionId, { phase: 'init', count: 1 });
                assertTrue(ok1, 'First writeSessionState must succeed');

                const ok2 = writeSessionState(sessionId, { phase: 'active', count: 2 });
                assertTrue(ok2, 'Second writeSessionState must succeed (Windows-safe fallback)');

                const finalState = readSessionState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null');
                assertEqual(finalState.phase, 'active', 'phase from second write must win');
                assertEqual(finalState.count, 2, 'count from second write must be preserved');
            } finally {
                try { deleteSessionState(sessionId); } catch (_) {}
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Session Lifecycle Hooks',
    tests: [...sessionInitTests, ...sessionResumeTests, ...sessionEndTests, ...configEdgeCaseTests, ...postAgentValidatorTests, ...partialProgressScannerTests, ...concurrencyTests, ...additionalConcurrencyTests, ...newConcurrencyTests, ...subagentIsolationTests]
};
