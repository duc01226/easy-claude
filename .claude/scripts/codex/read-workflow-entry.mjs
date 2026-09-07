#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import workflowManifest from "../lib/workflow-manifest.cjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const workflowsPath = path.join(repoRoot, ".claude", "workflows.json");

function usage() {
  return "Usage: node .claude/scripts/codex/read-workflow-entry.mjs <workflow-id> [--mode <mode> | --output <mode>]";
}

async function main() {
  const [workflowId, ...extraArgs] = process.argv.slice(2);
  if (!workflowId || workflowId.startsWith("--")) {
    throw new Error(usage());
  }
  const options = { rootDir: repoRoot };
  for (let i = 0; i < extraArgs.length; i++) {
    const match = extraArgs[i].match(/^--(?:mode|output)(?:=(.*))?$/);
    if (!match || Object.hasOwn(options, "mode")) throw new Error(usage());
    const mode = match[1] === undefined ? extraArgs[++i] : match[1];
    if (!mode || mode.startsWith("--")) throw new Error(usage());
    options.mode = mode;
  }

  const workflowsDoc = JSON.parse(await fs.readFile(workflowsPath, "utf8"));
  const workflows = workflowsDoc?.workflows;
  const workflow = workflows?.[workflowId];
  if (!Object.hasOwn(workflows ?? {}, workflowId)) {
    throw new Error(`Unknown workflow ID: ${workflowId}`);
  }

  if (
    typeof workflow?.preActions?.injectContext !== "string" ||
    workflow.preActions.injectContext.trim().length === 0
  ) {
    throw new Error(
      `Workflow ${workflowId} is missing required non-empty preActions.injectContext`
    );
  }

  const manifest = workflowManifest.resolveWorkflowManifest(workflowsDoc, workflowId, options);
  process.stdout.write(`${JSON.stringify({ ...workflow, ...manifest }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
