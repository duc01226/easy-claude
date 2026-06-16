import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// PRESENCE GUARD (F): copilot-instructions.md must carry the critical-thinking protocol at BOTH
// ends — the "(Always-On)" reachability section near the top (primacy) and the "Recency Anchor"
// at EOF (recency). These are baked from the canonical SYNC source in generateProjectSpecificFile;
// nothing else asserted their presence, so a regression that dropped either anchor would ship
// silently. Bridge to the .cjs generator via createRequire (same interop the repo uses); the
// generator guards main() behind require.main === module, so requiring it triggers no real sync.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const generatorPath = path.resolve(thisDir, '..', 'sync-copilot-workflows.cjs');
const { generateProjectSpecificFile, loadCopilotRegistry, loadProjectConfig } = require(generatorPath);

function renderCopilotInstructions() {
    const { registry, projectInstructions } = loadCopilotRegistry();
    const projectConfig = loadProjectConfig();
    return generateProjectSpecificFile(registry, projectInstructions, projectConfig);
}

test('copilot-instructions bakes the Always-On critical-thinking reachability anchor', () => {
    const out = renderCopilotInstructions();
    assert.match(out, /## Critical Thinking & Anti-Hallucination \(Always-On\)/);
});

test('copilot-instructions bakes the EOF Recency Anchor', () => {
    const out = renderCopilotInstructions();
    assert.match(out, /## Critical Thinking — Recency Anchor/);
});

test('Always-On anchor precedes the Recency Anchor, which is the final section (primacy + recency)', () => {
    const out = renderCopilotInstructions();
    const alwaysOn = out.indexOf('## Critical Thinking & Anti-Hallucination (Always-On)');
    const recency = out.indexOf('## Critical Thinking — Recency Anchor');
    assert.ok(alwaysOn !== -1 && recency !== -1, 'both anchors must be present');
    assert.ok(alwaysOn < recency, 'Always-On anchor must come before the Recency Anchor');

    // Recency must be the LAST `## ` heading — a true end-of-document anchor.
    const headings = [...out.matchAll(/^## .+$/gm)].map((m) => m[0]);
    assert.equal(
        headings[headings.length - 1],
        '## Critical Thinking — Recency Anchor',
        'Recency Anchor must be the final ## heading'
    );
});
