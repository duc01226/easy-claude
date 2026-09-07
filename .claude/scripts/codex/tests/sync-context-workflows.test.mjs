import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
