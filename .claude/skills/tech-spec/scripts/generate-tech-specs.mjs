#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DERIVED_BANNER = '> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit.';
// The two trait names the renderer understands. A config-supplied annotationPattern
// MUST capture one of these as group 1 and a non-empty spec id as group 2.
const KNOWN_TRAIT_NAMES = new Set(['TestSpec', 'TechnicalSpec']);
const EXCLUDED_DIRS = new Set([
  '.git',
  '.vs',
  '.idea',
  '.vscode',
  'bin',
  'obj',
  'node_modules',
  'dist',
  'out',
  'coverage',
]);
const TECHNICAL_HINTS = [
  'schema',
  'shape',
  'readmodel',
  'read model',
  'postgres',
  'migration',
  'backfill',
  'filestorage',
  'file storage',
  'azurefilestorage',
  'uri',
  'endpoint',
  'config',
  'authorizationconfig',
  'backgroundjob',
  'background job',
  'message',
  'consumer',
  'projection',
  'foreignkey',
  'index',
  'column',
  'table',
];

const repoRoot = process.cwd();
const generationRequest = parseArguments(process.argv.slice(2));
const config = await readJson(path.join(repoRoot, 'docs/project-config.json'));
const technicalRoot = config?.specRoots?.technical?.path;

if (!technicalRoot) {
  throw new Error('Missing docs/project-config.json specRoots.technical.path');
}

// How to scan this project's tests is a per-project fact, not a property of the
// framework. Without it there is nothing to scan, and pretending otherwise would
// report a false success on every stack that lacks the convention.
const scan = config?.techSpecScan;
if (!scan?.sourceRoot || !scan?.fileExtensions?.length || !scan?.annotationPattern) {
  throw new Error(
    'Missing docs/project-config.json techSpecScan.{sourceRoot,fileExtensions,annotationPattern}.\n' +
      'The tech-spec generator discovers annotated tests via these settings; this project declares none,\n' +
      'so there is nothing to scan. Add techSpecScan once this project has a test-annotation convention.',
  );
}

const sourceExtensions = scan.fileExtensions;
const annotationPattern = new RegExp(scan.annotationPattern);

const outputRoot = path.resolve(repoRoot, technicalRoot);
assertInsideRepo(outputRoot);

const sourceRoot = path.resolve(repoRoot, scan.sourceRoot);
assertInsideRepo(sourceRoot);

const entries = await collectTraitEntries(sourceRoot);

// A scan that matched nothing is a configuration failure, not a success. Reporting
// status:"ok" with annotations:0 is indistinguishable from a correct empty run and
// hides a misconfigured sourceRoot/extension/pattern behind a green exit code.
if (entries.length === 0) {
  console.error(
    JSON.stringify(
      {
        status: 'no-annotations-found',
        sourceRoot: toPosix(path.relative(repoRoot, sourceRoot)),
        fileExtensions: sourceExtensions,
        annotationPattern: scan.annotationPattern,
        hint: 'No annotated tests matched. Check techSpecScan settings in docs/project-config.json. Nothing was written or deleted.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const groups = groupEntries(entries);
await fs.mkdir(outputRoot, { recursive: true });
const output = await reconcileTechnicalViews(outputRoot, groups, generationRequest);

const outputEntries = generationRequest.scope ? groups.get(generationRequest.scope.key) ?? [] : entries;

const technicalCount = outputEntries.filter((entry) => entry.traitName === 'TechnicalSpec').length;
const businessJoinCount = outputEntries.filter((entry) => entry.traitName === 'TestSpec').length;
const candidateCount = outputEntries.filter(isTechnicalCandidate).length;

console.log(
  JSON.stringify(
    {
      status: 'ok',
      mode: generationRequest.mode,
      ...(generationRequest.scope ? { scope: generationRequest.scope.key } : {}),
      outputRoot: toPosix(path.relative(repoRoot, outputRoot)),
      filesWritten: output.filesWritten,
      filesRemoved: output.filesRemoved,
      filesUnchanged: output.filesUnchanged,
      annotations: outputEntries.length,
      scannedAnnotations: entries.length,
      technicalSpecAnnotations: technicalCount,
      testSpecAnnotations: businessJoinCount,
      technicalLookingTestSpecCandidates: candidateCount,
    },
    null,
    2,
  ),
);

function parseArguments(args) {
  if (args.length === 0) {
    throw new Error(
      'A generation scope is required. Use "--scope=Service/Component" for one component or "--all" for the full technical spec root.',
    );
  }

  let all = false;
  let scopeValue = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--all') {
      if (all) {
        throw new Error('The --all option may be provided only once.');
      }
      all = true;
      continue;
    }

    if (argument === '--scope') {
      if (scopeValue !== null) {
        throw new Error('The --scope option may be provided only once.');
      }
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('The --scope option requires a value in the form Service/Component.');
      }
      scopeValue = next;
      index += 1;
      continue;
    }

    if (argument.startsWith('--scope=')) {
      if (scopeValue !== null) {
        throw new Error('The --scope option may be provided only once.');
      }
      scopeValue = argument.slice('--scope='.length);
      continue;
    }

    throw new Error(
      `Unknown option "${argument}". Use "--scope=Service/Component" for one component or "--all" for the full technical spec root.`,
    );
  }

  if (all && scopeValue !== null) {
    throw new Error('Choose exactly one generation mode: --scope=Service/Component or --all, not both.');
  }

  if (!all && scopeValue === null) {
    throw new Error('Choose exactly one generation mode: --scope=Service/Component or --all.');
  }

  return all
    ? { mode: 'all', scope: null }
    : { mode: 'scope', scope: parseScope(scopeValue) };
}

function parseScope(value) {
  const parts = String(value).split('/');
  if (
    parts.length !== 2 ||
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        part.includes('\\') ||
        sanitizeSegment(part) !== part,
    )
  ) {
    throw new Error(
      `Invalid scope "${value}". Scope must be exactly Service/Component using safe path segments; traversal and separators are not allowed.`,
    );
  }

  const [service, component] = parts;
  return { service, component, key: `${service}/${component}` };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assertInsideRepo(targetPath) {
  const relative = path.relative(repoRoot, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repository: ${targetPath}`);
  }
}

async function collectTraitEntries(rootPath) {
  const files = await collectFiles(rootPath, {
    matches: (name) => sourceExtensions.some((ext) => name.endsWith(ext)),
    excludeDirs: EXCLUDED_DIRS,
  });

  const allEntries = [];
  for (const filePath of files.sort(compareText)) {
    const fileEntries = await parseTraitEntries(filePath);
    allEntries.push(...fileEntries);
  }

  return allEntries.sort((a, b) =>
    compareText(a.service, b.service) ||
    compareText(a.component, b.component) ||
    compareText(a.relPath, b.relPath) ||
    a.line - b.line ||
    compareText(a.id, b.id),
  );
}

// The one recursive file walker. Both callers differ ONLY in which names they keep and
// whether they prune build directories, so those are parameters rather than a second copy.
// `excludeDirs` defaults to pruning NOTHING: the deletion scan must see every file under
// the technical root, since an unseen file is one this script would delete without
// validating it. An unreadable directory is skipped, not fatal.
async function collectFiles(rootPath, { matches, excludeDirs = new Set() }) {
  const files = [];

  async function walk(currentPath) {
    let items;
    try {
      items = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        if (!excludeDirs.has(item.name.toLowerCase())) {
          await walk(itemPath);
        }
      } else if (item.isFile() && matches(item.name)) {
        files.push(itemPath);
      }
    }
  }

  await walk(rootPath);
  return files;
}

async function parseTraitEntries(filePath) {
  const relPath = toPosix(path.relative(repoRoot, filePath));
  const text = await fs.readFile(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const entries = [];
  const pendingTraits = [];
  let currentClass = path.basename(filePath, path.extname(filePath));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const classMatch = line.match(/^\s*(?:(?:public|private|internal|protected|abstract|sealed|static|partial)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (classMatch) {
      currentClass = classMatch[1];
    }

    const traitMatch = line.match(annotationPattern);
    if (traitMatch) {
      // annotationPattern is CONFIG-SUPPLIED, so its captures cannot be trusted.
      // Validate here — at the parse boundary, which runs BEFORE removeGeneratedMarkdown —
      // because a downstream failure would throw only after derived output was already
      // deleted, reproducing the very data-loss this script was fixed to prevent.
      const [, traitName, id] = traitMatch;
      if (!KNOWN_TRAIT_NAMES.has(traitName) || !id) {
        throw new Error(
          `Invalid techSpecScan.annotationPattern match in ${toPosix(path.relative(repoRoot, filePath))}:${index + 1}.\n` +
            `  matched: ${JSON.stringify(line.trim())}\n` +
            `  capture group 1 (trait name) = ${JSON.stringify(traitName)} — must be one of: ${[...KNOWN_TRAIT_NAMES].join(', ')}\n` +
            `  capture group 2 (spec id)    = ${JSON.stringify(id)} — must be non-empty\n` +
            `The pattern must expose exactly two capture groups in that order. No files were changed.`,
        );
      }
      pendingTraits.push({ traitName, id, line: index + 1 });
      continue;
    }

    if (pendingTraits.length === 0) {
      continue;
    }

    const methodMatch = line.match(
      /^\s*(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
    );
    if (!methodMatch) {
      continue;
    }

    const methodName = methodMatch[1];
    const { service, component } = deriveServiceComponent(relPath, currentClass);
    for (const trait of pendingTraits.splice(0)) {
      entries.push({
        ...trait,
        relPath,
        className: currentClass,
        methodName,
        service,
        component,
        operationKind: deriveOperationKind(`${relPath} ${currentClass} ${methodName} ${trait.id}`),
      });
    }
  }

  return entries;
}

function deriveServiceComponent(relPath, className) {
  const parts = relPath.split('/');
  let service = 'General';

  // Derive the service from path STRUCTURE, never from a hardcoded service NAME/VALUE.
  // `Services` below is a soft path-layout marker (with a `parts[1]` fallback), not a baked-in
  // service value: a project without a `Services/` segment still groups by its top path segment.
  // This script is portable framework code; hardcoding a consumer's actual service names inside
  // it would couple every other consumer to that one repo's layout.
  const servicesIndex = parts.indexOf('Services');
  if (servicesIndex >= 0 && parts[servicesIndex + 1]) {
    service = parts[servicesIndex + 1];
  } else if (parts[1]) {
    service = parts[1];
  }

  const fileIndex = parts.length - 1;
  const projectIndex = parts.findIndex((part) => /\.?(IntegrationTests|Tests)(?:\.|$)/.test(part));
  const componentParts = projectIndex >= 0 ? parts.slice(projectIndex + 1, fileIndex) : parts.slice(Math.max(0, fileIndex - 1), fileIndex);
  const component =
    componentParts[0] === 'Infrastructures' && componentParts[1]
      ? `${componentParts[0]}-${componentParts[1]}`
      : componentParts[0] || className.replace(/Tests$/, '') || 'General';

  return {
    service: sanitizeSegment(service),
    component: sanitizeSegment(component),
  };
}

function deriveOperationKind(value) {
  const text = normalizeForMatch(value);
  if (/(consumer|message|event|outbox|inbox|bus)/.test(text)) {
    return 'Event/Message';
  }
  if (/(backgroundjob|background job|migration|backfill|schema|shape)/.test(text)) {
    return 'Background/Data';
  }
  if (/(query|read|get|list|search|filter|dashboard|export|projection|readmodel)/.test(text)) {
    return 'Read';
  }
  if (/(command|save|create|update|delete|submit|import|move|sync|calculate)/.test(text)) {
    return 'Write';
  }
  return 'Test/Invariant';
}

// What makes an entry a candidate AND the hint that explains why are the SAME rule, so
// they are one function. Stated twice, the two could disagree — a candidate row whose
// reason column says "technical hint" with no hint named is exactly that disagreement.
function technicalHint(entry) {
  if (entry.traitName !== 'TestSpec') {
    return null;
  }

  const text = normalizeForMatch(`${entry.relPath} ${entry.className} ${entry.methodName} ${entry.id}`);
  return TECHNICAL_HINTS.find((hint) => text.includes(hint)) ?? null;
}

function isTechnicalCandidate(entry) {
  return technicalHint(entry) !== null;
}

function normalizeForMatch(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

// Full-root cleanup is ALL-OR-NOTHING: every file is validated before any file is
// removed. Scoped cleanup validates only the selected target, so unrelated Markdown
// is outside the mutation set by construction.
async function validateGeneratedMarkdown(rootPath) {
  const files = await collectFiles(rootPath, { matches: (name) => name.endsWith('.md') });

  // Pass 1 — validate every file, collecting ALL offenders. Nothing is deleted here.
  const nonDerived = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.startsWith(DERIVED_BANNER)) {
      nonDerived.push(toPosix(path.relative(repoRoot, filePath)));
    }
  }

  if (nonDerived.length > 0) {
    throw new Error(
      `Refusing to delete anything: ${nonDerived.length} file(s) in the technical spec root are not derived output.\n` +
        nonDerived.map((p) => `  - ${p}`).join('\n') +
        `\n\nThe technical spec root ("${toPosix(path.relative(repoRoot, rootPath))}") must contain ONLY generated files.\n` +
        `Move or delete the file(s) above, then re-run. No files were changed.`,
    );
  }

  return files;
}

async function reconcileTechnicalViews(rootPath, groups, request) {
  const today = new Date().toISOString().slice(0, 10);

  if (request.mode === 'scope') {
    return reconcileScopedView(rootPath, groups, request.scope, today);
  }

  return reconcileAllViews(rootPath, groups, today);
}

async function reconcileAllViews(rootPath, groups, today) {
  const existingFiles = await validateGeneratedMarkdown(rootPath);
  const expectedFiles = new Set();
  let filesWritten = 0;
  let filesUnchanged = 0;

  for (const [groupKey, groupEntriesList] of [...groups.entries()].sort(([a], [b]) => compareText(a, b))) {
    const [service, component] = groupKey.split('/');
    const filePath = path.join(rootPath, service, `${component}.md`);
    assertInsideRepo(filePath);
    expectedFiles.add(path.resolve(filePath));
    const changed = await writeViewIfChanged(filePath, renderView({ service, component, entries: groupEntriesList, today }));
    if (changed) {
      filesWritten += 1;
    } else {
      filesUnchanged += 1;
    }
  }

  let filesRemoved = 0;
  for (const filePath of existingFiles) {
    if (!expectedFiles.has(path.resolve(filePath))) {
      await fs.rm(filePath);
      filesRemoved += 1;
    }
  }

  return { filesWritten, filesRemoved, filesUnchanged };
}

async function reconcileScopedView(rootPath, groups, scope, today) {
  const filePath = path.join(rootPath, scope.service, `${scope.component}.md`);
  assertInsideRepo(filePath);
  const existing = await readOptionalFile(filePath);
  if (existing !== null && !existing.startsWith(DERIVED_BANNER)) {
    throw new Error(
      `Refusing to change scoped output: ${toPosix(path.relative(repoRoot, filePath))} is not derived output. No files were changed.`,
    );
  }

  const groupEntriesList = groups.get(scope.key);
  if (!groupEntriesList) {
    if (existing !== null) {
      await fs.rm(filePath);
      return { filesWritten: 0, filesRemoved: 1, filesUnchanged: 0 };
    }
    return { filesWritten: 0, filesRemoved: 0, filesUnchanged: 0 };
  }

  const changed = await writeViewIfChanged(
    filePath,
    renderView({ service: scope.service, component: scope.component, entries: groupEntriesList, today }),
  );
  return { filesWritten: changed ? 1 : 0, filesRemoved: 0, filesUnchanged: changed ? 0 : 1 };
}

async function readOptionalFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeViewIfChanged(filePath, content) {
  const existing = await readOptionalFile(filePath);
  if (existing !== null && normalizeGeneratedContent(existing) === normalizeGeneratedContent(content)) {
    return false;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return true;
}

// The regenerate date records the last material projection write. It is deliberately
// ignored for equality so a no-op run stays byte-for-byte stable across calendar days.
function normalizeGeneratedContent(content) {
  return content.replace(/\r\n?/g, '\n').replace(/(Regenerated:\s*)\d{4}-\d{2}-\d{2}/g, '$1<projection-date>');
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.service}/${entry.component}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  }
  return groups;
}

function renderView({ service, component, entries, today }) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      compareText(a.operationKind, b.operationKind) ||
      compareText(a.className, b.className) ||
      compareText(a.methodName, b.methodName) ||
      compareText(a.id, b.id),
  );
  const testsByMethod = new Map();
  const idsByTrait = {
    TestSpec: new Set(),
    TechnicalSpec: new Set(),
  };

  for (const entry of sortedEntries) {
    const methodKey = `${entry.className}.${entry.methodName}`;
    if (!testsByMethod.has(methodKey)) {
      testsByMethod.set(methodKey, []);
    }
    testsByMethod.get(methodKey).push(entry);
    idsByTrait[entry.traitName].add(entry.id);
  }

  const operationRows = [...testsByMethod.entries()]
    .sort(([a], [b]) => compareText(a, b))
    .map(([methodKey, methodEntries]) => {
      const first = methodEntries[0];
      const ids = methodEntries.map((entry) => `${entry.traitName}:${entry.id}`).sort(compareText).join('<br>');
      return [
        first.operationKind,
        `\`${methodKey}\``,
        ids,
        `[Source: test/${first.service}/${first.component}/${slugify(methodKey)}]`,
      ];
    });

  const mapRows = sortedEntries.map(
    (entry) => [
      `\`${entry.id}\``,
      entry.traitName,
      `\`${entry.className}.${entry.methodName}\``,
      `[Source: test/${entry.service}/${entry.component}/${slugify(entry.className)}]`,
    ],
  );

  const topologyRows = sortedEntries.filter((entry) => /(Event|Message)/.test(entry.operationKind)).map((entry) => [
    entry.operationKind,
    `\`${entry.className}.${entry.methodName}\``,
    'Review source topology if this test changes',
  ]);
  const candidateRows = sortedEntries.filter(isTechnicalCandidate).map((entry) => [
    `\`${entry.id}\``,
    `\`${entry.className}.${entry.methodName}\``,
    `technical hint: \`${technicalHint(entry)}\``,
    'Convert to `TechnicalSpec` only after review; otherwise keep as business `TestSpec`.',
  ]);

  const boundaryRows = [
    ['Service', `\`${service}\``],
    ['Component', `\`${component}\``],
    ['Annotated tests', sortedEntries.length],
    ['Business TC joins', idsByTrait.TestSpec.size],
    ['Technical-only joins', idsByTrait.TechnicalSpec.size],
  ];
  const coverageRows = [
    ['Annotated test methods', testsByMethod.size],
    ['Business TC join IDs', idsByTrait.TestSpec.size],
    ['Technical-only IDs', idsByTrait.TechnicalSpec.size],
    ['Technical-looking business joins for follow-up', candidateRows.length],
  ];

  return `${DERIVED_BANNER} Source of truth: code and tests under [Source: test/${service}/${component}]. Regenerated: ${today}.

# ${service} / ${component} — Technical View

## 1. Component Boundary

${formatMarkdownTable(['Field', 'Value'], boundaryRows)}

## 2. Operation Catalog

${formatMarkdownTable(
  ['Kind', 'Test surface', 'Annotation IDs', 'Anchor'],
  operationRows.length ? operationRows : [['N/A', 'No annotated tests found', 'N/A', 'N/A']],
)}

## 3. TC ↔ Test Map

${formatMarkdownTable(
  ['ID', 'Annotation', 'Test', 'Anchor'],
  mapRows.length ? mapRows : [['N/A', 'N/A', 'No annotated tests found', 'N/A']],
)}

## 4. Cross-Service Topology

${formatMarkdownTable(
  ['Touchpoint', 'Evidence', 'Risk'],
  topologyRows.length ? topologyRows : [['N/A', 'No event/message annotations detected by this projection', 'NONE']],
)}

## 5. Technical Coverage

${formatMarkdownTable(['Coverage Slice', 'Count'], coverageRows, ['left', 'right'])}

## 6. Candidate Follow-Up Report

${formatMarkdownTable(
  ['ID', 'Test', 'Reason', 'Route'],
  candidateRows.length ? candidateRows : [['N/A', 'N/A', 'No technical-looking business joins detected', 'N/A']],
)}
`;
}

function formatMarkdownTable(headers, rows, alignments = []) {
  const values = [headers, ...rows].map((row) => row.map((cell) => escapePipe(cell)));
  const widths = headers.map((_, columnIndex) =>
    Math.max(3, ...values.map((row) => String(row[columnIndex] ?? '').length)),
  );

  const formatRow = (row, isSeparator = false) => {
    const cells = row.map((cell, columnIndex) => {
      const value = String(cell ?? '');
      if (isSeparator) {
        return alignments[columnIndex] === 'right' ? `${'-'.repeat(widths[columnIndex] - 1)}:` : '-'.repeat(widths[columnIndex]);
      }
      return alignments[columnIndex] === 'right'
        ? value.padStart(widths[columnIndex])
        : value.padEnd(widths[columnIndex]);
    });
    return `| ${cells.join(' | ')} |`;
  };

  return [formatRow(values[0]), formatRow(widths, true), ...values.slice(1).map((row) => formatRow(row))].join('\n');
}

function sanitizeSegment(value) {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'General';
}

function slugify(value) {
  return sanitizeSegment(value).toLowerCase();
}

function escapePipe(value) {
  return String(value).replace(/\|/g, '\\|');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}
