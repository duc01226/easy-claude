'use strict';

/**
 * Legacy compatibility wrapper for old prompt-injection helpers.
 *
 * Static quality protocol text is owned by `.claude/skills/shared/sync-inline-versions.md`.
 * Automatic workflow routing has a dedicated default-on hook (`workflow-route-inject.cjs`) with
 * session-aware delivery; it is intentionally absent from this line-window legacy wrapper.
 */

const fs = require('fs');
const path = require('path');
const {
    LESSONS: LESSONS_MARKER,
    LESSON_LEARNED: LESSON_LEARNED_MARKER,
    CRITICAL_THINKING: CRITICAL_THINKING_MARKER,
    AI_MISTAKE_PREVENTION: AI_MISTAKE_PREVENTION_MARKER,
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./dedup-constants.cjs');
const {
    buildCanonicalProtocolText,
    buildLessonLearnedReminderText,
    buildPortabilityBoundary
} = require('../../scripts/lib/hookless-prompt-protocol.cjs');
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

module.exports = {
    injectLessons,
    injectCriticalContext,
    injectAiMistakePrevention,
    injectLessonReminder,
    buildPortabilityBoundary,
    wasMarkerRecentlyInjected
};
