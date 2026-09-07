"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const SLUG = /^[a-z][a-z0-9-]*$/;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const nonempty = value => typeof value === "string" && value.trim().length > 0;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function fields(value, allowed, label) {
  check(isObject(value), `Invalid ${label}: expected object`);
  for (const key of Object.keys(value)) check(allowed.includes(key), `Unknown ${label} field: ${key}`);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function listWorkflowModes(entry) {
  check(isObject(entry), "Invalid workflow entry");
  if (!own(entry, "variants")) {
    check(!own(entry, "defaultMode"), "defaultMode requires variants");
    return ["default"];
  }
  check(isObject(entry.variants) && Object.keys(entry.variants).length > 0, "Invalid workflow variants");
  const modes = Object.keys(entry.variants);
  for (const mode of modes) check(SLUG.test(mode), `Invalid workflow mode: ${mode}`);
  check(own(entry, "defaultMode") && typeof entry.defaultMode === "string" && own(entry.variants, entry.defaultMode), "Invalid defaultMode: must name a declared variant");
  return modes;
}

function normalizeApplicability(value, id) {
  if (value === undefined) return { when: "always", skipReason: null };
  fields(value, ["when", "skipReason"], `applicability for ${id}`);
  check(nonempty(value.when) && nonempty(value.skipReason), `Invalid applicability for ${id}: when and skipReason are required`);
  return { when: value.when, skipReason: value.skipReason };
}

function normalizeGroups(groups, records, legacyKeys) {
  check(Array.isArray(groups), "Invalid parallelGroups: expected array");
  const groupIds = new Set();
  const assigned = new Set();
  const resolveMember = key => {
    check(nonempty(key), "Invalid barrier member");
    // Explicit semantic IDs and legacy command references share one namespace;
    // accepting a collision would silently bind a barrier to the wrong task.
    const candidates = records.filter(record => record.id === key || legacyKeys.get(record.id) === key);
    check(candidates.length === 1, `Missing or ambiguous barrier member: ${key}`);
    return candidates[0];
  };
  return groups.map(group => {
    fields(group, ["id", "members", "conditionalMembers", "barrier"], "parallel group");
    check(nonempty(group.id) && !groupIds.has(group.id), `Invalid or duplicate barrier ID: ${group.id}`);
    groupIds.add(group.id);
    check(group.barrier === true, `Barrier ${group.id} must be true`);
    check(Array.isArray(group.members) && group.members.length >= 2, `Barrier ${group.id} needs at least two members`);
    const members = group.members.map(resolveMember);
    check(new Set(members.map(x => x.id)).size === members.length, `Duplicate members in barrier ${group.id}`);
    const positions = members.map(member => records.indexOf(member)).sort((a, b) => a - b);
    check(positions.every((position, index) => position === positions[0] + index), `Noncontiguous barrier ${group.id}`);
    const conditional = group.conditionalMembers === undefined ? [] : group.conditionalMembers;
    check(Array.isArray(conditional), `Invalid conditionalMembers in barrier ${group.id}`);
    const conditionalRecords = conditional.map(resolveMember);
    check(new Set(conditionalRecords.map(x => x.id)).size === conditionalRecords.length, `Duplicate conditionalMembers in barrier ${group.id}`);
    check(conditionalRecords.every(record => members.includes(record)), `Conditional member outside barrier ${group.id}`);
    for (const member of members) {
      check(!assigned.has(member.id), `Overlapping barrier member: ${member.id}`);
      assigned.add(member.id);
      member.barrier = group.id;
    }
    for (const member of conditionalRecords) {
      if (member.applicability.when === "always") {
        member.applicability = { when: "Evaluate the skill's documented conditional trigger", skipReason: "Record why the documented trigger is absent" };
      }
    }
    return { id: group.id, members: members.map(x => x.id), conditionalMembers: conditionalRecords.map(x => x.id), barrier: true };
  });
}

/**
 * Resolve one complete workflow mode without executing commands or filtering tasks.
 * args is opaque skill-invocation text, never shell text. Explicit occurrence IDs
 * survive insertion; synthesized legacy IDs are scoped to source version/content.
 * availableSkills accepts an iterable for fixtures; otherwise canonical SKILL.md
 * files under rootDir are required. Consumers persist fingerprint for resume.
 */
function resolveWorkflowManifest(document, workflowId, options = {}) {
  check(isObject(document) && isObject(document.workflows), "Invalid workflow registry");
  check(typeof workflowId === "string" && own(document.workflows, workflowId), `Unknown workflow ID: ${workflowId}`);
  const entry = document.workflows[workflowId];
  const modes = listWorkflowModes(entry);
  const mode = own(options, "mode") ? options.mode : (entry.defaultMode ?? "default");
  check(typeof mode === "string" && modes.includes(mode), `Unknown workflow mode: ${String(mode)} for ${workflowId}`);
  const selected = own(entry, "variants") ? entry.variants[mode] : entry;
  if (own(entry, "variants")) fields(selected, ["sequence", "parallelGroups", "stepMeta"], `variant ${mode}`);
  check(isObject(selected) && Array.isArray(selected.sequence) && selected.sequence.length > 0, `Invalid sequence for ${workflowId}/${mode}`);
  const sourceVersion = document.version === undefined ? "unversioned" : document.version;
  check(nonempty(sourceVersion), "Invalid workflow source version");
  const sourceHash = digest({ sourceVersion, workflow: workflowId, entry });
  const skills = options.availableSkills === undefined ? null : new Set(options.availableSkills);
  const rootDir = options.rootDir ?? path.resolve(__dirname, "../../..");
  const ids = new Set();
  const legacyKeys = new Map();
  const occurrences = selected.sequence.map((step, index) => {
    let record;
    if (typeof step === "string") {
      check(!own(entry, "variants"), `Variant ${mode} requires explicit occurrence objects`);
      const match = step.trim().match(/^([a-z][a-z0-9-]*)(?:\s+([\s\S]*))?$/);
      check(match, `Invalid legacy command: ${step}`);
      record = { id: `legacy-${sourceVersion}-${sourceHash.slice(0, 16)}-${index + 1}`, skill: match[1], args: match[2] ?? "", applicability: normalizeApplicability(undefined), barrier: null };
      legacyKeys.set(record.id, step);
    } else {
      fields(step, ["id", "skill", "args", "applicability"], "occurrence");
      check(typeof step.id === "string" && SLUG.test(step.id), `Invalid occurrence ID: ${step.id}`);
      check(typeof step.skill === "string" && SLUG.test(step.skill), `Invalid skill: ${step.skill}`);
      check(step.args === undefined || typeof step.args === "string", `Invalid args for ${step.id}`);
      record = { id: step.id, skill: step.skill, args: step.args ?? "", applicability: normalizeApplicability(step.applicability, step.id), barrier: null };
    }
    check(!ids.has(record.id), `Duplicate occurrence ID: ${record.id}`);
    ids.add(record.id);
    check(skills ? skills.has(record.skill) : fs.existsSync(path.join(rootDir, ".claude", "skills", record.skill, "SKILL.md")), `Missing skill: ${record.skill}`);
    return record;
  });
  const parallelGroups = normalizeGroups(selected.parallelGroups === undefined ? [] : selected.parallelGroups, occurrences, legacyKeys);
  const stepMeta = {};
  const metadata = selected.stepMeta === undefined ? {} : selected.stepMeta;
  check(isObject(metadata), "Invalid stepMeta");
  for (const [key, meta] of Object.entries(metadata)) {
    const targets = occurrences.filter(record => record.id === key || legacyKeys.get(record.id) === key);
    check(targets.length > 0, `Unknown stepMeta target: ${key}`);
    fields(meta, ["executionMode", "contextBudget"], `stepMeta ${key}`);
    check(meta.executionMode === undefined || ["subagent", "inline"].includes(meta.executionMode), `Invalid executionMode for ${key}`);
    check(meta.contextBudget === undefined || ["low", "medium", "high", "critical"].includes(meta.contextBudget), `Invalid contextBudget for ${key}`);
    for (const target of targets) Object.defineProperty(stepMeta, target.id, { value: { ...meta }, enumerable: true });
  }
  const fingerprint = digest({ sourceHash, mode, occurrences, parallelGroups, stepMeta });
  return { workflow: workflowId, mode, sourceVersion, fingerprint, occurrences,
    sequence: occurrences.map(({ skill, args }) => args ? `${skill} ${args}` : skill), parallelGroups, stepMeta };
}

function resolveAllWorkflowManifests(document, workflowId, options = {}) {
  check(isObject(document?.workflows) && own(document.workflows, workflowId), `Unknown workflow ID: ${workflowId}`);
  return listWorkflowModes(document.workflows[workflowId]).map(mode => resolveWorkflowManifest(document, workflowId, { ...options, mode }));
}

module.exports = { resolveWorkflowManifest, resolveAllWorkflowManifests, listWorkflowModes };
