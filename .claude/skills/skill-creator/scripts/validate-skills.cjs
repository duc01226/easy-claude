#!/usr/bin/env node

/**
 * validate-skills.cjs
 *
 * Scans all SKILL.md files, validates YAML frontmatter against official Claude Code schema,
 * reports invalid fields, and optionally fixes them (--fix flag).
 *
 * Usage:
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs           # Report only
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs --fix     # Report + auto-fix
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs --path <dir>  # Scan specific dir
 *
 * Official schema: https://code.claude.com/docs/en/skills
 */

const fs = require('fs');
const path = require('path');

// The validator is also a portable release artifact: users may copy this
// script (and a skills tree) without the rest of this repository.  Prefer the
// project's shared root resolver when it is available, but never make that
// repository-only helper a hard runtime dependency.
let resolveProjectRoot;
try {
  ({ resolveProjectRoot } = require('../../../scripts/lib/project-root.cjs'));
} catch (_) {
  resolveProjectRoot = null;
}

function fallbackProjectRoot({ cwd, env, mutation = false }) {
  const explicit = env && typeof env.CLAUDE_PROJECT_DIR === 'string'
    ? env.CLAUDE_PROJECT_DIR.trim()
    : '';
  if (explicit && mutation) {
    if (!path.isAbsolute(explicit)) throw new Error('CLAUDE_PROJECT_DIR must be an absolute path');
    let exists = false;
    try { exists = fs.statSync(explicit).isDirectory(); } catch (_) {}
    if (!exists) throw new Error('CLAUDE_PROJECT_DIR must name an existing directory');
  }
  if (explicit && path.isAbsolute(explicit)) return path.resolve(explicit);

  let current = path.resolve(cwd || process.cwd());
  while (true) {
    if (fs.existsSync(path.join(current, '.claude'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(cwd || process.cwd());
}

// --- Configuration ---
const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
let PROJECT_ROOT;
try {
  if (resolveProjectRoot) {
    const resolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
    if (FIX_MODE && resolution.error) throw new Error(resolution.error);
    PROJECT_ROOT = resolution.rootDir;
  } else {
    PROJECT_ROOT = fallbackProjectRoot({ cwd: process.cwd(), env: process.env, mutation: FIX_MODE });
  }
} catch (error) {
  if (FIX_MODE) {
    console.error(`Refusing to fix skills: ${error.message}`);
    process.exit(2);
  }
  PROJECT_ROOT = fallbackProjectRoot({ cwd: process.cwd(), env: process.env });
}
const pathArg = args.indexOf('--path');
const requestedScan = pathArg !== -1 && args[pathArg + 1]
  ? path.resolve(PROJECT_ROOT, args[pathArg + 1])
  : path.resolve(PROJECT_ROOT, '.claude/skills');

function canonicalIfPresent(target) {
  try { return fs.realpathSync.native(target); } catch (_) { return path.resolve(target); }
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

const PROJECT_ROOT_CANONICAL = canonicalIfPresent(PROJECT_ROOT);
const SCAN_DIR = canonicalIfPresent(requestedScan);
if (!isWithin(PROJECT_ROOT_CANONICAL, SCAN_DIR)) {
  console.error(`Refusing to scan outside project root: ${requestedScan}`);
  process.exit(2);
}

// Official Claude Code SKILL.md frontmatter fields
// Source: https://code.claude.com/docs/en/skills
const VALID_FIELDS = new Set([
  'name',
  'description',
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',
  'allowed-tools',
  'model',
  'context',
  'agent',
  'hooks',
  'license',
]);

// --- Project-configurable convention fields (portability) ---
// This script ships GENERIC. Project-specific frontmatter conventions (version,
// triggers, execution-mode, etc.) are NOT hardcoded — they are declared per-project
// in `docs/project-config.json` under `skillConventions`, so the same validator drops
// into any repo without source edits. With no config, only the official Anthropic
// schema is accepted (strict mode) plus the universal deprecation/typo fixes below.
//
// project-config.json shape:
//   "skillConventions": {
//     "conventionFields": ["version", "activation", "triggers"],  // → INFO, not ERROR
//     "removableFields":  ["infer"],                              // → WARN + (--fix) remove
//     "fieldFixes":       { "tools": "allowed-tools" }            // → WARN + (--fix) rename
//   }

// Universal defaults — these are objectively-wrong fields, not project taste:
// `infer` is a deprecated Claude field; `tools` is the canonical typo for `allowed-tools`.
const DEFAULT_REMOVABLE_FIELDS = ['infer'];
const DEFAULT_FIELD_FIXES = { 'tools': 'allowed-tools' };
// Lifecycle metadata is consumed by the portable catalog/GC tooling itself,
// so it is a framework convention rather than an unknown vendor field. The
// validator still validates its values below; accepting the names must not
// turn malformed lifecycle state into a silent pass.
const DEFAULT_LIFECYCLE_FIELDS = ['status', 'deprecated_by', 'deprecated_since', 'removal_after'];
const LIFECYCLE_STATUSES = new Set(['active', 'deprecated', 'experimental']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Other convention fields remain fully project-driven.
const DEFAULT_CONVENTION_FIELDS = [];

/**
 * Load skill-convention config from the project's project-config.json.
 * Honors the configured portability path (.ck.json portability.projectConfigPath)
 * when the hooks loader is present; otherwise falls back to docs/project-config.json.
 * Degrades to generic defaults when no config exists — works in any project.
 */
function loadSkillConventions() {
  let configPath = path.resolve(PROJECT_ROOT, 'docs/project-config.json');
  try {
    const loader = require(path.resolve(PROJECT_ROOT, '.claude/hooks/lib/project-config-loader.cjs'));
    if (loader && loader.CONFIG_PATH) configPath = loader.CONFIG_PATH;
  } catch { /* hooks loader absent — use default path */ }

  let sc = {};
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg && typeof cfg.skillConventions === 'object') sc = cfg.skillConventions;
  } catch { /* no/invalid config — generic defaults only */ }

  const convention = Array.isArray(sc.conventionFields) ? sc.conventionFields : [];
  const removable = Array.isArray(sc.removableFields) ? sc.removableFields : [];
  const fixes = (sc.fieldFixes && typeof sc.fieldFixes === 'object') ? sc.fieldFixes : {};

  return {
    conventionFields: new Set([...DEFAULT_CONVENTION_FIELDS, ...DEFAULT_LIFECYCLE_FIELDS, ...convention]),
    removableFields: new Set([...DEFAULT_REMOVABLE_FIELDS, ...removable]),
    fieldFixes: { ...DEFAULT_FIELD_FIXES, ...fixes },
    configPath,
    configured: Object.keys(sc).length > 0,
  };
}

const SKILL_CONVENTIONS = loadSkillConventions();
// Project convention fields → flagged INFO, not ERROR.
const PROJECT_CONVENTION_FIELDS = SKILL_CONVENTIONS.conventionFields;
// Removable fields → WARN, removed by --fix.
const REMOVABLE_FIELDS = SKILL_CONVENTIONS.removableFields;
// Field typos/aliases → WARN, renamed by --fix.
const FIELD_FIXES = SKILL_CONVENTIONS.fieldFixes;

// --- Helpers ---

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Returns { fields: Map<string, {line, value, lines}>, startLine, endLine, raw, allLines }
 */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return null;

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return null;

  const fields = new Map();
  let currentField = null;

  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const fieldMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (fieldMatch) {
      currentField = fieldMatch[1];
      fields.set(currentField, { line: i, value: fieldMatch[2], lines: [i] });
    } else if (currentField && (line.startsWith('  ') || line.startsWith('\t'))) {
      const existing = fields.get(currentField);
      if (existing) existing.lines.push(i);
    }
  }

  return {
    fields,
    startLine: 0,
    endLine: endIdx,
    raw: lines.slice(0, endIdx + 1).join('\n'),
    allLines: lines,
  };
}

/**
 * Find all SKILL.md files recursively.
 */
function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // `_templates/template-skill` is a scaffolding source, not a runnable
      // skill. The catalog and scan_skills.py exclude it, so the validator must
      // share that inventory boundary instead of reporting a phantom skill.
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'template-skill') continue;
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name === 'SKILL.md') {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if description spans multiple YAML lines (breaks catalog parsing).
 */
function isMultilineDescription(fm) {
  const desc = fm.fields.get('description');
  if (!desc) return false;
  return desc.lines.length > 1;
}

function scalarFieldValue(fm, field) {
  const entry = fm.fields.get(field);
  if (!entry) return null;
  const value = String(entry.value || '').trim();
  if (!value || /^null$/i.test(value) || /^~$/.test(value)) return null;
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function isIsoCalendarDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validate the lifecycle metadata consumed by generate_catalogs.py/scan_skills.py.
 * These fields are framework conventions, but malformed lifecycle state must
 * fail rather than silently changing catalog inclusion or deprecation timing.
 */
function validateLifecycle(fm, result) {
  const status = scalarFieldValue(fm, 'status') || 'active';
  if (!LIFECYCLE_STATUSES.has(status)) {
    result.issues.push({
      severity: 'error', field: 'status',
      message: `Unknown lifecycle status "${status}" — expected active, deprecated, or experimental`,
    });
  }

  const deprecatedBy = scalarFieldValue(fm, 'deprecated_by');
  const deprecatedSince = scalarFieldValue(fm, 'deprecated_since');
  const removalAfter = scalarFieldValue(fm, 'removal_after');

  if (status === 'deprecated' && !deprecatedBy) {
    result.issues.push({ severity: 'error', field: 'deprecated_by', message: 'Deprecated skills must name a replacement in deprecated_by' });
  }
  if (status !== 'deprecated' && (deprecatedBy || deprecatedSince || removalAfter)) {
    result.issues.push({
      severity: 'error', field: 'status',
      message: 'deprecated_by, deprecated_since, and removal_after require status: deprecated',
    });
  }

  for (const [field, value] of [['deprecated_since', deprecatedSince], ['removal_after', removalAfter]]) {
    if (value && !isIsoCalendarDate(value)) {
      result.issues.push({ severity: 'error', field, message: `Lifecycle field "${field}" must use ISO date YYYY-MM-DD` });
    }
  }
  if (deprecatedSince && removalAfter && isIsoCalendarDate(deprecatedSince) && isIsoCalendarDate(removalAfter) && removalAfter < deprecatedSince) {
    result.issues.push({ severity: 'error', field: 'removal_after', message: 'removal_after must not precede deprecated_since' });
  }
}

/**
 * Report structural body issues without adding destructive auto-fixes.
 */
function validateBody(fm, result) {
  const summaryIndex = fm.allLines.findIndex((line, index) =>
    index > fm.endLine && /^## Quick Summary\s*$/.test(line));
  if (summaryIndex === -1 || summaryIndex >= 30) {
    result.issues.push({
      severity: 'warn', field: null,
      message: `Quick Summary must appear in the first 30 lines (${summaryIndex === -1 ? 'missing' : `found at line ${summaryIndex + 1}`})`,
    });
  }

  const stack = [];
  let fence = null;
  for (let index = fm.endLine + 1; index < fm.allLines.length; index++) {
    const sourceLine = fm.allLines[index];
    const trimmedLine = sourceLine.trimStart();
    let fenceLength = 0;
    if (trimmedLine.startsWith('```') || trimmedLine.startsWith('~~~')) {
      const marker = trimmedLine[0];
      while (trimmedLine[fenceLength] === marker) fenceLength++;
      if (fenceLength >= 3 && !fence) fence = { marker, length: fenceLength };
      else if (fence && fence.marker === marker && fenceLength >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    // Standalone fences only: inline examples and fenced code samples are
    // prose/data, not live protocol carriers.
    const match = fm.allLines[index].match(/^<!--\s*(\/?)SYNC:([^\s<>]+)\s*-->\s*$/);
    if (!match) continue;

    const [, closing, tag] = match;
    const line = index + 1;
    if (!closing) {
      stack.push({ tag, line });
      continue;
    }

    const expected = stack[stack.length - 1];
    if (!expected) {
      result.issues.push({ severity: 'error', field: null, message: `Unexpected SYNC close "${tag}" at line ${line}` });
    } else if (expected.tag !== tag) {
      result.issues.push({
        severity: 'error', field: null,
        message: `Mismatched SYNC close "${tag}" at line ${line}; expected "${expected.tag}" opened at line ${expected.line}`,
      });
    } else {
      stack.pop();
    }
  }

  for (const { tag, line } of stack) {
    result.issues.push({ severity: 'error', field: null, message: `Unclosed SYNC tag "${tag}" opened at line ${line}` });
  }
}

/**
 * Validate a single SKILL.md file.
 * Returns { path, issues[], fixes[] }
 */
function validateSkill(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const result = { path: relPath, issues: [], fixes: [] };

  const fm = parseFrontmatter(content);
  if (!fm) {
    result.issues.push({ severity: 'error', field: null, message: 'No YAML frontmatter found' });
    return result;
  }

  validateBody(fm, result);
  validateLifecycle(fm, result);

  // Missing description
  if (!fm.fields.has('description')) {
    result.issues.push({ severity: 'warn', field: 'description', message: 'Missing description (recommended for auto-activation)' });
  }

  // Multi-line description (breaks catalog parsing)
  if (isMultilineDescription(fm)) {
    result.issues.push({
      severity: 'error',
      field: 'description',
      message: 'Multi-line description detected — catalog parsing may fail. Collapse to single-line quoted string.',
    });
  }

  // Description without category prefix
  if (fm.fields.has('description')) {
    const descVal = fm.fields.get('description').value || '';
    const stripped = descVal.replace(/^['"]/, '');
    if (stripped && !stripped.startsWith('[')) {
      result.issues.push({
        severity: 'info',
        field: 'description',
        message: 'Description missing [Category] prefix (convention: start with [Category])',
      });
    }
  }

  // Name format check
  if (fm.fields.has('name')) {
    const nameVal = fm.fields.get('name').value || '';
    const cleanName = nameVal.replace(/^['"]|['"]$/g, '');
    if (cleanName && !/^[a-z0-9][a-z0-9-]*$/.test(cleanName)) {
      result.issues.push({
        severity: 'error',
        field: 'name',
        message: `Invalid name "${cleanName}" — must be lowercase, hyphens, start with letter/number`,
      });
    }
    if (cleanName.length > 64) {
      result.issues.push({
        severity: 'error',
        field: 'name',
        message: `Name exceeds 64 chars (${cleanName.length})`,
      });
    }
  }

  // Check each field against schema
  for (const [field] of fm.fields) {
    if (VALID_FIELDS.has(field)) continue;

    if (PROJECT_CONVENTION_FIELDS.has(field)) {
      result.issues.push({
        severity: 'info',
        field,
        message: `Field "${field}" — project convention, not in official schema (OK for this project)`,
      });
    } else if (REMOVABLE_FIELDS.has(field)) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Field "${field}" — not in official schema, ignored by runtime`,
      });
      result.fixes.push({ action: 'remove', field });
    } else if (field in FIELD_FIXES) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Field "${field}" — did you mean "${FIELD_FIXES[field]}"?`,
      });
      result.fixes.push({ action: 'rename', field, newField: FIELD_FIXES[field] });
    } else {
      result.issues.push({
        severity: 'error',
        field,
        message: `Unknown field "${field}" — not in official schema`,
      });
    }
  }

  // Check for infer→description migration
  if (fm.fields.has('infer') && fm.fields.has('description')) {
    const desc = fm.fields.get('description').value || '';
    if (!desc.toLowerCase().includes('trigger')) {
      result.issues.push({
        severity: 'info',
        field: 'infer',
        message: 'Consider moving infer keywords into description "Triggers on: ..." for auto-activation',
      });
    }
  }

  return result;
}

/**
 * Apply fixes to a SKILL.md file.
 */
function applyFixes(filePath, fixes) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fm = parseFrontmatter(content);
  if (!fm) return false;

  const linesToRemove = new Set();

  for (const fix of fixes) {
    const fieldInfo = fm.fields.get(fix.field);
    if (!fieldInfo) continue;

    if (fix.action === 'remove') {
      for (const lineIdx of fieldInfo.lines) {
        linesToRemove.add(lineIdx);
      }
    } else if (fix.action === 'rename') {
      const lineIdx = fieldInfo.line;
      lines[lineIdx] = lines[lineIdx].replace(
        new RegExp(`^${fix.field}:`),
        `${fix.newField}:`
      );
    }
  }

  const sortedRemoves = [...linesToRemove].sort((a, b) => b - a);
  for (const idx of sortedRemoves) {
    lines.splice(idx, 1);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return true;
}

// --- Main ---

function main() {
  console.log(`Scanning skills in: ${SCAN_DIR}`);
  console.log(`Mode: ${FIX_MODE ? 'REPORT + FIX' : 'REPORT ONLY'}\n`);

  const skillFiles = findSkillFiles(SCAN_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files\n`);

  let totalIssues = 0;
  let totalFixed = 0;
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  const results = [];

  for (const filePath of skillFiles) {
    const result = validateSkill(filePath);
    results.push(result);

    if (result.issues.length === 0) continue;

    totalIssues += result.issues.length;
    for (const issue of result.issues) {
      if (issue.severity === 'error') errorCount++;
      else if (issue.severity === 'warn') warnCount++;
      else infoCount++;
    }

    console.log(`${result.path}:`);
    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warn' ? 'WARN' : 'INFO';
      console.log(`  [${icon}] ${issue.message}`);
    }

    if (FIX_MODE && result.fixes.length > 0) {
      const applied = applyFixes(filePath, result.fixes);
      if (applied) {
        totalFixed += result.fixes.length;
        console.log(`  FIXED: ${result.fixes.map(f => `${f.action} "${f.field}"`).join(', ')}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('--- Summary ---');
  console.log(`Skills scanned: ${skillFiles.length}`);
  console.log(`Skills with issues: ${results.filter(r => r.issues.length > 0).length}`);
  console.log(`Total issues: ${totalIssues} (${errorCount} errors, ${warnCount} warnings, ${infoCount} info)`);
  if (FIX_MODE) console.log(`Fixes applied: ${totalFixed}`);

  console.log('\nValid frontmatter fields (official schema):');
  console.log(`  ${[...VALID_FIELDS].join(', ')}`);
  const conv = [...PROJECT_CONVENTION_FIELDS];
  console.log(`Project convention fields (accepted): ${conv.length ? conv.join(', ') : '(none — strict mode)'}`);
  console.log(`  Source: ${SKILL_CONVENTIONS.configured ? SKILL_CONVENTIONS.configPath + ' (skillConventions)' : 'generic defaults — no project-config.json skillConventions block'}`);
  console.log('Official schema: https://code.claude.com/docs/en/skills');

  return errorCount > 0 ? 1 : 0;
}

process.exit(main());
