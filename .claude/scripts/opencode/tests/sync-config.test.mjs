import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  checkOpencodeConfig,
  materializeOpencodeConfig,
  mergeRecommendedConfig,
  RECOMMENDED_CONFIG_RELATIVE,
  resolveRecommendedConfigPath,
  resolveRootConfigPath,
} from "../sync-config.mjs";

const RECOMMENDED = {
  $schema: "https://opencode.ai/config.json",
  model: "opencode-go/deepseek-v4.1-flash",
  compaction: { auto: true },
  provider: {
    "opencode-go": {
      models: {
        "deepseek-v4.1-flash": {
          limit: { context: 500000, output: 384000 },
          options: { reasoningEffort: "high" },
        },
      },
    },
  },
};

async function createProject(existingConfig) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-config-"));
  await fs.mkdir(path.join(root, ".opencode"), { recursive: true });
  await fs.writeFile(
    resolveRecommendedConfigPath(root),
    `${JSON.stringify(RECOMMENDED, null, 2)}\n`,
    "utf8",
  );
  if (existingConfig !== undefined) {
    await fs.writeFile(resolveRootConfigPath(root), `${JSON.stringify(existingConfig, null, 2)}\n`, "utf8");
  }
  return root;
}

test("RECOMMENDED_CONFIG_RELATIVE never collides with the auto-loaded .opencode/opencode.json", () => {
  assert.equal(RECOMMENDED_CONFIG_RELATIVE, path.join(".opencode", "opencode.recommended.json"));
  assert.notEqual(path.basename(RECOMMENDED_CONFIG_RELATIVE), "opencode.json");
});

test("mergeRecommendedConfig deep-merges, recommends win, project-only keys survive", () => {
  const existing = {
    $schema: "https://opencode.ai/config.json",
    model: "project/custom-model",
    instructions: ["AGENTS.md"],
    compaction: { auto: false, tail_turns: 15 },
    provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { options: { reasoningEffort: "low" } } } } },
    mcp: {},
  };
  const merged = mergeRecommendedConfig(existing, RECOMMENDED);

  assert.equal(merged.model, RECOMMENDED.model, "recommended scalar must win");
  assert.equal(merged.compaction.auto, true, "recommended nested scalar must win");
  assert.equal(merged.compaction.tail_turns, 15, "project-only nested key must survive");
  assert.deepEqual(merged.instructions, ["AGENTS.md"], "project-only top-level key must survive");
  assert.deepEqual(merged.mcp, {});
  assert.equal(
    merged.provider["opencode-go"].models["deepseek-v4.1-flash"].options.reasoningEffort,
    "high",
    "recommended deep leaf must win",
  );
  assert.equal(merged.provider["opencode-go"].models["deepseek-v4.1-flash"].limit.context, 500000);
});

test("mergeRecommendedConfig replaces arrays and clones without mutating inputs", () => {
  const existing = { plugin: ["project-plugin"] };
  const recommended = { plugin: ["recommended-plugin"] };
  const merged = mergeRecommendedConfig(existing, recommended);
  assert.deepEqual(merged.plugin, ["recommended-plugin"]);
  assert.deepEqual(existing.plugin, ["project-plugin"], "input must not be mutated");
});

test("materialize creates the root config verbatim when none exists", async () => {
  const root = await createProject();
  try {
    const result = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(result.existed, false);
    assert.equal(result.changed, true);
    assert.deepEqual(result.merged, RECOMMENDED);

    const onDisk = await fs.readFile(resolveRootConfigPath(root), "utf8");
    assert.equal(onDisk, `${JSON.stringify(RECOMMENDED, null, 2)}\n`);

    const check = await checkOpencodeConfig({ rootDir: root });
    assert.equal(check.ok, true, check.reason ?? "");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("materialize merges into an existing project config and is idempotent", async () => {
  const root = await createProject({
    model: "project/custom-model",
    instructions: ["AGENTS.md"],
    permission: { edit: "deny" },
  });
  try {
    const first = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(first.existed, true);
    assert.equal(first.changed, true);
    assert.equal(first.merged.model, RECOMMENDED.model);
    assert.deepEqual(first.merged.instructions, ["AGENTS.md"]);
    assert.deepEqual(first.merged.permission, { edit: "deny" });

    const second = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(second.changed, false, "second materialize must be a no-op");
    assert.deepEqual(second.merged, first.merged);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("check reports stale when the root config drifts or is missing", async () => {
  const root = await createProject();
  try {
    const missing = await checkOpencodeConfig({ rootDir: root });
    assert.equal(missing.ok, false);
    assert.match(missing.reason, /missing/);

    await materializeOpencodeConfig({ rootDir: root });
    await fs.writeFile(resolveRootConfigPath(root), `${JSON.stringify({ model: "other/model" }, null, 2)}\n`, "utf8");

    const stale = await checkOpencodeConfig({ rootDir: root });
    assert.equal(stale.ok, false);
    assert.match(stale.reason, /stale/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("materialize fails loudly on a malformed existing config instead of clobbering it", async () => {
  const root = await createProject();
  try {
    await fs.writeFile(resolveRootConfigPath(root), "{ not json", "utf8");
    await assert.rejects(
      () => materializeOpencodeConfig({ rootDir: root }),
      /not valid JSON/,
    );
    assert.equal(await fs.readFile(resolveRootConfigPath(root), "utf8"), "{ not json");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
