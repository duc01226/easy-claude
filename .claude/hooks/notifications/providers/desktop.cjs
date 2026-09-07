/**
 * Desktop notification provider
 * Sends native OS notifications (Windows, macOS, Linux)
 *
 * Windows: Uses notify-windows.ps1 script for proper focus handling
 * macOS: Uses osascript for native notifications
 * Linux: Uses notify-send with zenity/kdialog fallbacks
 *
 * Enable with: ENABLE_DESKTOP_NOTIFICATIONS=true
 * Optional: DESKTOP_NOTIFICATION_SOUND=true (default: false)
 */
'use strict';

const { execFile } = require('child_process');
const os = require('os');
const path = require('path');

function runNotification(file, args, options) {
    return new Promise(resolve => {
        execFile(file, args, { shell: false, ...options }, err => {
            resolve({ success: !err, error: err?.message });
        });
    });
}

// Notification titles by event type
const TITLES = {
    Stop: 'Claude Code Complete',
    SubagentStop: 'Subagent Complete',
    AskUserPrompt: 'Claude Needs Input',
    AskUserQuestion: 'Claude Has a Question',
    idle_prompt: 'Claude Waiting for Input',
    permission_prompt: 'Claude Needs Permission',
    default: 'Claude Code'
};

// Notification messages by event type
const MESSAGES = {
    Stop: 'Session completed successfully',
    SubagentStop: 'Specialized agent finished',
    AskUserPrompt: 'Waiting for your input',
    AskUserQuestion: 'Claude is asking a question — please check and answer',
    idle_prompt: 'Claude is waiting for your input',
    permission_prompt: 'Claude is asking for tool permission',
    default: 'Event triggered'
};

/**
 * Get project name from cwd path
 * @param {string} cwd - Working directory path
 * @returns {string} Project name
 */
function getProjectName(cwd) {
    if (!cwd) return '';
    // Handle both / and \ path separators
    const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}

/**
 * Get notification content based on event
 * @param {Object} input - Hook input
 * @returns {{title: string, message: string}}
 */
function getNotificationContent(input) {
    // Check both hook_event_name and notification_type (idle_prompt uses notification_type)
    const eventType = input.notification_type || input.hook_event_name || 'default';
    const projectName = getProjectName(input.cwd);

    // Add project prefix to title
    const prefix = projectName ? `[${projectName}] ` : '';
    const title = prefix + (TITLES[eventType] || TITLES.default);

    let message = MESSAGES[eventType] || MESSAGES.default;

    // Add agent type for SubagentStop
    if (eventType === 'SubagentStop' && input.agent_type) {
        message = `${input.agent_type} agent finished its task`;
    }

    return { title, message };
}

/**
 * Send notification on Windows using PowerShell script
 * Script handles: BurntToast, TopMost dialogs, NotifyIcon fallback
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function notifyWindows(title, message, showDialog) {
    const scriptPath = path.resolve(__dirname, '..', '..', 'lib', 'notify-windows.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath,
        '-Title', title, '-Message', message];
    if (showDialog) args.push('-ShowDialog');

    // Wait for completion - dialogs block until user clicks, toasts complete quickly
    return runNotification('powershell', args, { windowsHide: true, timeout: showDialog ? 60000 : 5000 });
}

/**
 * Send notification on macOS using osascript
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function notifyMacOS(title, message, showDialog) {
    // Fixed program source receives notification content only through argv.
    const script = showDialog
        ? 'on run argv\ndisplay dialog (item 2 of argv) with title (item 1 of argv) buttons {"OK"} default button "OK"\nend run'
        : 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run';

    return runNotification('osascript', ['-e', script, '--', title, message], { timeout: showDialog ? 30000 : 3000 });
}

/**
 * Send notification on Linux using notify-send or zenity
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifyLinux(title, message, showDialog) {
    if (showDialog) {
        // Try zenity first (GTK), then kdialog (KDE)
        const deadline = Date.now() + 30000;
        const result = await runNotification('zenity', ['--info', `--title=${title}`, `--text=${message}`], { timeout: 30000 });
        if (result.success) return result;
        const remaining = deadline - Date.now();
        if (remaining <= 0) return result;
        return runNotification('kdialog', ['--msgbox', message, '--title', title], { timeout: remaining });
    }

    return runNotification('notify-send', ['--urgency=normal', '--expire-time=5000', '--', title, message], { timeout: 3000 });
}

/**
 * Send notification based on current platform
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendNotification(title, message, showDialog) {
    // Test mode: skip the real OS call. The router (notify.cjs) still exercises event
    // normalization, whitelist routing, and provider selection; only the blocking dialog /
    // toast exec is suppressed so the test runner cannot hang on a modal dialog.
    if (process.env.CLAUDE_HOOK_TEST_MODE === '1') {
        return { success: true, skipped: true };
    }

    const platform = os.platform();

    switch (platform) {
        case 'win32':
            return await notifyWindows(title, message, showDialog);
        case 'darwin':
            return notifyMacOS(title, message, showDialog);
        case 'linux':
            return notifyLinux(title, message, showDialog);
        default:
            return { success: false, error: `Unsupported platform: ${platform}` };
    }
}

module.exports = {
    name: 'desktop',

    /**
     * Check if desktop provider is enabled
     * Enabled by default for local notifications (no env vars required),
     * or can be explicitly enabled/disabled via ENABLE_DESKTOP_NOTIFICATIONS
     * @param {Object} env - Environment variables
     * @returns {boolean} True if enabled
     */
    isEnabled: env => {
        // Explicit disable check
        if (env.ENABLE_DESKTOP_NOTIFICATIONS === 'false') {
            return false;
        }
        // Enabled by default OR when explicitly set to true
        return env.ENABLE_DESKTOP_NOTIFICATIONS === 'true' || env.ENABLE_DESKTOP_NOTIFICATIONS === undefined || env.ENABLE_DESKTOP_NOTIFICATIONS === '';
    },

    /**
     * Send notification to desktop
     * For Stop/idle_prompt events: shows blocking dialog (user must click OK)
     * For other events: shows toast notification
     * @param {Object} input - Hook input (snake_case fields)
     * @param {Object} env - Environment variables
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    send: async (input, env) => {
        const { title, message } = getNotificationContent(input);
        const hookType = input.hook_event_name || 'default';
        const notificationType = input.notification_type;

        // Stop/AskUserQuestion/idle_prompt/AskUserPrompt/permission_prompt: show blocking dialog so user won't miss it
        const showDialog =
            hookType === 'Stop' ||
            hookType === 'AskUserQuestion' ||
            notificationType === 'idle_prompt' ||
            notificationType === 'AskUserPrompt' ||
            notificationType === 'permission_prompt';

        return sendNotification(title, message, showDialog);
    }
};
