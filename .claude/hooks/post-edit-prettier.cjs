#!/usr/bin/env node
/**
 * Post-Edit Prettier Hook - Automatically formats files after Edit/Write operations
 *
 * Fires: PostToolUse for Edit and Write tools
 * Purpose: Run Prettier on edited/written files to maintain consistent formatting
 *
 * Features:
 *   - Supports common web development file types
 *   - Skips generated/dependency directories
 *   - Auto-discovers Prettier config by walking up directory tree
 *   - Non-blocking: failures are silently ignored (10s timeout)
 *   - Cross-platform: Windows and Unix compatible
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SUPPORTED_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.jsonc',
    '.scss',
    '.css',
    '.less',
    '.html',
    '.htm',
    '.md',
    '.mdx',
    '.yaml',
    '.yml',
    '.graphql',
    '.gql'
]);

const SKIP_PATTERNS = [
    /node_modules/,
    /\.git\//,
    /dist\//,
    /build\//,
    /obj\//,
    /bin\//,
    /\.next\//,
    /\.nuxt\//,
    /coverage\//,
    /\.angular\//,
    /\.cache\//,
    /\.output\//,
    /\.vercel\//,
    /[/\\]\.claude[/\\]/
];

const PRETTIER_CONFIG_FILES = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.yml',
    '.prettierrc.yaml',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.mjs',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs'
];

const TIMEOUT_MS = 10000; // 10 seconds
const PROCESS_KILL_GRACE_MS = 2000;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a file extension is supported by Prettier
 */
function isSupportedExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Check if file path matches any skip pattern
 */
function shouldSkipPath(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return SKIP_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

/**
 * Find Prettier binary (local node_modules or npx fallback)
 */
function findPrettierBinary(fileDir) {
    let currentDir = fileDir;
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const isWindows = process.platform === 'win32';
        const prettierBin = isWindows
            ? path.join(currentDir, 'node_modules', '.bin', 'prettier.cmd')
            : path.join(currentDir, 'node_modules', '.bin', 'prettier');

        if (fs.existsSync(prettierBin)) {
            return prettierBin;
        }

        currentDir = path.dirname(currentDir);
    }

    return null;
}

/**
 * Terminate a formatter process and all descendants.
 *
 * `.cmd` formatters run through a Windows shell, so killing the direct child
 * alone can leave npx/Prettier descendants holding the edited project open.
 */
function terminateProcessTree(child) {
    if (!child.pid) return Promise.resolve();

    if (process.platform !== 'win32') {
        if (!child.killed) child.kill('SIGTERM');
        return Promise.resolve();
    }

    return new Promise(resolve => {
        execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, error => {
            if (error && !child.killed) child.kill('SIGTERM');
            resolve();
        });
    });
}

/**
 * Run Prettier on a file with timeout.
 */
function runPrettier(filePath, prettierBin) {
    return new Promise(resolve => {
        const isWindows = process.platform === 'win32';
        const args = ['--write', '--ignore-unknown', filePath];

        let command, spawnArgs;

        if (prettierBin) {
            command = prettierBin;
            spawnArgs = args;
        } else {
            command = isWindows ? 'npx.cmd' : 'npx';
            spawnArgs = ['prettier', ...args];
        }

        const child = spawn(command, spawnArgs, {
            stdio: ['ignore', 'ignore', 'ignore'],
            windowsHide: true,
            shell: isWindows
        });

        let settled = false;
        let timedOut = false;
        let timeoutId;
        let killGraceId;

        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            clearTimeout(killGraceId);
            resolve(result);
        };

        const timeout = () => {
            timedOut = true;
            terminateProcessTree(child).then(() => {
                if (settled) return;

                // Prefer the close event so the promise represents the full
                // child lifecycle. The bounded fallback prevents a broken
                // platform command from hanging the hook forever.
                if (child.exitCode !== null || child.signalCode !== null) {
                    finish(false);
                    return;
                }

                killGraceId = setTimeout(() => finish(false), PROCESS_KILL_GRACE_MS);
            });
        };

        timeoutId = setTimeout(timeout, TIMEOUT_MS);

        child.once('close', code => finish(!timedOut && code === 0));
        child.once('error', () => finish(false));
    });
}

/**
 * Extract file path from tool input
 */
function extractFilePath(payload) {
    const toolInput = payload.tool_input;
    if (!toolInput) return null;

    let input = toolInput;
    if (typeof toolInput === 'string') {
        try {
            input = JSON.parse(toolInput);
        } catch (e) {
            return null;
        }
    }

    return input.file_path || input.path || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // Only process Edit and Write tools
        const toolName = payload.tool_name;
        if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        // Only process successful tool calls
        if (payload.tool_error) {
            process.exit(0);
        }

        // Extract file path
        const filePath = extractFilePath(payload);
        if (!filePath) {
            process.exit(0);
        }

        // Resolve to absolute path
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
            process.exit(0);
        }

        // Check if extension is supported
        if (!isSupportedExtension(absolutePath)) {
            process.exit(0);
        }

        // Check if path should be skipped
        if (shouldSkipPath(absolutePath)) {
            process.exit(0);
        }

        // Find Prettier binary
        const fileDir = path.dirname(absolutePath);
        const prettierBin = findPrettierBinary(fileDir);

        // Run Prettier (non-blocking, ignore result)
        await runPrettier(absolutePath, prettierBin);

        return;
    } catch (error) {
        // Fail silently - formatting is non-critical
        process.exit(0);
    }
}

main();
