'use strict';

/**
 * Legacy compatibility wrapper for old prompt-injection helpers.
 *
 * Active context carriers are static: CLAUDE.md, AGENTS.md, Codex, skills, and agents.
 * Protocol text is owned by .claude/skills/shared/sync-inline-versions.md and composed by
 * .claude/scripts/lib/hookless-prompt-protocol.cjs. This file intentionally keeps no protocol
 * body copies; tests and any legacy caller read through the shared hookless source.
 */

const fs = require('fs');
const path = require('path');
const {
    LESSONS: LESSONS_MARKER,
    LESSON_LEARNED: LESSON_LEARNED_MARKER,
    WORKFLOW_PROTOCOL: WORKFLOW_PROTOCOL_MARKER,
    CRITICAL_THINKING: CRITICAL_THINKING_MARKER,
    AI_MISTAKE_PREVENTION: AI_MISTAKE_PREVENTION_MARKER,
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./dedup-constants.cjs');
const {
    buildCanonicalProtocolText,
    buildLessonLearnedReminderText,
    buildPortabilityBoundary,
    buildWorkflowProtocolText
} = require('../../scripts/lib/hookless-prompt-protocol.cjs');
const { isWorkflowAutoDetectEnabled } = require('../../scripts/lib/workflow-routing-config.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');

const PROJECT_DIR = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
const LESSONS_PATH = path.join(PROJECT_DIR, 'docs', 'project-reference', 'lessons.md');

function wasMarkerRecentlyInjected(transcriptPath, marker, bottomLines, topLines = TOP_DEDUP_LINES, preloadedLines = null) {
    try {
        let allLines;
        if (Array.isArray(preloadedLines)) {
            allLines = preloadedLines;
        } else {
            if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
            allLines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        }

        const bottomWindow = allLines.slice(-bottomLines).join('\n');
        const topWindow = allLines.slice(0, topLines).join('\n');
        return bottomWindow.includes(marker) || topWindow.includes(marker);
    } catch {
        return false;
    }
}

function injectLessons(transcriptPath, skipDedup = false, preloadedLines = null) {
    if (!fs.existsSync(LESSONS_PATH)) return null;
    const content = fs.readFileSync(LESSONS_PATH, 'utf-8').trim();
    if (!content.split('\n').some((line) => line.trim().startsWith('- ['))) return null;

    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, LESSONS_MARKER, DEDUP_LINES.LESSONS, TOP_DEDUP_LINES, preloadedLines)) {
        return null;
    }

    return `## Learned Lessons\n\n${content}`;
}

function injectCriticalContext(transcriptPath, skipDedup = false, preloadedLines = null) {
    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, CRITICAL_THINKING_MARKER, DEDUP_LINES.CRITICAL_THINKING, TOP_DEDUP_LINES, preloadedLines)) {
        return null;
    }

    return buildCanonicalProtocolText(PROJECT_DIR, 'critical-thinking-mindset:full');
}

function injectAiMistakePrevention(transcriptPath, skipDedup = false, preloadedLines = null) {
    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, AI_MISTAKE_PREVENTION_MARKER, DEDUP_LINES.AI_MISTAKE_PREVENTION, TOP_DEDUP_LINES, preloadedLines)) {
        return null;
    }

    return buildCanonicalProtocolText(PROJECT_DIR, 'ai-mistake-prevention:full');
}

function injectLessonReminder(transcriptPath) {
    if (wasMarkerRecentlyInjected(transcriptPath, LESSON_LEARNED_MARKER, DEDUP_LINES.LESSON_LEARNED)) {
        return null;
    }

    return buildLessonLearnedReminderText();
}

function injectWorkflowProtocol(transcriptPath, portability = {}) {
    if (wasMarkerRecentlyInjected(transcriptPath, WORKFLOW_PROTOCOL_MARKER, DEDUP_LINES.WORKFLOW_PROTOCOL)) {
        return null;
    }

    // The runtime injection must honour the same routing switch as the static carriers.
    // Gating only CLAUDE.md would leave the hook re-injecting "match the prompt against the
    // workflow catalog" on every prompt — the mode would read as off and behave as on.
    //
    // This carrier writes NOTHING, so it resolves at the default 'effective' scope: the
    // developer's git-ignored local override applies here. It is the carrier that makes a
    // local-only disable actually work, because the tracked context files deliberately keep
    // the team's value.
    const enabled = isWorkflowAutoDetectEnabled({ rootDir: PROJECT_DIR });
    return buildWorkflowProtocolText(portability, {
        workflowAutoDetect: enabled,
        // Only claim to override the static router when one is actually still there. Asserting
        // it unconditionally would tell the model to ignore a gate that does not exist (when the
        // TEAM disabled routing and the tracked files were regenerated without it), which reads
        // as a contradiction and invites it to go looking for the missing block.
        staticRouterOverride: !enabled && staticRouterPresent()
    });
}

/**
 * Does a git-tracked context file still carry the workflow gate?
 * Checked by marker, not by prose, so a project that reworded the gate is still detected.
 * Unreadable files answer "no": claiming to override a router we could not find would be a
 * guess, and the disabled step already stands on its own without that sentence.
 */
function staticRouterPresent() {
    for (const file of ['CLAUDE.md', 'AGENTS.md']) {
        try {
            if (fs.readFileSync(path.join(PROJECT_DIR, file), 'utf-8').includes('<!-- CK:WORKFLOW-GATE -->')) {
                return true;
            }
        } catch {
            // Missing or unreadable — nothing to override from this one.
        }
    }
    return false;
}

module.exports = {
    injectLessons,
    injectCriticalContext,
    injectAiMistakePrevention,
    injectWorkflowProtocol,
    injectLessonReminder,
    buildPortabilityBoundary,
    wasMarkerRecentlyInjected
};
