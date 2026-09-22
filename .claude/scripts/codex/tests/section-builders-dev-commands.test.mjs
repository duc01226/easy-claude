import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Locks section-builder contracts. The functions used to `return null` the moment
// `testing.commands` was empty — silently dropping a configured `testing.commandsNote` even though
// the note is config-sourced SPECIFICALLY to survive every `--mode update` regeneration. These tests
// pin the fix: the note renders independently of the command block, so a note-only config still emits.

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const { buildDevCommands, buildE2eTesting } = require(
  path.join(repoRoot, ".claude", "skills", "ai-context-refresh", "scripts", "section-builders.cjs")
);

const NOTE = "**Platform (Windows):** invoke Python via `py -3` — NEVER `python3`.";

test("SB-DC-001 renders a configured commandsNote even when commands is empty (the dropped-note bug)", () => {
  const out = buildDevCommands({ testing: { commands: {}, commandsNote: NOTE } });
  assert.equal(out, NOTE, "note must survive an empty commands map, not be swallowed by an early return");
});

test("SB-DC-002 renders the note when commands is entirely absent", () => {
  const out = buildDevCommands({ testing: { commandsNote: NOTE } });
  assert.equal(out, NOTE);
});

test("SB-DC-003 appends the note below the command block when both are present", () => {
  const out = buildDevCommands({ testing: { commands: { all: "node test" }, commandsNote: NOTE } });
  assert.match(out, /^```bash\nnode test\s+# all\n```\n\n/, "command block first");
  assert.ok(out.endsWith("\n\n" + NOTE), "note appended after a blank line");
});

test("SB-DC-004 returns null only when BOTH commands and note are absent", () => {
  assert.equal(buildDevCommands({ testing: {} }), null);
  assert.equal(buildDevCommands({}), null);
  assert.equal(buildDevCommands({ testing: { commandsNote: "   " } }), null, "whitespace-only note is not content");
});

test("SB-DC-005 still emits the command block alone when no note is configured", () => {
  const out = buildDevCommands({ testing: { commands: { all: "node test" } } });
  assert.equal(out, "```bash\nnode test" + " ".repeat(45 - "node test".length) + " # all\n```");
});

test("SB-DC-006 describes E2E references without requiring a page-object model", () => {
  const out = buildE2eTesting({ e2eTesting: { guideDoc: "docs/project-reference/e2e-test-reference.md" } });
  assert.match(out, /test organization/);
  assert.doesNotMatch(out, /page objects/i);
});
