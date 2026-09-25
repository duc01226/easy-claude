#!/usr/bin/env node
/**
 * CK Config Schema Validator
 *
 * Validates .claude/.ck.json against the expected schema structure.
 * Catches typos, invalid values, and unknown keys with warnings (never blocks).
 *
 * Usage:
 *   const { validateCkConfig, CK_SCHEMA } = require('./lib/ck-config-schema.cjs');
 *   const result = validateCkConfig(config);
 *   // result = { valid: true, errors: [], warnings: [] }
 */
"use strict";

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

// Workflow activation tiers. Lockstep with WORKFLOW_ACTIVATION_TIERS in project-config-schema.cjs
// and ACTIVATION_TIERS in .claude/scripts/lib/workflow-routing-config.cjs (asserted by the
// workflow-skills-catalog suite); kept local so this validator loads without the larger schema.
const WORKFLOW_ACTIVATION_TIERS = ["auto", "confirm", "manual"];

const CK_SCHEMA = {
  locale: {
    type: "object",
    required: false,
    properties: {
      thinkingLanguage: { type: "string", required: false, nullable: true },
      responseLanguage: { type: "string", required: false, nullable: true },
    },
  },
  assertions: { type: "array", required: false, itemType: "string" },
  plan: { type: "object", required: false, freeform: true },
  paths: {
    type: "object",
    required: false,
    properties: {
      docs: { type: "string", required: false },
      plans: { type: "string", required: false },
    },
  },
  trust: { type: "object", required: false, freeform: true },
  project: { type: "object", required: false, freeform: true },
  codeReview: { type: "object", required: false, freeform: true },
  subagent: { type: "object", required: false, freeform: true },
  referenceDocs: {
    type: "object",
    required: false,
    properties: {
      staleDays: { type: "number", required: false, min: 1, max: 365 },
    },
  },
  // Session prompt ledger (docs/specs/ContextDelivery/README.SessionPromptLedger.md).
  // Recording is on by default; `enabled: false` (or CK_PROMPT_LEDGER=0) switches it off.
  promptLedger: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
      maxPromptChars: { type: "number", required: false, min: 200, max: 20000 },
      maxEntries: { type: "number", required: false, min: 2, max: 1000 },
      reinjectAfterBytes: { type: "number", required: false, min: 50000, max: 1000000000 },
      reinjectAfterMinutes: { type: "number", required: false, min: 1, max: 1440 },
    },
  },
  // Advisory UserPromptSubmit routers. On by default; `enabled: false` (or the env switch
  // CK_COMMIT_SKILL_ROUTE=0 / CK_JUDGEMENT_INTEGRITY_ROUTE=0) switches one off.
  commitSkillRoute: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  judgementIntegrityRoute: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  portability: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
      rule: { type: "string", required: false },
      projectConfigPath: { type: "string", required: false },
      docsIndexPath: { type: "string", required: false },
      workflowAutoDetect: { type: "boolean", required: false },
      // Optional custom protocol appended to the runtime workflow-route reminder. A string is
      // inline markdown; an object carries inline `text` and/or a repo-relative `path`. The
      // tracked team value lives in the project-config file; a developer overrides it in
      // git-ignored `.claude/.ck.local.json` (local replaces team).
      workflowRouteProtocol: {
        type: "union",
        required: false,
        oneOf: [
          { type: "string" },
          {
            type: "object",
            properties: {
              text: { type: "string", required: false },
              path: { type: "string", required: false },
            },
          },
        ],
      },
      requireUniversalGuides: { type: "boolean", required: false },
      // Per-project workflow activation tiers (auto < confirm < manual). The tracked team value
      // lives in the project-config file; a developer overrides it in git-ignored
      // `.claude/.ck.local.json` (a later valid `default` / per-workflow override wins).
      workflowActivation: {
        type: "object",
        required: false,
        properties: {
          default: { type: "string", required: false, enum: WORKFLOW_ACTIVATION_TIERS },
          overrides: { type: "map", required: false, valuesEnum: WORKFLOW_ACTIVATION_TIERS },
        },
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a value against a field schema.
 * @param {any} value - The value to validate
 * @param {object} fieldSchema - Schema definition for this field
 * @param {string} path - Dot-notation path for error messages
 * @param {string[]} errors - Accumulated errors
 * @param {string[]} warnings - Accumulated warnings
 */
function validateField(value, fieldSchema, path, errors, warnings) {
  // Handle null for nullable fields
  if (value === null) {
    if (fieldSchema.nullable) return;
    if (fieldSchema.required) {
      errors.push(`${path}: required field is missing`);
    }
    return;
  }

  // Handle undefined
  if (value === undefined) {
    if (fieldSchema.required) {
      errors.push(`${path}: required field is missing`);
    }
    return;
  }

  // Union field: valid when it satisfies ANY alternative. Used by
  // `portability.workflowRouteProtocol` (inline string | { text?, path? }).
  if (Array.isArray(fieldSchema.oneOf)) {
    const failedTypes = [];
    for (const alternative of fieldSchema.oneOf) {
      const altErrors = [];
      const altWarnings = [];
      validateField(value, alternative, path, altErrors, altWarnings);
      if (altErrors.length === 0) {
        warnings.push(...altWarnings);
        return;
      }
      failedTypes.push(alternative.type || "value");
    }
    errors.push(`${path}: expected one of ${failedTypes.join(" | ")}`);
    return;
  }

  switch (fieldSchema.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push(`${path}: expected string, got ${typeof value}`);
        return;
      }
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `${path}: invalid value "${value}" — expected one of: ${fieldSchema.enum.join(", ")}`,
        );
      }
      break;

    case "number":
      if (typeof value !== "number") {
        errors.push(`${path}: expected number, got ${typeof value}`);
        return;
      }
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        errors.push(
          `${path}: value ${value} is below minimum ${fieldSchema.min}`,
        );
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        errors.push(
          `${path}: value ${value} exceeds maximum ${fieldSchema.max}`,
        );
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push(`${path}: expected boolean, got ${typeof value}`);
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
        return;
      }
      if (fieldSchema.itemType) {
        value.forEach((item, i) => {
          if (typeof item !== fieldSchema.itemType) {
            errors.push(
              `${path}[${i}]: expected ${fieldSchema.itemType}, got ${typeof item}`,
            );
          }
        });
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(
          `${path}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`,
        );
        return;
      }
      if (fieldSchema.freeform) break;
      if (fieldSchema.properties) {
        for (const [propName, propSchema] of Object.entries(
          fieldSchema.properties,
        )) {
          validateField(
            value[propName],
            propSchema,
            `${path}.${propName}`,
            errors,
            warnings,
          );
        }
        for (const key of Object.keys(value)) {
          if (!fieldSchema.properties[key]) {
            warnings.push(`${path}.${key}: unknown property (not in schema)`);
          }
        }
      }
      break;

    // Map: an object with arbitrary keys whose every value is one of `valuesEnum`
    // (e.g. `portability.workflowActivation.overrides`: { <workflowId>: tier }).
    case "map":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(
          `${path}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`,
        );
        return;
      }
      for (const [key, entry] of Object.entries(value)) {
        if (Array.isArray(fieldSchema.valuesEnum) && !fieldSchema.valuesEnum.includes(entry)) {
          errors.push(
            `${path}.${key}: invalid value ${JSON.stringify(entry)} — expected one of: ${fieldSchema.valuesEnum.join(", ")}`,
          );
        }
      }
      break;

    default:
      warnings.push(`${path}: unknown schema type "${fieldSchema.type}"`);
  }
}

/**
 * Validate a .ck.json config object against the schema.
 * @param {object} config - The parsed .ck.json content
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateCkConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      valid: false,
      errors: ["Config must be a non-null object"],
      warnings: [],
    };
  }

  // Validate each top-level section
  for (const [key, fieldSchema] of Object.entries(CK_SCHEMA)) {
    validateField(config[key], fieldSchema, key, errors, warnings);
  }

  // Check for unknown top-level keys
  const knownKeys = new Set(Object.keys(CK_SCHEMA));
  for (const key of Object.keys(config)) {
    if (!knownKeys.has(key)) {
      warnings.push(`${key}: unknown top-level key (not in schema)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format validation result as a readable string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
function formatCkValidationResult(result) {
  const lines = [];
  if (result.valid) {
    lines.push(".ck.json validation: PASSED");
  } else {
    lines.push(".ck.json validation: FAILED");
    lines.push("");
    lines.push("Errors:");
    for (const err of result.errors) {
      lines.push(`  - ${err}`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warn of result.warnings) {
      lines.push(`  - ${warn}`);
    }
  }
  return lines.join("\n");
}

module.exports = { CK_SCHEMA, WORKFLOW_ACTIVATION_TIERS, validateCkConfig, formatCkValidationResult };

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const fs = require("fs");
  const configPath = process.argv[2] || ".claude/.ck.json";
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const result = validateCkConfig(config);
    console.log(formatCkValidationResult(result));
    process.exit(result.valid ? 0 : 1);
  } catch (e) {
    console.error("Failed: " + e.message);
    process.exit(1);
  }
}
