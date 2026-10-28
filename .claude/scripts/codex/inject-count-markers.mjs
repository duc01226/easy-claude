// Sync stage `counts`: fill the COUNT markers (ADR-0002) of the documents listed in
// `.claude/scripts/lib/count-marker-files.cjs`, through `generate_catalogs.py --inject-counts`, before any
// gate reads them. Hand-typed inventory figures drifted on every new skill, hook or Markdown file, and
// the count-drift gate then failed the sync until someone retyped them.
//
// Only listed documents are touched: decision records quote example markers that stay as written.
// A listed document that is missing or carries no marker is reported and left alone.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const COUNT_MARKER = /<!--\s*COUNT:[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)?\s*-->\d+<!--\s*\/COUNT\s*-->/;

/**
 * Inject every listed document that exists and carries a marker. `runInject(absoluteFile)` returns
 * `{ status, stderr }`; a non-zero status throws an error naming the document and the tool's output.
 * Returns one `{ file, status: 'injected' | 'no-markers' | 'missing', detail? }` per listed document.
 */
export function injectCountMarkers({ rootDir, files, runInject }) {
    const results = [];
    for (const file of files) {
        const absolute = path.join(rootDir, ...file.split("/"));
        if (!fs.existsSync(absolute)) {
            results.push({ file, status: "missing" });
            continue;
        }
        if (!COUNT_MARKER.test(fs.readFileSync(absolute, "utf8"))) {
            results.push({ file, status: "no-markers" });
            continue;
        }
        const outcome = runInject(absolute);
        const detail = String(outcome.stderr || "").trim();
        if (outcome.status !== 0) {
            throw new Error(`count injection failed for ${file} (exit ${outcome.status}):\n${detail}`);
        }
        results.push({ file, status: "injected", detail });
    }
    return results;
}

function main() {
    const { resolveMutationProjectRoot } = require("../lib/project-root.cjs");
    const { countMarkerFiles } = require("../lib/count-marker-files.cjs");
    const { resolvePythonCommand, preparePythonYaml } = require("../../hooks/tests/lib/python-command.cjs");
    const { rootDir } = resolveMutationProjectRoot({ cwd: process.cwd(), scriptPath: fileURLToPath(import.meta.url), env: process.env });
    const scriptsDir = path.join(rootDir, ".claude", "scripts");
    const catalogTool = path.join(scriptsDir, "generate_catalogs.py");

    // The same launcher and PyYAML recovery the count-drift gate uses, so both read the same counts.
    const python = resolvePythonCommand({ cwd: rootDir });
    const yamlPath = preparePythonYaml(python, { scriptsDir, cwd: rootDir });
    const env = { ...process.env, PYTHONPATH: [yamlPath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) };
    const runInject = file => {
        const result = spawnSync(python.command, [...python.baseArgs, catalogTool, "--inject-counts", file], {
            cwd: rootDir, env, encoding: "utf8", timeout: 60000, windowsHide: true
        });
        return { status: result.error ? 1 : result.status, stderr: result.error ? result.error.message : result.stderr };
    };

    const results = injectCountMarkers({ rootDir, files: countMarkerFiles(rootDir), runInject });
    for (const result of results) {
        const changed = result.status === "injected" ? (/Updated \d+ marker/.exec(result.detail) || ["no drift"])[0] : result.status;
        console.log(`[count-markers] ${result.file}: ${changed}`);
    }
}

const { isInvokedAsScript } = require("../lib/project-root.cjs");
if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    try {
        main();
    } catch (error) {
        console.error(`[count-markers] ${error.message}`);
        process.exit(1);
    }
}
