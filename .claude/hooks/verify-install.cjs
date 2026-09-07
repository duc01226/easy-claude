#!/usr/bin/env node
'use strict';
/**
 * SessionStart Hook — Install integrity preflight (runs FIRST).
 *
 * Fires: SessionStart (startup|resume|clear|compact)
 * Purpose: Detect a PARTIAL .claude install — the common failure when the folder
 *          was copied with a non-git-aware tool that dropped hook `lib/*.cjs`
 *          files. Without this, the sibling hooks each throw a raw Node
 *          `Cannot find module` stack trace (node:internal/modules/cjs/loader),
 *          producing N confusing errors instead of one actionable message.
 *
 * Design constraints:
 *   - ZERO required local dependencies — shared root discovery is optional;
 *     builtin fallback must survive the missing modules being diagnosed.
 *   - Always non-blocking: exit 0 regardless. Emits at most ONE warning block.
 *
 * Exit Codes: 0 — always (non-blocking).
 */

const fs = require('fs');
const path = require('path');
let projectDir;
let hooksDir;
let bootstrapWarning = '';

// This read-only fallback must not import the payload it is checking. Keep the
// same explicit-root / cwd-ancestor / script-ancestor order as the shared owner.
function bootstrapRoot() {
  const explicit = process.env.CLAUDE_PROJECT_DIR?.trim();
  if (explicit) return path.isAbsolute(explicit) ? path.resolve(explicit) : process.cwd();
  for (const start of [process.cwd(), __dirname]) {
    let current = path.resolve(start);
    while (true) {
      try {
        if (fs.statSync(path.join(current, '.claude')).isDirectory()) return current;
      } catch {}
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return process.cwd();
}

const HOOK_REF = /\.claude[\\/]hooks[\\/]([\w.\-]+(?:[\\/][\w.\-]+)*\.(?:cjs|js))/g;
const REL_REQUIRE = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function readSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** Hook entry files referenced by settings.json (relative to hooks dir). */
function referencedHooks(settingsRaw) {
  const refs = new Set();
  let m;
  while ((m = HOOK_REF.exec(settingsRaw)) !== null) {
    refs.add(m[1].replace(/\\/g, '/'));
  }
  return [...refs];
}

/** Direct relative require targets of a hook source (one level deep). */
function relativeRequires(src, fromDir) {
  const missing = [];
  let m;
  while ((m = REL_REQUIRE.exec(src)) !== null) {
    let target = m[1];
    if (!/\.(cjs|js|json)$/.test(target)) target += '.cjs';
    const resolved = path.resolve(fromDir, target);
    if (!fs.existsSync(resolved)) {
      missing.push(path.relative(hooksDir, resolved).replace(/\\/g, '/'));
    }
  }
  return missing;
}

function main() {
  try {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
  } catch {
    projectDir = bootstrapRoot();
    bootstrapWarning = '   Root helper unavailable — restore .claude/hooks/lib and its dependencies.\n';
  }
  hooksDir = path.join(projectDir, '.claude', 'hooks');
  const settingsRaw = readSafe(path.join(projectDir, '.claude', 'settings.json'));
  if (!settingsRaw) return; // Not an easy-claude project — nothing to verify.

  const missing = new Set();

  for (const rel of referencedHooks(settingsRaw)) {
    const entry = path.join(hooksDir, rel);
    if (!fs.existsSync(entry)) {
      missing.add(rel);
      continue; // Can't scan deps of a file that isn't there.
    }
    const src = readSafe(entry);
    if (src) for (const dep of relativeRequires(src, path.dirname(entry))) missing.add(dep);
  }

  if (missing.size === 0 && !bootstrapWarning) return;

  const list = [...missing].sort();
  const shown = list.slice(0, 12);
  const extra = list.length - shown.length;

  process.stderr.write(
    `\n⚠ [easy-claude] Install incomplete${list.length ? ` — ${list.length} hook file(s) missing` : ''}.\n` +
      bootstrapWarning +
      `   This usually means .claude was copied with a non-git-aware tool that dropped files.\n` +
      (list.length ? `   Missing:\n` : '') +
      shown.map((f) => `     - .claude/hooks/${f}`).join('\n') +
      (extra > 0 ? `\n     ...and ${extra} more` : '') +
      `\n   Repair: re-export from the source repo with\n` +
      `     node .claude/scripts/export-claude.mjs "${projectDir}" --force\n` +
      `   (Other SessionStart hooks may still log raw module errors until repaired.)\n\n`
  );
}

try {
  main();
} catch {
  // Verifier must never break a session.
}
