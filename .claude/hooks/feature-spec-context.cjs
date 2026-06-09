#!/usr/bin/env node
/**
 * Feature Spec Context Injector Hook
 *
 * Detects writes to docs/specs/** and injects the tech-free
 * 8-section format reminder, mandatory fields, and TC naming conventions.
 *
 * @trigger PreToolUse (Write, Edit)
 * @injects Feature doc format requirements, TC naming, Section 8 canonical source
 *
 * Input: JSON via stdin with tool_name, tool_input
 * Output: Context string via stdout
 * Exit: 0 (non-blocking)
 */

const fs = require('fs');
const { normalizePathForComparison } = require('./lib/ck-path-utils.cjs');
const { getSpecDocsPath } = require('./lib/project-config-loader.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FEATURE_DOCS_PATH = getSpecDocsPath();

const FEATURE_DOCS_CONTEXT = `
## Feature Docs Context (auto-injected)

**Format:** Tech-free 8-section Feature Spec. Activate \`/feature-spec\` skill before editing.

**Read first:** \`docs/project-reference/feature-spec-reference.md\`, \`docs/project-reference/spec-system-reference.md\`, and \`docs/project-reference/spec-principles.md\`. For behavior/public-contract changes, also read \`docs/project-reference/workflow-spec-test-code-cycle-reference.md\`.

**8 sections (exact order):** 1. Overview · 2. Glossary · 3. User Stories & Acceptance Criteria · 4. Business Rules · 5. Domain Model · 6. Process Flows · 7. Permissions & Roles · 8. Test Specifications — then a trailing Change History. No technical sections (Commands/Events/API/Cross-Service/Performance/Troubleshooting) — code is the technical source of truth.

**Mandatory:**
- §1-7 prose is STRICTLY tech-free — no framework/product/language/persistence/messaging/auth names (banned tokens → \`spec-principles.md\` §3.2). Technical identifiers live ONLY in evidence carriers.
- Section 5 (Domain Model): Mermaid ERD + \`[Source: component/{service}/{id}]\` abstract anchor per entity (cannot be omitted)
- Section 4 (Business Rules): \`[Source: rule/{service}/{id}]\` abstract anchor per rule group
- Section 8 (Test Specifications): canonical TC source — TC-{FEATURE}-{NNN} IDs, each carrying a hidden \`[Source: namespace/service/id]\` carrier + an \`IntegrationTest:\` field

**Rules:**
- TC IDs live in Section 8 only — never authored in \`docs/specs/\` directly
- Section 8 owned exclusively by \`/spec-tests\`; feature-spec populates it only during INIT
- Size caps: body (sections 1-7) ≤1200 lines, whole file ≤1800 (hard). Split the capability when body>1200 OR TCs>40
- Change History entry required for every functional change (trailing section)
`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const toolName = payload.tool_name || '';
        const toolInput = payload.tool_input || {};

        if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        const filePath = toolInput.file_path || toolInput.path || '';
        if (!filePath) process.exit(0);

        const normalizedPath = normalizePathForComparison(filePath);
        if (!normalizedPath.includes(FEATURE_DOCS_PATH.toLowerCase())) {
            process.exit(0);
        }

        console.log(FEATURE_DOCS_CONTEXT);
        process.exit(0);
    } catch (error) {
        process.exit(0);
    }
}

main();
