import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const workflows = JSON.parse(
  fs.readFileSync(path.join(repoRoot, ".claude", "workflows.json"), "utf8")
).workflows;

function occurrence(sequence, id) {
  return sequence.find((step) => typeof step === "object" && step?.id === id);
}

function indexOfSkill(sequence, skill) {
  const index = sequence.findIndex((step) => (typeof step === "string" ? step === skill : step?.skill === skill));
  assert.ok(index >= 0, `required workflow skill is absent: ${skill}`);
  return index;
}

test("TC-EA-ROUTE-004: removing the E2E predecessor fails the ordering oracle", () => {
  const sequence = workflows["workflow-e2e"].sequence.filter(
    (step) => (typeof step === "string" ? step : step?.skill) !== "e2e-test"
  );
  assert.throws(() => indexOfSkill(sequence, "e2e-test"), /required workflow skill is absent: e2e-test/);
});

test("TC-EA-ROUTE-001: changes review routes the conditional experience gate after final holistic review", () => {
  const workflow = workflows["workflow-review-changes"];
  const experience = occurrence(workflow.sequence, "experience-review");

  assert.ok(experience, "workflow-review-changes must declare an experience-review occurrence");
  assert.equal(experience.skill, "experience-review");
  assert.match(experience.applicability.when, /configured|likely.*observable/i);
  assert.match(experience.applicability.skipReason, /NOT-APPLICABLE/i);
  assert.match(experience.applicability.skipReason, /evidence/i);
  assert.ok(indexOfSkill(workflow.sequence, "why-review") < workflow.sequence.indexOf(experience));
  assert.ok(workflow.sequence.indexOf(experience) < indexOfSkill(workflow.sequence, "scan --target=domain-entities"));
  assert.deepEqual(workflow.stepMeta["experience-review"], {
    executionMode: "inline",
    contextBudget: "medium",
  });
});

test("TC-EA-ROUTE-002: E2E update-ui routes candidate evidence through acceptance before regression tests", () => {
  const workflow = workflows["workflow-e2e"];
  const experience = occurrence(workflow.sequence, "experience-review");
  const e2eContext = workflow.preActions.injectContext;

  assert.ok(experience, "workflow-e2e must declare an experience-review occurrence");
  assert.ok(workflow.sequence.indexOf(experience) > indexOfSkill(workflow.sequence, "e2e-test"));
  assert.ok(workflow.sequence.indexOf(experience) < indexOfSkill(workflow.sequence, "test"));
  assert.match(e2eContext, /candidate evidence/i);
  assert.match(e2eContext, /explicit acceptance/i);
  assert.doesNotMatch(e2eContext, /regenerate screenshots \(--update-snapshots\)/i);
});

test("TC-EA-ROUTE-003: feature, bugfix, refactor, and greenfield paths inherit the gate", () => {
  for (const workflowId of [
    "workflow-feature",
    "workflow-bugfix",
    "workflow-refactor",
    "workflow-greenfield-init",
  ]) {
    assert.ok(
      indexOfSkill(workflows[workflowId].sequence, "workflow-review-changes") >= 0,
      `${workflowId} must route through workflow-review-changes`
    );
  }
});
