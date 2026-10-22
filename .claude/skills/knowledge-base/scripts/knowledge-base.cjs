#!/usr/bin/env node
'use strict';

/**
 * /knowledge-base command line (spec KNW). One owner for every knowledge-base operation:
 *
 *   list [--usage] [--json]                    both planes, project first, with labels
 *   check                                      currency check: every generated file matches its packs
 *   build                                      regenerate both planes' indexes and reader lists
 *   add --file <draft.md> [--apply]            validate a draft; write it to the project plane
 *   update <id> --file <draft.md> [--apply]    replace a project pack
 *   delete <id> [--apply]                      remove a project pack
 *   review <id> [--apply] [--date YYYY-MM-DD]  mark a project pack reviewed today
 *   import --from <path> --id <id> [--kind file|research-report|web-address]
 *          [--source-ref <ref>] [--title <t>] [--out <draft.md>]
 *                                             build an unreviewed draft from outside content
 *   search <words…> [--limit N] [--json]       ranked sections with citations
 *   eval [--write]                             held-out prompt-trigger evaluation
 *
 * Without --apply a write command prints the draft and its findings and changes nothing
 * (BR-KNW-15). Writes target the project plane only; framework packs change through the
 * framework's own process (edit the pack, then `build`). Common options: --root <project dir>.
 * Exit codes: 0 ok · 1 findings/refused · 2 usage error.
 */

const fs = require('node:fs');
const path = require('node:path');

const LIB = path.join(__dirname, '..', '..', '..', 'hooks', 'lib');
const packs = require(path.join(LIB, 'knowledge-pack.cjs'));
const indexLib = require(path.join(LIB, 'knowledge-index.cjs'));

/**
 * `{ _: positional, flags, errors }`. A switch (`--apply`, `--json`, `--usage`, `--write`, `--help`) is true
 * when given bare or as `=true|1|yes`, false as `=false|0|no`; any other value is a usage error, so a typo
 * never confirms a write. `-h` is `--help`.
 */
function parseArgs(argv) {
    const args = { _: [], flags: {}, errors: [] };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '-h') {
            args.flags.help = true;
        } else if (token.startsWith('--')) {
            const eq = token.indexOf('=');
            const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
            if (eq !== -1) args.flags[name] = token.slice(eq + 1);
            else if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && VALUE_FLAGS.has(name)) args.flags[name] = argv[++i];
            else args.flags[name] = true;
        } else {
            args._.push(token);
        }
    }
    for (const name of SWITCH_FLAGS) {
        const value = args.flags[name];
        if (value === undefined || value === true) continue;
        const text = String(value).trim().toLowerCase();
        if (SWITCH_ON.has(text)) args.flags[name] = true;
        else if (SWITCH_OFF.has(text)) args.flags[name] = false;
        else args.errors.push(`--${name} takes no value, or true / false (got "${value}")`);
    }
    return args;
}

const VALUE_FLAGS = new Set(['file', 'from', 'id', 'kind', 'source-ref', 'title', 'out', 'limit', 'root', 'date']);
const SWITCH_FLAGS = Object.freeze(['apply', 'json', 'usage', 'write', 'help']);
const SWITCH_ON = new Set(['true', '1', 'yes']);
const SWITCH_OFF = new Set(['false', '0', 'no']);

function projectRoot(flags) {
    if (typeof flags.root === 'string') return path.resolve(flags.root);
    return require(path.join(LIB, 'project-root.cjs')).resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
}

function today(flags) {
    if (typeof flags.date === 'string' && packs.isValidDate(flags.date)) return flags.date;
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function rel(root, file) {
    return path.relative(root, file).split(path.sep).join('/');
}

class Refusal extends Error {}

function out(text) {
    process.stdout.write(`${text}\n`);
}

function printFindings(errors, warnings) {
    for (const error of errors) out(`  ✗ ${error}`);
    for (const warning of warnings) out(`  ! ${warning}`);
}

/**
 * Locate a pack by identity in each plane. The identity must be a valid pack identity (so it can never
 * name a path outside the plane) and the project plane must lie inside the project (BR-KNW-01/02/15).
 */
function findPack(root, id) {
    if (!packs.isValidId(id)) throw new Refusal(`${id} is not a pack identity: use 3–64 lowercase letters, digits and single hyphens, starting with a letter`);
    const planes = indexLib.resolvePlanes(root);
    if (!planes.project.contained) throw new Refusal(`The packs directory ${rel(root, planes.project.dir)} resolves outside the project; nothing is read or written there`);
    const result = {};
    for (const name of ['project', 'framework']) {
        const file = path.join(planes[name].dir, `${id}.md`);
        if (fs.existsSync(file)) result[name] = file;
    }
    return { planes, ...result };
}

const OUTSIDE_SOURCE_KINDS = new Set(['file', 'research-report', 'web-address']);

/**
 * BR-KNW-16: a pack becomes reviewed only through a confirmed `review`. An update may keep a reviewed
 * pack reviewed but never flips it; an add of a pack drawn only from outside documents (an import, or
 * text copied from a file, report or page) starts unreviewed.
 */
function reviewStateErrors(pack, current) {
    if (!pack || pack.review !== 'reviewed') return [];
    const how = `a person marks it reviewed with \`review ${pack.id}\` after confirming the review`;
    if (current) return current.review === 'reviewed' ? [] : [`The draft marks ${pack.id} reviewed; ${how}`];
    const kinds = (Array.isArray(pack.sources) ? pack.sources : []).map(source => source && source.kind);
    if (kinds.length && kinds.every(kind => OUTSIDE_SOURCE_KINDS.has(kind))) return [`${pack.id} is drawn only from outside documents, so it is added unreviewed; ${how}`];
    return [];
}

/** The review state and labels the person is about to confirm. */
function printState(pack) {
    if (!pack) return;
    const labels = packs.trustLabels(pack);
    out(`  review state: ${pack.review}${labels.length ? ` · labels: ${labels.join(', ')}` : ''}`);
}

/** Validate draft text as a project pack at `target`. */
function validateDraft(root, text, target) {
    const parsed = packs.parsePack(text, { file: target });
    if (!parsed.pack) return { pack: null, errors: parsed.errors, warnings: [] };
    const result = packs.validatePack(parsed.pack, { plane: 'project', projectDir: root, file: target });
    return { pack: parsed.pack, ...result };
}

function readDraft(flags) {
    if (typeof flags.file !== 'string') throw new Refusal('--file <draft.md> is required');
    try {
        return fs.readFileSync(path.resolve(flags.file), 'utf8');
    } catch (error) {
        throw new Refusal(`The draft ${flags.file} could not be read (${error.code || 'error'})`);
    }
}

/** Project outputs only: a project operation never writes the framework plane (BR-KNW-15). */
function rebuildProject(root) {
    return indexLib.writeAll(root, undefined, { planes: ['project'] }).written;
}

function writeAndRebuild(root, target, text) {
    indexLib.writeFileAtomic(target, text.endsWith('\n') ? text : `${text}\n`);
    return rebuildProject(root);
}

function reportWrite(root, label, target, written) {
    out(`${label}: ${rel(root, target)}`);
    for (const file of written) if (file !== rel(root, target)) out(`  regenerated ${file}`);
}

// ── commands ────────────────────────────────────────────────────────────────

function cmdList(root, flags) {
    const loaded = indexLib.loadForDelivery(root, { cacheFile: path.join(root, 'tmp', 'knowledge-base', 'freshness.json') });
    const usage = flags.usage ? require(path.join(LIB, 'knowledge-telemetry.cjs')).summarize(root) : null;
    if (flags.json) {
        out(JSON.stringify({ packs: loaded.packs.map(entry => ({ ...entry, usage: usage ? usage[`${entry.plane}:${entry.id}`] || { delivered: 0, read: 0 } : undefined })) }, null, 2));
        return 0;
    }
    if (!loaded.packs.length) {
        out('The knowledge base is empty. Add a pack with `/knowledge-base add`.');
        return 0;
    }
    for (const entry of loaded.packs) {
        const labels = entry.labels.length ? ` [${entry.labels.join(', ')}]` : '';
        const counts = usage ? ` — delivered ${(usage[`${entry.plane}:${entry.id}`] || {}).delivered || 0}, read ${(usage[`${entry.plane}:${entry.id}`] || {}).read || 0}` : '';
        out(`${entry.id} (${entry.plane}, ${entry.kind}, ${entry.review})${labels}${counts}`);
        out(`  ${entry.title} — ${entry.description}`);
        out(`  read: ${entry.file}${entry.body ? ` (its digest says how to read ${entry.body})` : ''}`);
    }
    return 0;
}

function cmdCheck(root) {
    const result = indexLib.checkAll(root);
    if (result.ok) {
        out('Knowledge base is current: every index and reader list matches its packs.');
        printFindings([], result.warnings);
        return 0;
    }
    out('Knowledge base check failed:');
    for (const finding of result.findings) out(`  ✗ ${finding}`);
    printFindings(result.errors, result.warnings);
    out('Fix the packs, then run `build`.');
    return 1;
}

function cmdBuild(root) {
    const { written, result } = indexLib.writeAll(root);
    const errors = result.built.framework.errors.concat(result.built.project.errors);
    const warnings = result.built.framework.warnings.concat(result.built.project.warnings, indexLib.bindingCapWarnings(result.built.project.index.packs, result.built.framework.index.packs));
    out(written.length ? `Regenerated: ${written.join(', ')}` : 'Already current; nothing written.');
    printFindings(errors, warnings);
    return errors.length ? 1 : 0;
}

function cmdAdd(root, flags) {
    const text = readDraft(flags);
    const parsed = packs.parsePack(text);
    if (!parsed.pack) throw new Refusal(parsed.errors[0] || 'The draft could not be read');
    const id = typeof parsed.pack.id === 'string' ? parsed.pack.id : null;
    if (!packs.isValidId(id)) {
        // Name every failing field (AC-KNW-04), not only the identity, before refusing.
        const result = packs.validatePack(parsed.pack, { plane: 'project', projectDir: root, file: null });
        out(`Draft: add ${id || '(no id)'} to the project plane`);
        printFindings(result.errors, result.warnings);
        out('Refused: nothing written.');
        return 1;
    }
    const located = findPack(root, id);
    if (located.project) throw new Refusal(`A project pack called ${id} already exists; use update`);
    const target = path.join(located.planes.project.dir, `${id}.md`);
    const result = validateDraft(root, text, target);
    result.errors.push(...reviewStateErrors(result.pack, null));
    out(`Draft: add ${id} to the project plane (${rel(root, target)})`);
    printState(result.pack);
    if (located.framework) out(`  note: it takes precedence over the framework pack ${id}`);
    printFindings(result.errors, result.warnings);
    if (result.errors.length) {
        out('Refused: nothing written.');
        return 1;
    }
    if (!flags.apply) {
        out('Not written: confirm the draft, then rerun with --apply.');
        return 0;
    }
    reportWrite(root, 'Added', target, writeAndRebuild(root, target, text));
    return 0;
}

function cmdUpdate(root, flags, id) {
    if (!id) throw new Refusal('update needs the pack identity');
    const located = findPack(root, id);
    if (!located.project) {
        if (located.framework) throw new Refusal(`${id} is a framework pack; project operations never change the framework plane. Add a project pack with the same identity to take precedence.`);
        throw new Refusal(`No project pack called ${id}`);
    }
    const text = readDraft(flags);
    const result = validateDraft(root, text, located.project);
    if (result.pack && result.pack.id !== id) result.errors.push(`The draft's id (${result.pack.id}) must stay ${id}`);
    result.errors.push(...reviewStateErrors(result.pack, packs.readPack(located.project).pack || { review: 'unreviewed' }));
    out(`Draft: update ${id} (${rel(root, located.project)})`);
    printState(result.pack);
    printFindings(result.errors, result.warnings);
    if (result.errors.length) {
        out('Refused: nothing written.');
        return 1;
    }
    if (!flags.apply) {
        out('Not written: confirm the draft, then rerun with --apply.');
        return 0;
    }
    reportWrite(root, 'Updated', located.project, writeAndRebuild(root, located.project, text));
    return 0;
}

function cmdDelete(root, flags, id) {
    if (!id) throw new Refusal('delete needs the pack identity');
    const located = findPack(root, id);
    if (!located.project) {
        if (located.framework) throw new Refusal(`${id} is a framework pack; project operations never change the framework plane.`);
        throw new Refusal(`No project pack called ${id}`);
    }
    out(`Draft: delete ${id} (${rel(root, located.project)})`);
    if (!flags.apply) {
        out('Not written: confirm the deletion, then rerun with --apply.');
        return 0;
    }
    fs.unlinkSync(located.project);
    const written = rebuildProject(root);
    out(`Deleted: ${rel(root, located.project)}`);
    for (const file of written) out(`  regenerated ${file}`);
    return 0;
}

/** Set `review: reviewed` and `reviewed: <date>` in the frontmatter, preserving every other line. */
function markReviewed(text, date) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const close = packs.closingFenceIndex(lines); // the same fence the pack parser reads
    if (lines[0].trim() !== '---' || close === -1) return null;
    let sawReview = false;
    let sawDate = false;
    for (let i = 1; i < close; i += 1) {
        if (/^review\s*:/.test(lines[i])) {
            lines[i] = 'review: reviewed';
            sawReview = true;
        } else if (/^reviewed\s*:/.test(lines[i])) {
            lines[i] = `reviewed: ${date}`;
            sawDate = true;
        }
    }
    const additions = [];
    if (!sawReview) additions.push('review: reviewed');
    if (!sawDate) additions.push(`reviewed: ${date}`);
    lines.splice(close, 0, ...additions);
    return lines.join('\n');
}

function cmdReview(root, flags, id) {
    if (!id) throw new Refusal('review needs the pack identity');
    const located = findPack(root, id);
    if (!located.project) throw new Refusal(located.framework ? `${id} is a framework pack; project operations never change the framework plane.` : `No project pack called ${id}`);
    const date = today(flags);
    const next = markReviewed(fs.readFileSync(located.project, 'utf8'), date);
    if (next === null) throw new Refusal(`${id} has no frontmatter to update`);
    const result = validateDraft(root, next, located.project);
    out(`Draft: mark ${id} reviewed on ${date}`);
    printFindings(result.errors, result.warnings);
    if (result.errors.length) {
        out('Refused: nothing written.');
        return 1;
    }
    if (!flags.apply) {
        out('Not written: confirm the review, then rerun with --apply.');
        return 0;
    }
    reportWrite(root, 'Reviewed', located.project, writeAndRebuild(root, located.project, next));
    return 0;
}

function yamlString(value) {
    return JSON.stringify(String(value));
}

/** Build an unreviewed import draft (BR-KNW-16). The digest and description are left for the assistant to write. */
function cmdImport(root, flags) {
    if (typeof flags.from !== 'string') throw new Refusal('import needs --from <path>');
    if (!packs.isValidId(flags.id)) throw new Refusal('import needs --id <identity> (3–64 lowercase letters, digits and single hyphens, starting with a letter)');
    const from = path.resolve(flags.from);
    let content;
    try {
        content = fs.readFileSync(from, 'utf8');
    } catch (error) {
        throw new Refusal(`${flags.from} could not be read (${error.code || 'error'})`);
    }
    const relFrom = rel(root, from);
    const loader = require(path.join(LIB, 'project-config-loader.cjs'));
    let config = {};
    try {
        config = loader.readProjectConfigAt(root).config || {};
    } catch {
        config = {};
    }
    const inResearch = relFrom.startsWith(`${loader.getKnowledgeRoot(config)}/research/`);
    const kind = typeof flags.kind === 'string' ? flags.kind : inResearch ? 'research-report' : 'file';
    if (!packs.SOURCE_KINDS.includes(kind) || kind === 'team-decision' || kind === 'model-knowledge') throw new Refusal('--kind must be file, research-report or web-address');
    if (kind === 'web-address' && typeof flags['source-ref'] !== 'string') throw new Refusal('a web-address import needs --source-ref <address>');
    const ref = typeof flags['source-ref'] === 'string' ? flags['source-ref'] : relFrom.startsWith('..') ? path.basename(from) : relFrom;
    const firstHeading = /^#\s+(.+)$/m.exec(content);
    const title = typeof flags.title === 'string' ? flags.title : firstHeading ? firstHeading[1].trim() : flags.id;
    const draft = [
        '---',
        `id: ${flags.id}`,
        `title: ${yamlString(title)}`,
        'description: ""   # REQUIRED: one line, "Use when …"',
        'kind: other         # domain | practice | regulation | technology | other',
        'review: unreviewed',
        `reviewed: ${today(flags)}`,
        'sources:',
        `  - kind: ${kind}`,
        `    ref: ${yamlString(ref)}`,
        'triggers:',
        '  prompt: []',
        '  skills: []',
        '  agents: []',
        '---',
        '',
        '## Digest',
        '',
        '',
        '## Imported content',
        '',
        content.replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').trim(),
        ''
    ].join('\n');
    // An import only ever writes a draft: --out must stay inside the drafts folder, never a plane (BR-KNW-15).
    const drafts = path.join(root, 'tmp', 'knowledge-base', 'drafts');
    const target = typeof flags.out === 'string' ? path.resolve(flags.out) : path.join(drafts, `${flags.id}.md`);
    if (!require(path.join(LIB, 'path-containment.cjs')).isInside(drafts, target) || target === drafts) throw new Refusal(`--out must name a file inside ${rel(root, drafts)}/; an import writes a draft, never a pack`);
    indexLib.writeFileAtomic(target, draft);
    const flagged = packs.findFlaggedLines(draft);
    const secrets = packs.findSecretLines(draft);
    out(`Import draft (unreviewed, nothing added yet): ${rel(root, target)}`);
    out(`  source: ${kind} ${ref}`);
    for (const line of flagged) out(`  ✗ line ${line.line} reads as an instruction to the assistant — rewrite or remove it: ${line.text}`);
    for (const line of secrets) out(`  ! line ${line.line} looks like a secret (${line.kind})`);
    out('Next: write the description and the digest, choose kind and triggers, show the draft to the person, then run `add --file <draft> --apply` after they confirm.');
    return 0;
}

function cmdSearch(root, flags, words) {
    const query = words.join(' ').trim();
    if (!query) throw new Refusal('search needs some words');
    const search = require(path.join(LIB, 'knowledge-search.cjs'));
    const limit = Number.parseInt(flags.limit, 10);
    const results = search.search(root, query, { limit: Number.isFinite(limit) && limit > 0 ? limit : 8 });
    if (flags.json) {
        out(JSON.stringify({ query, results }, null, 2));
        return 0;
    }
    if (!results.length) {
        out(`Nothing in the knowledge base matched "${query}".`);
        return 0;
    }
    results.forEach((result, index) => {
        const labels = result.labels.length ? ` [${result.labels.join(', ')}]` : '';
        // A clause heading already starts with its identifier.
        out(`${index + 1}. ${result.pack} · ${result.heading} (${result.plane})${labels}`);
        out(`   ${result.location}`);
        if (result.excerpt) out(`   ${result.excerpt}`);
    });
    out('Project packs outrank framework packs; project reference docs and decisions outrank both.');
    return 0;
}

function cmdEval(root, flags) {
    const evaluation = require(path.join(__dirname, 'knowledge-eval.cjs'));
    const result = evaluation.evaluate(root);
    out(JSON.stringify(result.report, null, 2));
    if (flags.write) {
        indexLib.writeFileAtomic(evaluation.recordFile(root), `${JSON.stringify(result.record, null, 2)}\n`);
        out(`Recorded: ${rel(root, evaluation.recordFile(root))}`);
    }
    return 0;
}

const USAGE = 'Usage: knowledge-base.cjs <list|check|build|add|update|delete|review|import|search|eval> [options] (see the file header)';

function main(argv) {
    const args = parseArgs(argv);
    const [command, ...rest] = args._;
    if (args.errors.length) {
        process.stderr.write(`${args.errors.join('\n')}\n${USAGE}\n`);
        return 2;
    }
    // `<command> --help` prints the usage and runs nothing.
    if (args.flags.help) {
        out(USAGE);
        return 0;
    }
    const root = projectRoot(args.flags);
    try {
        switch (command) {
            case 'list': return cmdList(root, args.flags);
            case 'check': return cmdCheck(root);
            case 'build': return cmdBuild(root);
            case 'add': return cmdAdd(root, args.flags);
            case 'update': return cmdUpdate(root, args.flags, rest[0]);
            case 'delete': return cmdDelete(root, args.flags, rest[0]);
            case 'review': return cmdReview(root, args.flags, rest[0]);
            case 'import': return cmdImport(root, args.flags);
            case 'search': return cmdSearch(root, args.flags, rest);
            case 'eval': return cmdEval(root, args.flags);
            case 'help':
            case undefined:
                out(USAGE);
                return command === 'help' ? 0 : 2;
            default:
                process.stderr.write(`Unknown command: ${command}\n${USAGE}\n`);
                return 2;
        }
    } catch (error) {
        if (error instanceof Refusal) {
            out(`Refused: ${error.message}`);
            return 1;
        }
        process.stderr.write(`knowledge-base: ${error && error.stack ? error.stack : error}\n`);
        return 1;
    }
}

module.exports = { main, parseArgs, markReviewed };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
