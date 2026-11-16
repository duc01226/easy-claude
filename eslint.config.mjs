// ESLint for the easy-claude framework repository (flat config).
//
// Existing violations are frozen in `eslint-suppressions.json` (ESLint bulk suppressions): new code
// must be clean, and the baseline may only shrink. After fixing suppressed violations, run
// `npx eslint . --prune-suppressions` so they cannot come back. Never add entries by hand; a new
// rule is introduced with `npx eslint . --suppress-rule <rule>` in the same change.
//
// Run locally exactly as CI does: `npx eslint .` (the pre-commit hook lints staged files).
import js from '@eslint/js';
import globals from 'globals';

// `.claude/hooks/lib` is shared by the hooks; it must never depend on a top-level hook
// (dependency direction: hooks -> lib, never lib -> hooks). From a file directly in lib, `../<name>`
// is a hook; from one folder deeper (lib/__tests__), `../../<name>` is.
const TOP_LEVEL_HOOK = '/^\\.\\.\\/[^/]+$/';
const TOP_LEVEL_HOOK_FROM_SUBFOLDER = '/^\\.\\.\\/\\.\\.\\/[^/]+$/';
// String.replace treats `$&`, `$'`, `$1` in a string replacement as patterns, so a replacement read from a
// file or built at run time can silently splice the text. Only a string literal (no surprises) or a
// function (its return value is used as-is) is allowed.
const UNSAFE_REPLACE = {
    selector:
        "CallExpression[callee.property.name=/^replace(All)?$/][arguments.length=2]:not([arguments.1.type=/^(Literal|ArrowFunctionExpression|FunctionExpression)$/]):not([arguments.1.type='TemplateLiteral'][arguments.1.expressions.length=0])",
    message:
        'Pass the replacement as a function, e.g. s.replace(target, () => text): a "$" in a string replacement is read as a pattern and can splice the text.'
};
const boundaryRule = pattern => [
    'error',
    UNSAFE_REPLACE,
    { selector: `CallExpression[callee.name='require'] > Literal.arguments[value=${pattern}]`, message: HOOK_LIB_BOUNDARY },
    { selector: `ImportDeclaration > Literal.source[value=${pattern}]`, message: HOOK_LIB_BOUNDARY },
    { selector: `ImportExpression > Literal.source[value=${pattern}]`, message: HOOK_LIB_BOUNDARY }
];
const HOOK_LIB_BOUNDARY = 'A .claude/hooks/lib module must not import a top-level hook: move the shared code into lib instead.';

export default [
    {
        // Generated mirrors are owned by the sync pipeline; local-only and dependency folders are not source.
        ignores: [
            '.agents/**',
            '.codex/**',
            '.opencode/**',
            '**/node_modules/**',
            'tmp/**',
            'temp/**',
            'plans/**',
            'team-artifacts/**',
            'dist/**',
            'coverage/**',
            // Ignored by .claude/.gitignore: nested agent checkouts, local state and Python venvs.
            '.claude/worktrees/**',
            '.claude/agent-memory/**',
            '.claude/agent-memory-local/**',
            '.claude/tmp/**',
            '**/.venv/**'
        ]
    },
    js.configs.recommended,
    {
        linterOptions: { reportUnusedDisableDirectives: 'error' },
        rules: {
            // Catch real defects; formatting belongs to prettier.
            eqeqeq: ['error', 'smart'], // loose equality coerces types silently (null checks stay allowed)
            'no-var': 'error', // function-scoped var leaks across blocks
            'prefer-const': 'error', // a binding that never changes should say so
            'no-throw-literal': 'error' // throwing non-Errors loses the stack trace
        }
    },
    {
        files: ['**/*.cjs'],
        languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } }
    },
    {
        files: ['**/*.mjs'],
        languageOptions: { sourceType: 'module', globals: { ...globals.node } }
    },
    {
        files: ['.claude/hooks/tests/**/*.js'],
        languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } }
    },
    {
        files: ['.claude/skills/task-track/assets/**/*.js'],
        languageOptions: { sourceType: 'script', globals: { ...globals.browser } }
    },
    {
        files: ['.claude/**/*.{cjs,mjs,js}'],
        rules: { 'no-restricted-syntax': ['error', UNSAFE_REPLACE] }
    },
    {
        // Skills that drive a browser pass functions to it (Playwright page.evaluate and similar); those
        // bodies run in the page, so these folders get browser globals beside Node's. Trade-off: a
        // browser global used by mistake in Node code here is not reported.
        files: ['.claude/skills/{html-export,pdf-convert,docx-convert,ui-design,task-track}/**/*.{cjs,mjs}'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } }
    },
    {
        // These converter tests run on a small in-folder runner that installs its globals (test-framework.cjs).
        files: ['.claude/skills/{pdf-convert,docx-convert}/**/tests/**/*.cjs'],
        languageOptions: { globals: { describe: 'readonly', it: 'readonly', assert: 'readonly', runAllTests: 'readonly' } }
    },
    {
        files: ['.claude/hooks/lib/*.{cjs,mjs,js}'],
        rules: { 'no-restricted-syntax': boundaryRule(TOP_LEVEL_HOOK) }
    },
    {
        files: ['.claude/hooks/lib/*/*.{cjs,mjs,js}'],
        rules: { 'no-restricted-syntax': boundaryRule(TOP_LEVEL_HOOK_FROM_SUBFOLDER) }
    }
];
