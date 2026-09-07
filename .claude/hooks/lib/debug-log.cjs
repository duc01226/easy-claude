/**
 * Debug logging utility for Claude hooks
 *
 * Provides consistent debug output controlled by CK_DEBUG environment variable.
 * All debug messages are sent to stderr to avoid interfering with hook output.
 *
 * @example
 * const { debug, debugJson } = require('./lib/debug-log.cjs');
 * debug('hook-name', 'Processing started');
 * debugJson('hook-name', 'Event data', eventData);
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const isDebugEnabled = () => process.env.CK_DEBUG === '1' || process.env.CK_DEBUG === 'true';
const isHookDebugEnabled = () => process.env.CLAUDE_HOOK_DEBUG === '1' || process.env.CLAUDE_HOOK_DEBUG === 'true';
const HOOK_DEBUG_MAX_BYTES = 1024 * 1024;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Write a diagnostic without ever using stdout. The second fallback is only
 * for an already-broken stderr stream; there is no reliable process-local
 * channel beyond it.
 */
function writeDiagnostic(context, message) {
  const line = `[${context}] ${message}\n`;
  try {
    process.stderr.write(line);
  } catch (stderrError) {
    try {
      console.error(line.trim());
    } catch (consoleError) {
      // The host closed both diagnostic streams. Do not throw from logging.
    }
  }
}

/**
 * Log debug message to stderr if CK_DEBUG is enabled
 * @param {string} context - Hook or module name for prefix
 * @param {...any} args - Values to log
 */
function debug(context, ...args) {
  if (isDebugEnabled()) {
    console.error(`[${context}]`, ...args);
  }
}

/**
 * Log debug message with JSON-formatted data
 * @param {string} context - Hook or module name for prefix
 * @param {string} label - Description of the data
 * @param {any} data - Data to stringify
 */
function debugJson(context, label, data) {
  if (isDebugEnabled()) {
    try {
      console.error(`[${context}] ${label}:`, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`[${context}] ${label}: [unserializable]`);
    }
  }
}

/**
 * Log error with context, always outputs regardless of debug flag
 * Use for actual errors that should always be visible
 * @param {string} context - Hook or module name for prefix
 * @param {Error|string} error - Error to log
 */
function logError(context, error) {
  writeDiagnostic(context, `ERROR: ${errorMessage(error)}`);
}

/**
 * Log error only if debug mode is enabled (for non-critical errors)
 * @param {string} context - Hook or module name for prefix
 * @param {Error|string} error - Error to log
 */
function debugError(context, error) {
  if (isDebugEnabled()) {
    const message = errorMessage(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${context}] ERROR: ${message}`);
    if (stack) console.error(stack);
  }
}

/**
 * Record one PreToolUse decision when the opt-in hook diagnostics switch is on.
 * The record deliberately excludes command/path contents: it is for lifecycle
 * diagnosis, not a second transcript. The file is bounded and rotates once.
 *
 * @param {string} context
 * @param {{code?: number, decision?: string, durationMs?: number, toolName?: string, eventName?: string, error?: Error|string}} details
 */
function recordHookDecision(context, details = {}) {
  if (!isHookDebugEnabled()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    hook: context,
    event: details.eventName || 'PreToolUse',
    tool: details.toolName || 'unknown',
    decision: details.decision || (details.code === 2 ? 'block' : 'allow'),
    code: details.code ?? 0,
    durationMs: Math.max(0, Number(details.durationMs) || 0)
  };
  if (details.error) {
    entry.error = {
      name: details.error instanceof Error ? details.error.name : 'Error',
      // Error messages often contain absolute config paths or command text.
      // The opt-in file is deliberately a lifecycle trace, not a transcript.
      code: typeof details.error?.code === 'string' ? details.error.code : 'HOOK_ERROR'
    };
  }

  const line = `${JSON.stringify(entry)}\n`;
  const logPath = process.env.CLAUDE_HOOK_DEBUG_LOG ||
    path.join(os.tmpdir(), 'ck', 'debug', 'bash-hooks.log');

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    if (fs.existsSync(logPath)) {
      const stat = fs.statSync(logPath);
      if (stat.isFile() && stat.size + Buffer.byteLength(line) > HOOK_DEBUG_MAX_BYTES) {
        const backup = `${logPath}.1`;
        try {
          if (fs.existsSync(backup)) fs.unlinkSync(backup);
          fs.renameSync(logPath, backup);
        } catch (rotateError) {
          writeDiagnostic(context, `CLAUDE_HOOK_DEBUG rotation failed: ${errorMessage(rotateError)}`);
          // A failed rename must not turn a bounded diagnostic sink into an
          // unbounded append-only file. Start a fresh active file instead.
          fs.writeFileSync(logPath, '', 'utf8');
        }
      }
    }
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (error) {
    // A failed diagnostic sink must itself be visible and must never alter the
    // hook's policy decision or write a misleading stdout record.
    writeDiagnostic(context, `CLAUDE_HOOK_DEBUG log failure: ${errorMessage(error)}`);
  }
}

/**
 * Record an internal best-effort failure while retaining the caller's policy.
 * This is used by advisory hooks for expected fail-open branches.
 */
function reportHookInternalError(context, label, error) {
  writeDiagnostic(context, `${label}: ${errorMessage(error)}`);
}

module.exports = {
  debug,
  debugJson,
  debugError,
  logError,
  isDebugEnabled,
  isHookDebugEnabled,
  recordHookDecision,
  reportHookInternalError
};
