import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncContextScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-context-workflows.mjs");

function runSync(cwd, ambient = process.env) {
  return execFileAsync(process.execPath, [syncContextScript], { cwd, env: { ...ambient, CLAUDE_PROJECT_DIR: cwd } });
}

test('sync-context fixture overrides a competing ambient root without touching it', async () => {
  const owner = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-context-isolation-'));
  const target = path.join(owner, 'target');
  const foreign = path.join(owner, 'foreign');
  try {
    for (const dir of [target, foreign]) {
      await fs.mkdir(path.join(dir, '.claude/skills/test'), { recursive: true });
      await fs.writeFile(path.join(dir, '.claude/skills/test/SKILL.md'), '---\nname: test\ndescription: fixture\n---\n');
      await fs.writeFile(path.join(dir, '.claude/workflows.json'), JSON.stringify({ workflows: {
        testing: { sequence: ['test'], preActions: { injectContext: 'Run fixture test.' } },
      } }));
    }
    await fs.mkdir(path.join(foreign, '.codex'));
    await fs.writeFile(path.join(foreign, '.codex/CODEX_CONTEXT.md'), 'foreign-context-sentinel');
    await fs.writeFile(path.join(foreign, 'AGENTS.md'), 'foreign-agent-sentinel');
    await runSync(target, { ...process.env, CLAUDE_PROJECT_DIR: foreign });
    assert.match(await fs.readFile(path.join(target, '.codex/CODEX_CONTEXT.md'), 'utf8'), /Run fixture test/);
    assert.match(await fs.readFile(path.join(target, 'AGENTS.md'), 'utf8'), /CODEX_CONTEXT\.md/);
    assert.equal(await fs.readFile(path.join(foreign, '.codex/CODEX_CONTEXT.md'), 'utf8'), 'foreign-context-sentinel');
    assert.equal(await fs.readFile(path.join(foreign, 'AGENTS.md'), 'utf8'), 'foreign-agent-sentinel');
    assert.deepEqual(await fs.readdir(path.join(foreign, '.codex')), ['CODEX_CONTEXT.md']);
  } finally {
    await fs.rm(owner, { recursive: true, force: true });
  }
});
const subagentAuthorizationSnippet =
  "Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.";
const projectReferenceGateHeading = "## Codex Project Reference Gate (Hook-Independent)";
const projectReferenceGateRequiredDocs = [
  "docs/project-config.json",
  "docs/project-reference/docs-index-reference.md",
  "docs/project-reference/lessons.md",
];
const require = createRequire(import.meta.url);
const workflowCatalog = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));

test("sync-context-workflows rejects a workflow without injectContext", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-missing-inject-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        { workflows: { testing: { name: "Testing", sequence: ["test"] } } },
        null,
        2
      ),
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await assert.rejects(
      runSync(tempRoot),
      /missing required non-empty preActions\.injectContext/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows mirrors subagent authorization into AGENTS.md", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "shared"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "shared", "sync-inline-versions.md"),
      [
        "## SYNC:ai-sdd-artifact-contract",
        "",
        "> Any supported AI tool may execute with synced context.",
        "> Code-to-spec extraction is reference-only until accepted.",
        "> Active reference: `shared/sdd-artifact-contract.md`.",
        "",
        "---",
        "",
        "## SYNC:ai-sdd-artifact-contract:reminder",
        "",
        "- MANDATORY keep generated mirrors current.",
        "",
      ].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, "CLAUDE.md"),
      ["# Claude Source Instructions", "", "Use /test from the Claude source instructions.", ""].join("\n"),
      "utf8"
    );

    await fs.writeFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "# Existing Context\n", "utf8");
    await fs.writeFile(
      path.join(tempRoot, "AGENTS.md"),
      [
        "# Codex Project Instructions",
        "",
        "<!-- CLAUDE-MERGE:START -->",
        "## CLAUDE.md (Prompt-Enhanced Snapshot)",
        "",
        "Legacy generated instructions.",
        "<!-- CLAUDE-MERGE:END -->",
        "",
      ].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(contextText, new RegExp(projectReferenceGateHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const requiredDoc of projectReferenceGateRequiredDocs) {
      assert.match(contextText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(agentsText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(contextText, /Auto-select/);
    assert.doesNotMatch(contextText, /Which workflow do you want to activate\?/);
    assert.match(contextText, /SYNC:ai-sdd-artifact-contract/);
    assert.match(contextText, /Any supported AI tool/);
    assert.match(contextText, /reference-only until accepted/);
    assert.doesNotMatch(contextText, /Confirm First:/);
    assert.doesNotMatch(contextText, /if workflow requires confirmation or ambiguity exists/);
    assert.match(contextText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(agentsText, /<!-- CLAUDE-MIRROR:START -->/);
    assert.match(agentsText, /# Claude Source Instructions/);
    assert.match(agentsText, /Use \$test from the Claude source instructions\./);
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(contextText, /Use \$test for local test execution\./);
    assert.match(agentsText, /\.codex\/CODEX_CONTEXT\.md/);
    // The compact root points to the full context; shared AI-SDD detail remains in that
    // canonical context rather than being duplicated into AGENTS.md.
    assert.ok(agentsText.indexOf("<!-- CLAUDE-MIRROR:START -->") < agentsText.indexOf("<!-- CODEX-CONTEXT-MIRROR:START -->"));
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MERGE:START -->/);
    assert.doesNotMatch(agentsText, /Legacy generated instructions\./);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows points to lessons.md without inlining project lessons", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-lessons-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, /docs\/project-reference\/lessons\.md/);
    assert.match(agentsText, /docs\/project-reference\/lessons\.md/);
    assert.doesNotMatch(contextText, /^## Learned Lessons\b/m);
    assert.doesNotMatch(contextText, /^# Lessons Learned\b/m);
    assert.doesNotMatch(contextText, /ExecuteInjectScopedAsync/);
    assert.doesNotMatch(agentsText, /^## Learned Lessons\b/m);
    assert.doesNotMatch(agentsText, /^# Lessons Learned\b/m);
    assert.doesNotMatch(agentsText, /ExecuteInjectScopedAsync/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows creates Codex context and AGENTS when both are missing", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-missing-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, /^<!-- PROMPT-PROTOCOLS:START -->/);
    assert.match(contextText, /# Codex Context/);
    assert.match(contextText, new RegExp(projectReferenceGateHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const requiredDoc of projectReferenceGateRequiredDocs) {
      assert.match(contextText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(agentsText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(agentsText, /# Codex Project Instructions/);
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MIRROR:START -->/);
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(agentsText, /\.codex\/CODEX_CONTEXT\.md/);
    assert.doesNotMatch(agentsText, /Confirm First:/);
    assert.equal(await fs.access(path.join(tempRoot, "scripts")).then(() => true, () => false), false);

    await runSync(tempRoot);
    const agentsTextAfterSecondRun = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.equal(agentsTextAfterSecondRun, agentsText);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows builds static prompt protocols without prompt-injections.cjs", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-no-hooks-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", ".ck.json"),
      JSON.stringify(
        {
          portability: {
            rule: "Custom portable rule from local config.",
            projectConfigPath: "custom/project-config.json",
            docsIndexPath: "custom/docs-index.md",
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    for (const text of [contextText]) {
      assert.match(text, /\[WORKFLOW-EXECUTION-PROTOCOL\]/);
      assert.match(text, /Custom portable rule from local config\./);
      assert.match(text, /custom\/project-config\.json/);
      assert.match(text, /custom\/docs-index\.md/);
      assert.match(text, /Auto-select/i);
      assert.doesNotMatch(text, /Unable to load `\.claude\/hooks\/lib\/prompt-injections\.cjs`/);
      assert.doesNotMatch(text, /Source: `\.claude\/hooks\/lib\/prompt-injections\.cjs`/);
    }
    assert.match(agentsText, /\.codex\/CODEX_CONTEXT\.md/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows passes portability config into prompt protocol mirror", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-portability-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", ".ck.json"),
      JSON.stringify(
        {
          portability: {
            rule: "Custom portable rule from local config.",
            projectConfigPath: "custom/project-config.json",
            docsIndexPath: "custom/docs-index.md",
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    for (const expected of [
      "Custom portable rule from local config.",
      "custom/project-config.json",
      "custom/docs-index.md",
    ]) {
      assert.match(contextText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(agentsText, /\.codex\/CODEX_CONTEXT\.md/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows replaces stale project-reference gate content", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-gate-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"),
      [
        "# Existing Context",
        "",
        "Codex uses static project-reference loading instead of runtime-injected project docs. Before coding, planning, debugging, testing, or reviewing:",
        "",
        "- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.",
        "- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.",
        "- Read `docs/project-reference/lessons.md` for always-on project guardrails.",
        "- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.",
        "",
        projectReferenceGateHeading,
        "",
        "Old direct-read-all-project-reference-docs guidance.",
        "",
        "## Critical Thinking Mindset",
        "",
        "Keep this section.",
        "",
      ].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.doesNotMatch(contextText, /Old direct-read-all-project-reference-docs guidance/);
    assert.match(contextText, /auto-run `\$project-init` or the narrow setup route/);
    assert.match(contextText, /For situation-specific work, open the referenced project doc directly/);
    assert.equal(contextText.match(/For situation-specific work, open the referenced project doc directly/g)?.length, 1);
    assert.match(contextText, /## Critical Thinking Mindset/);
    assert.ok(contextText.indexOf(projectReferenceGateHeading) < contextText.indexOf("## Critical Thinking Mindset"));
    assert.match(agentsText, /For situation-specific work, open the referenced project doc directly/);

    await runSync(tempRoot);
    const contextTextAfterSecondRun = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    assert.equal(contextTextAfterSecondRun, contextText);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows and Claude catalog render every canonical workflow variant", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-variants-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "workflow-end"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          "workflow-variant": {
            name: "Variant workflow",
            description: "Choose a named output mode",
            defaultMode: "synthesis",
            variants: {
              synthesis: {
                sequence: [
                  { id: "synth-test", skill: "test", args: "--mode=synthesis" },
                  { id: "synth-end", skill: "workflow-end" },
                ],
              },
              audit: {
                sequence: [
                  { id: "audit-test", skill: "test", args: "--mode=audit" },
                  { id: "audit-end", skill: "workflow-end" },
                ],
              },
            },
            preActions: { injectContext: "Resolve the selected output mode before task creation." },
          },
        },
      }, null, 2),
      "utf8"
    );
    for (const [name, description] of [["test", "Test skill"], ["workflow-end", "Workflow end skill"]]) {
      await fs.writeFile(
        path.join(tempRoot, ".claude", "skills", name, "SKILL.md"),
        ["---", `name: ${name}`, `description: ${description}`, "---", "", `# ${name}`, ""].join("\n"),
        "utf8"
      );
    }

    await runSync(tempRoot);
    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const document = JSON.parse(await fs.readFile(path.join(tempRoot, ".claude", "workflows.json"), "utf8"));
    const claudeCatalog = workflowCatalog.buildWorkflowSkillsCatalog({ rootDir: tempRoot, sections: ["workflows"] });

    for (const [surface, text] of [["Codex context", contextText], ["Claude catalog", claudeCatalog]]) {
      assert.match(text, /synthesis:/, `${surface} must expose synthesis mode`);
      assert.match(text, /audit:/, `${surface} must expose audit mode`);
      assert.match(text, /test --mode=(?:synthesis|audit)/, `${surface} must retain opaque mode args`);
    }
    for (const id of ["synth-test", "synth-end", "audit-test", "audit-end"]) {
      assert.match(contextText, new RegExp(id), `Codex context must retain stable occurrence ${id}`);
    }
    assert.doesNotMatch(contextText, /\[object Object\]/);
    assert.deepEqual(
      workflowCatalog.resolvedModeSequences(tempRoot, "workflow-variant", document.workflows["workflow-variant"]),
      [
        { mode: "synthesis", sequence: ["test --mode=synthesis", "workflow-end"] },
        { mode: "audit", sequence: ["test --mode=audit", "workflow-end"] },
      ],
      "Claude's catalog resolver must expose the same mode/sequence projection"
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// TC-DOCROOT-028 — a routed field carrying {SPEC_ROOT} must reach the mirror RESOLVED.
// A bare token in .codex/CODEX_CONTEXT.md is strictly worse than the hardcoded path it
// replaced, so the assertion is two-sided: the resolved value is present AND the literal
// token is absent. The fixture declares specRoots, proving the mirror follows CONFIG and
// not just the default.
test("sync-context-workflows resolves {SPEC_ROOT} in mirrored workflow text (TC-DOCROOT-028)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-docroot-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify({ specRoots: { business: { path: "spec-library" } } }, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      "---\nname: test\ndescription: fixture\n---\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          docroot: {
            name: "Docroot workflow",
            description: "Read {SPEC_ROOT}/README.md before starting",
            sequence: ["test"],
            preActions: { injectContext: "Specs live in {SPEC_ROOT}/; buckets stay {Bucket}." },
          },
        },
      }, null, 2),
      "utf8"
    );

    await runSync(tempRoot);
    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");

    assert.doesNotMatch(contextText, /\{SPEC_ROOT\}/, "a bare portability token must never reach a mirror");
    assert.match(contextText, /spec-library\/README\.md/, "description must resolve from config");
    assert.match(contextText, /Specs live in spec-library\//, "injectContext must resolve from config");
    assert.match(contextText, /\{Bucket\}/, "unknown braces are AI placeholders and must survive verbatim");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// TC-DOCROOT-029 — R8 LOCKSTEP. The mirror's own fallback runs only when the loader require
// fails (stripped portable Codex tree). It must resolve to the DEFAULTS, never pass through.
// Same isolation technique as extract-sync-block-twin-parity.test.mjs: lift the fallback
// source and run it under vm, because the loader require succeeds inside this repo and would
// otherwise mask the branch entirely.
test("mirror token fallback resolves to loader defaults, never a bare token (TC-DOCROOT-029)", async () => {
  const twinSource = await fs.readFile(syncContextScript, "utf8");
  const defaultsSrc = twinSource.match(/const PORTABILITY_TOKEN_DEFAULTS = \{[\s\S]*?\n\};/);
  const fallbackSrc = twinSource.match(/function resolvePortabilityTokensFallback\(text, config\) \{[\s\S]*?\n\}/);
  assert.ok(defaultsSrc, "PORTABILITY_TOKEN_DEFAULTS source not found — has the fallback shape changed?");
  assert.ok(fallbackSrc, "resolvePortabilityTokensFallback source not found — has the fallback shape changed?");

  const ctx = { result: {} };
  vm.createContext(ctx);
  vm.runInContext(
    `${defaultsSrc[0]}\n${fallbackSrc[0]}\nresult.defaults = PORTABILITY_TOKEN_DEFAULTS;\nresult.resolve = resolvePortabilityTokensFallback;`,
    ctx
  );

  const loader = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"));
  const loaderDefaults = Object.fromEntries(
    Object.entries(loader.PORTABILITY_TOKENS).map(([token, spec]) => [token, spec.default])
  );

  assert.deepEqual(
    // Re-spread out of the vm realm: a cross-realm object literal has a foreign prototype and
    // would fail deepStrictEqual on identical data.
    { ...ctx.result.defaults },
    loaderDefaults,
    "mirror fallback defaults drifted from the loader's PORTABILITY_TOKENS — Claude and Codex would resolve differently"
  );

  const tokens = Object.keys(loaderDefaults);
  const input = tokens.map((t) => `{${t}}`).join(" ");
  const fallbackOut = ctx.result.resolve(input, undefined);
  assert.equal(fallbackOut, tokens.map((t) => loaderDefaults[t]).join(" "), "fallback must resolve, not pass through");
  assert.doesNotMatch(fallbackOut, /\{/, "no bare token may survive the fallback");
  assert.equal(
    fallbackOut,
    loader.resolvePortabilityTokens(input, {}),
    "fallback output must be byte-identical to the loader's output for an unset config"
  );
  assert.equal(
    ctx.result.resolve("keep {Bucket} and {plan-id}", undefined),
    "keep {Bucket} and {plan-id}",
    "unknown braces survive the fallback exactly as they survive the loader"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DOCROOT-050..055 — Phase 05. `.claude/workflows.json` ROUTED fields carry TOKENS.
//
// None of these tests asserts a COUNT. Each walks the live file and derives its own
// target set, because the routed-field inventory moves whenever a workflow is added.
// ─────────────────────────────────────────────────────────────────────────────

const realWorkflowsPath = path.join(repoRoot, ".claude", "workflows.json");
const configLoader = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"));
const PORTABILITY_TOKEN_NAMES = Object.keys(configLoader.PORTABILITY_TOKENS);

// The tracked literal each token replaces, derived from the loader's own defaults so a new
// token cannot silently escape this guard. `PLANS_ROOT` is the one root whose bare default
// (`plans`) is an ordinary English word, so it is matched only in its path-shaped form.
const TRACKED_LITERALS = PORTABILITY_TOKEN_NAMES.map((token) => {
  const value = configLoader.PORTABILITY_TOKENS[token].default;
  return token === "PLANS_ROOT" ? `${value}/` : value;
});

// Exactly the routed set Phase 04b fixed: anything NOT matched here stays literal by design.
const ROUTED_FIELD_PATH = /(\.description|\.whenToUse|\.preActions\.injectContext|\.applicability\.when|\.applicability\.skipReason)$/;

function collectRoutedStrings(node, jsonPath, sink) {
  if (typeof node === "string") {
    if (ROUTED_FIELD_PATH.test(jsonPath)) sink.push({ jsonPath, value: node });
  } else if (Array.isArray(node)) {
    node.forEach((item, index) => collectRoutedStrings(item, `${jsonPath}[${index}]`, sink));
  } else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) collectRoutedStrings(node[key], `${jsonPath}.${key}`, sink);
  }
}

async function readRoutedStrings() {
  const document = JSON.parse(await fs.readFile(realWorkflowsPath, "utf8"));
  const sink = [];
  collectRoutedStrings(document, "", sink);
  return { document, routed: sink };
}

// Slice out the workflow catalog the mirror renders from workflows.json. Assertions about
// "zero literals" are scoped to this slice: the surrounding CODEX_CONTEXT.md sections
// (project-reference gate, prompt protocols, skills index) legitimately name other doc paths.
function workflowCatalogSlice(contextText) {
  const start = contextText.indexOf("## Workflow Catalog");
  assert.notEqual(start, -1, "mirror must render a '## Workflow Catalog' section");
  const end = contextText.indexOf("<!-- CK:SKILLS", start);
  return end === -1 ? contextText.slice(start) : contextText.slice(start, end);
}

async function buildMirrorFixture(projectConfig) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-p05-"));
  await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
  await fs.writeFile(
    path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
    "---\nname: test\ndescription: fixture\n---\n",
    "utf8"
  );
  await fs.copyFile(realWorkflowsPath, path.join(tempRoot, ".claude", "workflows.json"));
  if (projectConfig) {
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify(projectConfig, null, 2),
      "utf8"
    );
  }
  await runSync(tempRoot);
  const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
  return { tempRoot, contextText, catalog: workflowCatalogSlice(contextText) };
}

test("every routed workflows.json field is literal-free (TC-DOCROOT-050)", async () => {
  const { routed } = await readRoutedStrings();
  assert.ok(routed.length > 0, "routed-field walker found nothing — has the field shape changed?");

  const offenders = [];
  for (const { jsonPath, value } of routed) {
    for (const literal of TRACKED_LITERALS) {
      if (value.includes(literal)) offenders.push(`${jsonPath} still contains "${literal}"`);
    }
  }
  assert.deepEqual(offenders, [], `routed fields must carry tokens, not literals:\n${offenders.join("\n")}`);
});

test("mirror body resolves every portability token and keeps AI placeholders (TC-DOCROOT-051, TC-DOCROOT-052)", async () => {
  const { tempRoot, contextText, catalog } = await buildMirrorFixture(null);
  try {
    for (const token of PORTABILITY_TOKEN_NAMES) {
      assert.equal(
        contextText.includes(`{${token}}`),
        false,
        `a bare {${token}} reached .codex/CODEX_CONTEXT.md — strictly worse than the literal it replaced`
      );
    }

    // TC-DOCROOT-052 — non-path braces are instructions to the AI and must survive verbatim.
    // Survivors are derived from the file, not hardcoded, so a renamed placeholder cannot
    // make this test vacuously pass.
    const { routed } = await readRoutedStrings();
    const survivors = new Set();
    for (const { value } of routed) {
      for (const [, name] of value.matchAll(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g)) {
        if (!PORTABILITY_TOKEN_NAMES.includes(name)) survivors.add(name);
      }
    }
    assert.ok(survivors.has("Bucket"), "fixture sanity: {Bucket} must exist in a routed field");
    for (const name of survivors) {
      assert.ok(catalog.includes(`{${name}}`), `AI placeholder {${name}} must survive token resolution`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("relocating specRoots.business moves every {SPEC_ROOT} carrier in the mirror (TC-DOCROOT-053)", async () => {
  const { routed } = await readRoutedStrings();
  // Select carriers by scanning for the token — no workflow id and no line number is hardcoded.
  const carriers = new Set(
    routed
      .filter(({ value }) => value.includes("{SPEC_ROOT}"))
      .map(({ jsonPath }) => jsonPath.split(".")[2])
  );
  assert.ok(carriers.size > 0, "no routed field carries {SPEC_ROOT} — TC-DOCROOT-053 would be vacuous");

  const { tempRoot, catalog } = await buildMirrorFixture({ specRoots: { business: { path: "spec-library" } } });
  try {
    assert.ok(catalog.includes("spec-library"), "relocated spec root must appear in the rendered catalog");
    assert.equal(catalog.includes("docs/specs"), false, "the default spec root must not survive relocation");
    assert.equal(catalog.includes("{SPEC_ROOT}"), false, "no bare token may reach the mirror");
    for (const workflowId of carriers) {
      assert.ok(catalog.includes(workflowId), `carrier workflow ${workflowId} must be rendered in the catalog`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows still throws on a blank injectContext (TC-DOCROOT-054)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-blank-inject-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      "---\nname: test\ndescription: fixture\n---\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          blank: { name: "Blank", sequence: ["test"], preActions: { injectContext: "   \n  " } },
        },
      }, null, 2),
      "utf8"
    );
    await assert.rejects(
      () => runSync(tempRoot),
      /missing required non-empty preActions\.injectContext/,
      "a whitespace-only injectContext must fail the generator, not ship an empty protocol"
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("Tier-2 read-workflow-entry emits no bare token for any workflow id (TC-DOCROOT-055)", async () => {
  const readEntryScript = path.join(repoRoot, ".claude", "scripts", "codex", "read-workflow-entry.mjs");
  const { document } = await readRoutedStrings();
  const workflowIds = Object.keys(document.workflows);
  assert.ok(workflowIds.length > 0, "workflows.json declares no workflows");

  for (const workflowId of workflowIds) {
    const { stdout } = await execFileAsync(process.execPath, [readEntryScript, workflowId], { cwd: repoRoot });
    for (const token of PORTABILITY_TOKEN_NAMES) {
      assert.equal(
        stdout.includes(`{${token}}`),
        false,
        `read-workflow-entry ${workflowId} printed a bare {${token}} into the Tier-2 canonical read`
      );
    }
    assert.doesNotThrow(() => JSON.parse(stdout), `read-workflow-entry ${workflowId} must emit valid JSON`);
  }
});
