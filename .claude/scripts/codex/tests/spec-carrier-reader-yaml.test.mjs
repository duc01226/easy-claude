import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { carrierTestProfile, diskReader, rawReadSpecCarriers, readSpecCarriers, repoRoot, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";
import { isFrameworkRepo } from "./framework-repo.helper.mjs";

const frameworkRepo = isFrameworkRepo(repoRoot);
const projectConfig = frameworkRepo
  ? JSON.parse(readFileSync(path.join(repoRoot, "docs/project-config.json"), "utf8"))
  : null;

const yamlContract = (scenario, examples, reconciliation = "") => `
scenario_ref: ${scenario}
lifecycle: reviewed
coverage:
  rules: [operations/021 REQ-1]
  criteria: [operations/021 AC-2]
examples:
${examples}
${reconciliation ? `reconciliation:\n${reconciliation}` : "reconciliation: []"}
`;

const yamlExecutor = yamlPath => `
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const CONTRACT_PATH = path.resolve(__dirname, '../../${yamlPath}');
const contract = parse(readFileSync(CONTRACT_PATH, 'utf8'));
const cases = [...contract.examples, ...contract.reconciliation].map(row => adapt(row));
describe('operations/021 REQ-1', () => {
  it('executes the contract', () => cases.forEach(run));
});
`;

test("yaml-cases-v1 reads configured case lists and joins the selected explicit executor", async t => {
  // Given: an adopter-defined YAML profile, owner artifact, contract, and selected executor.
  // When: the carrier reader resolves both configured lists and their source link.
  // Then: each row has source spans and no inferred execution result.
  // Business Intent / Invariant Guarded: carrier outcomes come only from selected, statically linked project evidence.
  // Failure Signal: a missing row, owner, executor, span, or fabricated result fails this test.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const yamlFile = "contract-data/queue/contract.yaml";
    const executorFile = "checks/unit/queue.test.js";
    await writeProjectFile(rootDir, "specs/operations/021-queue.md", "# Queue contract\n");
    await writeProjectFile(rootDir, yamlFile, yamlContract("SCN-QUEUE-1", `  - name: regular\n    given: {quantity: 2}\n    then: {accepted: true}\n`, `  - name: reconciliation\n    given: {quantity: 3}\n    then: {accepted: false}\n`));
    await writeProjectFile(rootDir, executorFile, yamlExecutor(yamlFile));

    const result = await readSpecCarriers({ rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir) });
    const yamlRecords = result.records.filter(record => record.dialect === "yaml-cases-v1");

    assert.equal(yamlRecords.length, 2);
    assert.deepEqual(new Set(yamlRecords.map(record => record.caseList)), new Set(["examples", "reconciliation"]));
    assert.ok(yamlRecords.every(record => record.ownerPath === "specs/operations/021-queue.md"));
    assert.ok(yamlRecords.every(record => record.scenarioId === "SCN-QUEUE-1"
      && record.executors.length === 1 && record.executors[0].file === executorFile));
    assert.ok(yamlRecords.every(record => record.sourceSpans.input?.start < record.sourceSpans.input?.end));
    assert.ok(yamlRecords.every(record => record.sourceSpans.expected?.start < record.sourceSpans.expected?.end));
    assert.ok(yamlRecords.every(record => !Object.hasOwn(record, "executionResult")));
    assert.deepEqual(result.unknown, []);
  });
});

test("Orient One YAML carriers stay scoped and preserve every explicit executor", { skip: !frameworkRepo }, async () => {
  // Given: four configured YAML contracts and their five explicit executor files.
  // When: the reader normalizes the complete selected corpus.
  // Then: all 79 rows, 94 links, and both executors per shared row are retained.
  // Business Intent / Invariant Guarded: scenario-to-test coverage keeps its evidenced many-to-many cardinality.
  // Failure Signal: a dropped row/link, missing executor, or unresolved corpus item changes these assertions.
  const yamlFiles = [
    "specs/platform/014-custom-field-engine-consolidation/scenario-contracts/coercion.yaml",
    "specs/platform/014-custom-field-engine-consolidation/scenario-contracts/custom-wrapper-sales-hr.yaml",
    "specs/platform/014-custom-field-engine-consolidation/scenario-contracts/servicedesk-wrapper.yaml",
    "specs/platform/014-custom-field-engine-consolidation/scenario-contracts/tasks-wrapper.yaml",
  ];
  const executorFiles = [
    "packages/std/src/__tests__/field-coercion.contract.test.ts",
    "packages/sales/src/commands/__tests__/custom-field-wrapper.contract.test.ts",
    "packages/hr/src/__tests__/custom-field-wrapper.contract.test.ts",
    "packages/servicedesk/src/__tests__/field-validation.contract.test.ts",
    "packages/tasks/src/commands/custom-fields.contract.test.ts",
  ];
  const result = await readSpecCarriers({
    rootDir: repoRoot, profile: projectConfig, selectedFiles: [...yamlFiles, ...executorFiles], readText: diskReader(repoRoot),
  });
  const yamlRecords = result.records.filter(record => record.dialect === "yaml-cases-v1");
  const rowsByFile = Object.fromEntries(yamlFiles.map(file => [file, yamlRecords.filter(record => record.carrierFile === file).length]));
  const executorLinks = yamlRecords.reduce((total, record) => total + record.executors.length, 0);
  const sharedRows = yamlRecords.filter(record => record.carrierFile === yamlFiles[1]);

  assert.deepEqual(rowsByFile, {
    [yamlFiles[0]]: 31, [yamlFiles[1]]: 15, [yamlFiles[2]]: 15, [yamlFiles[3]]: 18,
  });
  assert.equal(yamlRecords.length, 79);
  assert.equal(executorLinks, 94);
  assert.ok(yamlRecords.every(record => Array.isArray(record.executors) && record.executors.length > 0));
  assert.ok(sharedRows.every(record => record.executors.length === 2));
  assert.deepEqual([...new Set(sharedRows.flatMap(record => record.executors.map(executor => executor.file)))].sort(), [
    "packages/hr/src/__tests__/custom-field-wrapper.contract.test.ts",
    "packages/sales/src/commands/__tests__/custom-field-wrapper.contract.test.ts",
  ].sort());
  assert.ok(yamlRecords.filter(record => record.carrierFile === yamlFiles[3]).every(record => record.caseList === "cases"));
  assert.deepEqual(result.unknown, []);
});

test("Orient One YAML roots exclude unrelated finance coverage maps without reading them", { skip: !frameworkRepo }, async () => {
  // Given: unrelated finance YAML candidates outside the configured scenario-contract root.
  // When: the actual project profile selects carrier files for this run.
  // Then: those paths yield no records, UNKNOWN entries, or source reads.
  // Business Intent / Invariant Guarded: only configured scenario-contract roots become YAML evidence.
  // Failure Signal: an overbroad selector reads a finance map or returns any carrier outcome.
  const financeFiles = [
    "specs/finance/031-fx-revaluation-and-intercompany/coverage/dimensions.yaml",
    "specs/finance/031-fx-revaluation-and-intercompany/coverage/surfaces.yaml",
    "specs/finance/032-manual-journal-entries/coverage/dimensions.yaml",
    "specs/finance/032-manual-journal-entries/coverage/surfaces.yaml",
    "specs/finance/037-budgeting-and-forecasting/coverage/dimensions.yaml",
    "specs/finance/037-budgeting-and-forecasting/coverage/surfaces.yaml",
  ];
  const reads = [];
  const result = await rawReadSpecCarriers({
    rootDir: repoRoot,
    profile: projectConfig,
    selectedFiles: financeFiles,
    listFiles: async () => financeFiles,
    readText: async file => { reads.push(file); return "unrelated finance coverage"; },
  });

  assert.deepEqual(result.records, []);
  assert.deepEqual(result.unknown, []);
  assert.deepEqual(reads, []);
});

test("tagged, merged, malformed, or dynamic YAML metadata remains UNKNOWN with source spans", async t => {
  // Given: YAML inputs with unsupported tags, merges, syntax, list shapes, or dynamic values.
  // When: each input is parsed through the configured carrier reader.
  // Then: no case is emitted and each failure retains an UNKNOWN reason and source span.
  // Business Intent / Invariant Guarded: unsupported metadata never becomes guessed scenario coverage.
  // Failure Signal: any record, missing UNKNOWN, absent span, or missing reason fails the test.
  if (skipMissingCarrierParsers(t, "yaml")) return;
  await withTempProject(t, async rootDir => {
    const prefix = `scenario_ref: SCN-OPS-1\nlifecycle: reviewed\ncoverage:\n  rules: [operations/021 REQ-1]\n  criteria: [operations/021 AC-1]\n`;
    const cases = [
      ["tagged", prefix.replace("scenario_ref: SCN-OPS-1", "scenario_ref: !!str SCN-OPS-1") + "examples: []\nreconciliation: []\n", "explicit tags"],
      ["merged", prefix + "<<: {legacy: true}\nexamples: []\nreconciliation: []\n", "merge keys"],
      ["malformed", prefix + "examples: [\nreconciliation: []\n", "parser diagnostic"],
      ["no-lists", prefix + "other: []\n", "at least one configured YAML case list must be present"],
      ["wrong-list-shape", prefix + "examples: []\nreconciliation: null\n", "configured YAML case list reconciliation must be a sequence"],
      ["dynamic", prefix + "examples:\n  - name: '${CASE_ID}'\n    given: {}\n    then: {}\nreconciliation: []\n", "dynamic or malformed"],
    ];
    await writeProjectFile(rootDir, "specs/operations/021-queue.md", "# Queue contract\n");
    for (const [name, source, reason] of cases) {
      const file = `contract-data/operations/${name}.yaml`;
      await writeProjectFile(rootDir, file, source);
      const result = await readSpecCarriers({ rootDir, profile: carrierTestProfile, selectedFiles: [file], readText: diskReader(rootDir) });
      assert.deepEqual(result.records, [], name);
      assert.ok(result.unknown.some(item => item.code === "UNKNOWN" && item.file === file && item.span && item.reason.includes(reason)), name);
    }
  });
});

test("dynamic path bases and mutable YAML paths cannot create executor evidence", async t => {
  // Given: selected YAML contracts referenced through an environment-derived base or reassigned variable.
  // When: native carrier provenance is resolved without executing the source.
  // Then: neither unsupported path form produces a YAML coverage record.
  // Business Intent / Invariant Guarded: an executor link names only the file statically proven to be read.
  // Failure Signal: either selected contract gains YAML records or lacks an unresolved-executor finding.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const cases = [
      ["dynamic-base", `const contractPath = path.resolve(process.env.CONTRACT_ROOT, 'contract-data/operations/dynamic-base.yaml');`],
      ["mutable-path", `let contractPath = 'contract-data/operations/mutable-path.yaml';\ncontractPath = process.env.CONTRACT_PATH;`],
    ];
    await writeProjectFile(rootDir, "specs/operations/021-queue.md", "# Queue contract\n");
    for (const [name, pathSetup] of cases) {
      const yamlFile = `contract-data/operations/${name}.yaml`;
      const executorFile = `checks/operations/${name}.test.js`;
      await writeProjectFile(rootDir, yamlFile, yamlContract("SCN-OPS-1", "  - name: queued\n    given: {quantity: 2}\n    then: {accepted: true}\n"));
      await writeProjectFile(rootDir, executorFile, `
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
${pathSetup}
const contract = parse(readFileSync(contractPath, 'utf8'));
const cases = [...contract.examples, ...contract.reconciliation].map(row => adapt(row));
describe('operations/021 REQ-1', () => it('runs rows', () => cases.forEach(run)));
`);
      const result = await readSpecCarriers({
        rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir),
      });

      assert.deepEqual(result.records.filter(record => record.dialect === "yaml-cases-v1"), [], name);
      assert.ok(result.unknown.some(item => item.file === executorFile && item.code === "UNRESOLVED_EXECUTOR"), name);
    }
  });
});
