'use strict';
// SYNC carrier parity — canonical ↔ carrier body invariant, expressed as a PROPERTY
// test plus a recorded MUTATION PROBE. This is the framework dogfooding its own
// thesis (specs-as-properties → hard-to-fake tests) on its own highest-value
// invariant, using only Node + the existing extractor lib (no new tooling).
//
// PROPERTY (universal quantification over the WHOLE domain, not one sampled point):
//   ∀ canonical `## SYNC:<tag>` block (base AND `:reminder` variants — see below)
//   and ∀ carrier file under .claude/skills/*/SKILL.md or .claude/agents/*.md that
//   embeds `<!-- SYNC:<tag> -->…<!-- /SYNC:<tag> -->`, the carrier body EQUALS the
//   canonical body (after CRLF/whitespace normalization).
//
// WHY THIS EXISTS: this is the exact failure mode that slipped past every existing
// test last cycle — a single carrier drifting from canonical (the harness-setup
// "optional" vs "forced" stance contradiction). The Python regen oracle
// (verify-sync-divergence) only checks it during `npm run sync:all`; this suite
// promotes it to a first-class, always-run property in the primary hook harness.
//
// MUTATION PROBE (recorded, non-vacuous): the probe test mutates a real carrier
// body in-memory and asserts the parity comparator reports MISMATCH (mutant KILLED),
// and that both extractors fail-closed (null on miss) — so a parser regression can
// never make this suite green by silence.
//
// BOUNDARY FIDELITY: the canonical body is read with the SAME boundary the writer
// (`sync-update-blocks.py read_canonical_block`) uses — stop at `\n---<ws>\n` OR the
// next `\n## SYNC:` — so a block separated without a blank line cannot over-capture and
// false-fail. extract-sync-block.cjs applies that rule too; the cross-reader corpus test
// `.claude/scripts/tests/sync-reader-parity.test.cjs` fails if the JS and Python readers
// ever end a canonical block at different lines.
//
// `:reminder` VARIANTS ARE IN SCOPE. They were excluded here on the theory that
// `sync-update-blocks.py` does not body-sync them, so they "may legitimately differ from
// canonical" and including them would produce false positives. Both halves were wrong, and
// the exclusion cost a real regression: a canonical `:reminder` body was extended while all
// 63 of its carriers kept the old text, and every gate stayed green because this property
// was the only thing that could have seen it. The tool DOES address them
// (`sync-update-blocks.py` docstring; its fence regex deliberately makes a plain tag not
// match its `:reminder` variant so the two are separately targetable), and the corpus keeps
// them equal in practice — measured at the time of this change, 28 canonical reminder tags
// across 1,111 tag x carrier pairs were byte-exact once that one tag was cascaded. A
// reminder that legitimately needs to differ belongs in OVERRIDE, which has its own guard.
//
// OVERRIDE-SUBSTANCE GUARD (separate property): `<!-- OVERRIDE:<tag> -->` blocks are an
// INTENTIONAL divergence — three review skills copy the review-protocol-injection template
// only to route their fresh-review sub-agent to a domain specialist instead of canonical's
// generic code-reviewer, so they are (correctly) excluded from the equality property and
// untouched by sync-update-blocks.py. But "intentional divergence on routing" must not become
// "silent staleness on substance": the GUARD test pins each OVERRIDE copy to canonical's
// protocol COUNT and every protocol HEADER **and BODY, verbatim** (derived at runtime, never
// hard-coded), allowing only the documented subagent_type/ref-doc customization outside the
// protocol region. This closes the exact gap that let the three copies sit at a stale
// "10 protocols / no Triangulation" after canonical reached 11 — and also catches a protocol
// whose wording silently drifts in a copy, not only one that vanishes entirely.

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');

const CANONICAL_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const SKILLS_DIR = path.join(REPO, '.claude', 'skills');
const AGENTS_DIR = path.join(REPO, '.claude', 'agents');

const canonical = fs.readFileSync(CANONICAL_PATH, 'utf8').replace(/\r\n?/g, '\n');

// Lenient-but-proven normalizer (mirrors protocol-text-parity P5): CRLF→LF, strip
// trailing per-line ws, collapse blank-line runs, trim. Catches wording/stance drift
// while absorbing whitespace variance introduced at marker-insertion time.
const norm = (s) =>
    String(s)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every canonical `## SYNC:<tag>` base+variant header, INCLUDING `:reminder` variants.
function canonicalTags() {
    const tags = [...canonical.matchAll(/^## SYNC:([A-Za-z0-9:_-]+)\s*$/gm)].map((m) => m[1]);
    return [...new Set(tags)];
}

// Canonical body for a tag, mirroring sync-update-blocks.py read_canonical_block:
// from after the `## SYNC:<tag>` header line up to the next `\n---<ws>\n` OR
// `\n## SYNC:` boundary (or EOF for the final block); surrounding newlines stripped.
// Null when absent. NOTE: string-slice boundary detection on purpose — a regex with
// the `m` flag would make a `$` EOF-alternative match end-of-LINE and truncate the
// body to its first line.
function readCanonicalBody(tag) {
    const headerRe = new RegExp(`^## SYNC:${escapeRe(tag)}[ \\t]*$`, 'm');
    const hm = headerRe.exec(canonical);
    if (!hm) return null;
    const nl = canonical.indexOf('\n', hm.index);
    if (nl === -1) return null;
    const rest = canonical.slice(nl + 1);
    const bound = /\n---[ \t]*\n|\n## SYNC:/.exec(rest);
    const body = bound ? rest.slice(0, bound.index) : rest;
    return body.replace(/^\n+|\n+$/g, '');
}

// Carrier body between <!-- KIND:tag --> and <!-- /KIND:tag --> (KIND = SYNC | OVERRIDE),
// or null on miss. CRITICAL: match only a REAL marker — one alone on its own line — never
// an inline-code MENTION of the marker (e.g. a doc line referencing `<!-- SYNC:tag -->`).
// A naive indexOf matches such mentions and over-captures across unrelated blocks, which
// the authoritative writer (line-anchored) does not.
function extractHtmlMarkedBody(content, kind, tag) {
    const md = String(content).replace(/\r\n?/g, '\n');
    const openRe = new RegExp(`(?:^|\\n)[ \\t]*<!-- ${kind}:${escapeRe(tag)} -->[ \\t]*\\n`);
    const om = openRe.exec(md);
    if (!om) return null;
    const bodyStart = om.index + om[0].length;
    const rest = md.slice(bodyStart);
    const closeRe = new RegExp(`\\n[ \\t]*<!-- /${kind}:${escapeRe(tag)} -->[ \\t]*(?:\\n|$)`);
    const cm = closeRe.exec(rest);
    if (cm === null) return null;
    return rest.slice(0, cm.index).trim();
}

// SYNC carriers are body-synced by sync-update-blocks.py and must EQUAL canonical (property
// above). OVERRIDE carriers are NOT auto-synced — they are an intentional per-skill divergence
// (a review skill routes its fresh-review sub-agent to a domain specialist instead of canonical's
// generic code-reviewer). They are therefore excluded from the equality property, but must not
// silently fall behind canonical's SHARED SUBSTANCE (protocol set + count) — guarded separately below.
const extractHtmlSyncBody = (content, tag) => extractHtmlMarkedBody(content, 'SYNC', tag);
const extractHtmlOverrideBody = (content, tag) => extractHtmlMarkedBody(content, 'OVERRIDE', tag);

function carrierFiles() {
    const out = [];
    for (const d of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
        if (!d.isDirectory()) continue;
        const p = path.join(SKILLS_DIR, d.name, 'SKILL.md');
        if (fs.existsSync(p)) out.push(p);

        // references/*.md carry procedure bodies a skill loads per mode, and they duplicate
        // across skills exactly as SKILL.md does — a forked sync procedure lives there, not
        // in SKILL.md. Scanning only SKILL.md put that duplication structurally OUT OF REACH
        // of this property: a SYNC: block in references/ could diverge forever and stay green.
        // Must stay aligned with find_target_files() in sync-update-blocks.py, which writes
        // the same set — a carrier this test guards but the writer never updates is a
        // permanently-red test, and one the writer updates but this test ignores is no guard.
        // That alignment is ASSERTED by the PARITY test at the bottom of this suite, not by
        // this comment — a comment is not a sensor.
        const refDir = path.join(SKILLS_DIR, d.name, 'references');
        if (!fs.existsSync(refDir)) continue;
        for (const f of fs.readdirSync(refDir, { withFileTypes: true })) {
            if (f.isFile() && f.name.endsWith('.md')) out.push(path.join(refDir, f.name));
        }
    }
    for (const f of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
        if (f.isFile() && f.name.endsWith('.md')) out.push(path.join(AGENTS_DIR, f.name));
    }
    return out;
}

const TAGS = canonicalTags();
const CARRIERS = carrierFiles().map((p) => ({
    rel: path.relative(REPO, p).split(path.sep).join('/'),
    text: fs.readFileSync(p, 'utf8'),
}));
const CANON_BODY = new Map(TAGS.map((t) => [t, readCanonicalBody(t)]));

// Full (tag × carrier) domain: every carrier that embeds a tag.
const PAIRS = [];
for (const t of TAGS) {
    for (const c of CARRIERS) {
        const body = extractHtmlSyncBody(c.text, t);
        if (body != null) PAIRS.push({ tag: t, carrier: c.rel, body });
    }
}

// --- OVERRIDE-substance contract (review-protocol-injection) ---------------------
// Canonical's review-protocol-injection template tells a fresh review sub-agent to embed
// N protocol blocks VERBATIM. Three review skills (integration-test-review, architecture-review,
// ui-review) copy that template inside an <!-- OVERRIDE:review-protocol-injection --> block ONLY
// to swap canonical's generic `code-reviewer` for a domain specialist (integration-tester /
// architect / ui-ux-designer). Because OVERRIDE is excluded from the equality property and is
// NOT touched by sync-update-blocks.py, those copies can silently fall behind canonical on the
// SHARED substance — which is exactly how they drifted to a stale "10 protocols / no Triangulation"
// template after canonical advanced to 11. This contract pins that substance (protocol count +
// every protocol header) while permitting only the documented routing/ref-doc customization.
const RPI = 'review-protocol-injection';

// Parse the protocol contract from a review-protocol-injection body AT RUNTIME so future protocol
// additions/count bumps / wording edits are auto-tracked — the guard never hard-codes "11" or any
// protocol text. The protocol region is `### …` blocks bounded by `## Protocols (follow VERBATIM` …
// `## Reference Docs` (the part of the template that MUST be identical across canonical and every
// OVERRIDE copy; only the surrounding Subagent-Type / Agent-Call / Reference-Docs sections may
// diverge for routing). Returns { count, protocols: Map<header, normBody> } or null on parse miss.
// Verifying BODIES (not just headers) is what makes "track canonical substance" honest: a protocol
// whose wording silently drifts in a copy is caught, not only one that vanishes entirely.
function parseProtocolContract(text) {
    if (text == null) return null;
    const t = String(text).replace(/\r\n?/g, '\n');
    const countMatch = /embed (\d+) protocol blocks/.exec(t);
    const start = t.indexOf('## Protocols (follow VERBATIM');
    const end = t.indexOf('## Reference Docs');
    if (start === -1 || end === -1 || end <= start) return null;
    const region = t.slice(start, end);
    const marks = [...region.matchAll(/^### .+$/gm)];
    if (marks.length === 0) return null;
    const protocols = new Map();
    for (let i = 0; i < marks.length; i++) {
        const header = marks[i][0].trim();
        const bodyStart = marks[i].index + marks[i][0].length;
        const bodyEnd = i + 1 < marks.length ? marks[i + 1].index : region.length;
        protocols.set(header, norm(region.slice(bodyStart, bodyEnd)));
    }
    return { count: countMatch ? countMatch[1] : null, protocols };
}

// --- Guide-aware coverage (P48 pattern, P26 sensor row N5) ---------------------------------------
// Once the review group converts, a non-inline review skill carries review-protocol-injection as a
// guide line and the hook delivers the projection file. A carrier therefore counts when it holds the
// body, OR when it is a skill SKILL.md with a guide entry (shared recognizer, never a copied regex)
// whose projection equals canonical. A guide anywhere else (an agent, a references/*.md file) is a
// problem, not a carrier: agents and references keep full text (owner answer, BR-PDL-12).
const SKILL_MD_REL_RE = /^\.claude\/skills\/[^/]+\/SKILL\.md$/;
function coverageCarriers(carriers, tag, projectionText, canonBody) {
    const out = { body: [], guided: [], problems: [] };
    const projectionOk = projectionText != null && canonBody != null && norm(projectionText) === norm(canonBody);
    for (const c of carriers) {
        const body = extractHtmlSyncBody(c.text, tag);
        if (body != null) {
            out.body.push({ carrier: c.rel, body });
            continue;
        }
        if (!guideCarrier.hasGuideEntry(c.text, tag)) continue;
        if (!SKILL_MD_REL_RE.test(c.rel)) out.problems.push(`${c.rel}: ${tag} guide entry outside a skill SKILL.md (agents and references keep full text)`);
        else if (!projectionOk) out.problems.push(`${c.rel}: ${tag} guide entry, but the projection is missing or differs from canonical`);
        else out.guided.push({ carrier: c.rel, body: projectionText });
    }
    return out;
}
const projectionTextFor = (skillsDir, tag) => {
    const file = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};

// Every carrier's OVERRIDE:review-protocol-injection body (null = no such block in that file).
const OVERRIDE_CARRIERS = CARRIERS.map((c) => ({
    carrier: c.rel,
    body: extractHtmlOverrideBody(c.text, RPI),
})).filter((o) => o.body != null);

// --- Hybrid duplication policy (TC-PDL-034, TC-PDL-082) ------------------------------
// The policy moved from "never reference a protocol by path" to the hybrid: skills keep guide
// lines, hooks deliver full text, and the review-family skills, agents, references/*.md bodies and
// reviewer prompts keep full bodies. Leaving the old prohibition anywhere in the policy sections
// would instruct the assistant against the delivery design.
const POLICY = 'shared-protocol-duplication-policy';
const OLD_PROHIBITIONS = [
    /never reference protocols by file path/i,
    /Do NOT extract, deduplicate, or replace with file references/i,
    /Placeholder markers would force file-read indirection/i,
    /never extract to file references/i,
    /compliance drops[^.\n]*indirection/i,
    /inline-not-reference/i,
];
// Framework docs that describe the policy. They ship inside `.claude/`, so they travel with the bundle;
// one that is absent is skipped, one that is present must not restate the old prohibition.
const POLICY_DOCS = [
    ['.claude', 'docs', 'skills', 'README.md'],
    ['.claude', 'docs', 'skill-naming-conventions.md'],
    ['.claude', 'docs', 'claude-ai-agent-framework-guide.md'],
    ['.claude', 'docs', 'development-rules.md'],
].map((parts) => path.join(REPO, ...parts));
const GROUPS_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'protocol-groups.json');
// The policy copy outside sync-update-blocks.py's carrier glob, hand-synced on every canonical edit.
const DEV_RULES_PATH = path.join(REPO, '.claude', 'docs', 'development-rules.md');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const DEV_RULES_SKIP = isFrameworkRepo(REPO)
    ? false
    : 'framework-repo self-check: compares the upstream development rules copy with the canonical policy';

/** The policy sections as the assistant reads them: policy + reminder, fresh-context-review, and the
 * review-protocol-injection intro (the text before its template; the template is OVERRIDE-pinned). */
function policySections() {
    const rpi = readCanonicalBody(RPI);
    const introEnd = rpi == null ? -1 : rpi.indexOf('### Subagent Type Selection');
    return {
        policy: readCanonicalBody(POLICY),
        reminder: readCanonicalBody(`${POLICY}:reminder`),
        freshContext: readCanonicalBody('fresh-context-review'),
        injectionIntro: introEnd === -1 ? null : rpi.slice(0, introEnd),
    };
}

// --- Root-carried conversion (TC-PDL-035, TC-PDL-036, TC-PDL-037) ---------------------------------
// The four root-carried protocols (the `universal` group of protocol-groups.json) are converted in every
// skill outside `inlineSkills`: each body becomes one guide line, the `:reminder` digests stay, and the
// root instruction file carries the text (hooks deliver it when a project switches that reliance off).
// Inline skills and agents keep the full bodies. These cases read the shipped `.claude/` tree, which
// travels with the bundle; only TC-PDL-037 reads this repository's own root files, so only it is guarded.
const os = require('os');
const { spawnSync } = require('child_process');
const guideCarrier = require(path.join(REPO, '.claude', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));
const { guideEntries, guideTags } = guideCarrier;
const PROJECTION_INDEX_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'protocols', 'index.json');
// Agents carry the root-carried rules as full text, except the overlay: resolving project overlays is the
// job of whoever invokes a skill, so no agent carries it (agent-universal-rules.test.cjs, the
// project-protocol-overlay entry of its excluded list).
const AGENT_EXEMPT_ROOT_CARRIED = new Set(['project-protocol-overlay']);
const ROOT_FILES_SKIP = isFrameworkRepo(REPO) ? false : "asserts the framework repo's own root files";

/** Read lazily so a missing file fails the case that needs it, not the whole suite at load time. */
function rootCarriedContext() {
    const groups = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8'));
    const tags = Object.keys((groups.groups && groups.groups.universal && groups.groups.universal.tags) || {}).sort();
    const inline = new Set(Array.isArray(groups.inlineSkills) ? groups.inlineSkills : []);
    const index = JSON.parse(fs.readFileSync(PROJECTION_INDEX_PATH, 'utf8'));
    const rows = new Map((Array.isArray(index.tags) ? index.tags : []).filter((r) => tags.includes(r.tag)).map((r) => [r.tag, r]));
    const skills = fs
        .readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
        .map((d) => ({ name: d.name, text: fs.readFileSync(path.join(SKILLS_DIR, d.name, 'SKILL.md'), 'utf8') }));
    const agents = fs
        .readdirSync(AGENTS_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({ name: f, text: fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8') }));
    return { tags, inline, rows, skills, agents, converted: skills.filter((s) => !inline.has(s.name)) };
}

/** The guide line the conversion must write for a root-carried tag, built by the format owner from the published row. */
function expectedGuideLine(row) {
    return guideCarrier.formatGuideLine({ tag: row.tag, summary: row.summary, when: row.when, path: row.file });
}

/** Lines shaped like a guide line for `tag`, anywhere in the text (a duplicate or malformed copy counts). */
function guideLikeLines(text, tag) {
    return String(text).replace(/\r\n?/g, '\n').match(new RegExp(`^- \`${escapeRe(tag)}\` — .*$`, 'gm')) || [];
}

/** First interpreter that runs Python 3 here: `python`, `py -3`, then `python3` (a Windows `python3` is often a Store stub). */
function findPython3(env) {
    for (const c of [{ command: 'python', args: [] }, { command: 'py', args: ['-3'] }, { command: 'python3', args: [] }]) {
        const r = spawnSync(c.command, [...c.args, '-c', 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)'], { env, encoding: 'utf8' });
        if (r.status === 0) return c;
    }
    return null;
}

/**
 * Run the real guide conversion over a temp project: one skill carrying the four root-carried bodies and
 * reminders, one inline skill and one agent carrying the same. Uses the shipped tool, groups file and
 * projection index. Returns the files before and after, plus the tool's result.
 */
function runRootCarriedConversion(ctx) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl-rootcarried-')));
    const home = path.join(root, 'home');
    const project = path.join(root, 'project');
    fs.mkdirSync(home, { recursive: true });
    const write = (rel, content) => {
        const file = path.join(project, ...rel.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        return file;
    };
    const copy = (rel) => write(rel, fs.readFileSync(path.join(REPO, ...rel.split('/'))));
    // A clean child: no inherited framework/host switches or Python overrides, and HOME/TMP inside the fixture.
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (!/^(CLAUDE_|CK_|CODEX_|OPENCODE_|PYTHON)/i.test(key)) env[key] = value;
    }
    Object.assign(env, { HOME: home, USERPROFILE: home, TMPDIR: home, TEMP: home, TMP: home });
    try {
        copy('.claude/scripts/sync-update-blocks.py');
        copy('.claude/scripts/sync_blocks.py');
        copy('.claude/scripts/line_endings.py');
        copy('.claude/skills/shared/protocol-groups.json');
        copy('.claude/skills/shared/protocols/index.json');
        const bodies = ctx.tags.map((tag) => `<!-- SYNC:${tag} -->\n\n${readCanonicalBody(tag)}\n\n<!-- /SYNC:${tag} -->\n`).join('\n');
        const reminders = ctx.tags.map((tag) => `<!-- SYNC:${tag}:reminder -->\n\n${readCanonicalBody(`${tag}:reminder`)}\n\n<!-- /SYNC:${tag}:reminder -->\n`).join('\n');
        const doc = (name) => `---\nname: ${name}\ndescription: fixture\n---\n\n# ${name}\n\n${bodies}\n## Steps\n\n1. Work.\n\n## Closing Reminders\n\n${reminders}`;
        const inlineName = [...ctx.inline].sort()[0];
        const files = {
            carrier: write('.claude/skills/fx-former-carrier/SKILL.md', doc('fx-former-carrier')),
            inline: write(`.claude/skills/${inlineName}/SKILL.md`, doc(inlineName)),
            agent: write('.claude/agents/fx-agent.md', doc('fx-agent')),
        };
        const before = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, 'utf8')]));
        const python = findPython3(env);
        if (!python) return { python: null };
        const run = spawnSync(
            python.command,
            [...python.args, path.join(project, '.claude', 'scripts', 'sync-update-blocks.py'), '--mode=guide', '--tags', ctx.tags.join(',')],
            { cwd: project, env, encoding: 'utf8' }
        );
        const after = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, 'utf8')]));
        return { python, run, before, after };
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/** Body between `<!-- CK:<name> -->` and its close marker in a root instruction file, or null. */
function ckBlock(text, name) {
    const m = new RegExp(`<!-- CK:${escapeRe(name)} -->\\n([\\s\\S]*?)<!-- /CK:${escapeRe(name)} -->`).exec(text);
    return m ? m[1] : null;
}

module.exports = {
    name: 'sync-carrier-parity',
    tests: [
        {
            name: 'PROPERTY: every (canonical SYNC tag × carrier) body matches canonical over the full domain',
            fn() {
                assertTrue(TAGS.length > 0, 'no canonical ## SYNC tags parsed — parser broken (fail-closed)');
                assertTrue(PAIRS.length > 0, 'no carrier SYNC embeds parsed — parser broken (fail-closed)');
                const drift = [];
                for (const p of PAIRS) {
                    const canon = CANON_BODY.get(p.tag);
                    if (canon == null) {
                        drift.push(`${p.carrier} embeds <!-- SYNC:${p.tag} --> but canonical has no ## SYNC:${p.tag}`);
                        continue;
                    }
                    if (norm(p.body) !== norm(canon)) {
                        drift.push(`${p.carrier} :: SYNC:${p.tag} body drifted from canonical`);
                    }
                }
                assertEqual(
                    drift.length,
                    0,
                    `carrier↔canonical drift in ${drift.length} pair(s):\n  ${drift.join('\n  ')}\n` +
                        `Fix: py -3 .claude/scripts/sync-update-blocks.py <tag>`
                );
            },
        },
        {
            // Pinned carrier count (no silent cap): review-protocol-injection reaches 13 carriers =
            // 9 review SKILLs (code-review, changes-review, artifact-review, knowledge-review,
            // production-readiness-review, plan-review, why-review, spec-clarify, architecture-review-full)
            // + 4 review AGENTS (code-reviewer, spec-compliance-reviewer, planner, integration-tester).
            // spec-clarify (the post-spec clarification gate) joined as the 8th skill: it runs INLINE for
            // its AskUserQuestion gate but performs the SAME validate→fix→fresh-full-re-review cycle as its
            // review-family peers, so it carries the trio (double-round-trip / fresh-context / protocol-injection)
            // at parity with artifact-review. architecture-review-full (the whole-project architecture-health
            // audit) joined as the 9th skill: it is an adoption-matrix review skill (BATCHING + SEVERITY in
            // inject_review_skill_blocks.py) that synthesizes a consolidated report, so it carries the plain
            // review-protocol trio at parity. A 14th appearing — or one vanishing — must surface loudly here
            // rather than quietly widen/narrow the guarded set. After the review-group conversion the
            // non-inline skills carry a guide line instead of the body; they still count (N5), while the
            // inline skills and the agents keep the body.
            name: 'COVERAGE: review-protocol-injection reaches all 13 carriers and carries the Triangulation protocol (post-P1)',
            fn() {
                const canon = CANON_BODY.get('review-protocol-injection');
                const cov = coverageCarriers(CARRIERS, RPI, projectionTextFor(SKILLS_DIR, RPI), canon);
                assertEqual(cov.problems.length, 0, `review-protocol-injection guide problems:\n  ${cov.problems.join('\n  ')}`);
                const carriers = [...cov.body, ...cov.guided];
                assertEqual(
                    carriers.length,
                    13,
                    `expected 13 review-protocol-injection carriers (body or guide), found ${carriers.length} (${cov.body.length} body, ${cov.guided.length} guide)`
                );
                assertTrue(
                    canon != null && /Spec ↔ Tests ↔ Code Triangulation/.test(canon),
                    'canonical review-protocol-injection is missing the Triangulation protocol'
                );
                const missing = carriers
                    .filter((c) => !/Spec ↔ Tests ↔ Code Triangulation/.test(c.body))
                    .map((c) => c.carrier);
                assertEqual(missing.length, 0, `carriers missing Triangulation protocol after propagation: ${missing.join(', ')}`);
            },
        },
        {
            // Sensor row N5 (P26 scratch run): the COVERAGE count must accept a guide carrier and still
            // lose it when the guide is gone, the projection drifts, or the guide sits in an agent.
            name: 'TC-PDL-065 COVERAGE counts a review-protocol-injection guide carrier only while its projection equals canonical',
            fn() {
                // Given a canonical body, one body carrier, one guide carrier and a projection equal to canonical
                const canon = '> **Review Protocol Injection** — fixture body.\n\n### Spec ↔ Tests ↔ Code Triangulation\n\nCheck all three.';
                const row = { tag: RPI, summary: 'Verbatim template for review prompts', when: 'spawning a reviewer', path: `.claude/skills/shared/protocols/${RPI}.md` };
                const guideBlock = `${guideCarrier.GUIDE_BLOCK_START}\n\n${guideCarrier.formatGuideLine(row)}\n\n${guideCarrier.GUIDE_BLOCK_END}\n`;
                const bodyCarrier = { rel: '.claude/skills/fx-inline/SKILL.md', text: `<!-- SYNC:${RPI} -->\n\n${canon}\n\n<!-- /SYNC:${RPI} -->\n` };
                const guided = { rel: '.claude/skills/fx-converted/SKILL.md', text: `# fx\n\n${guideBlock}` };
                // When the coverage is computed
                const ok = coverageCarriers([bodyCarrier, guided], RPI, `${canon}\r\n`, canon);
                // Then both count, and the guide carrier is read through the projection
                assertEqual(ok.problems.length, 0, `unexpected problems: ${ok.problems.join('; ')}`);
                assertEqual(ok.body.length + ok.guided.length, 2, 'a guide carrier backed by a canonical projection must count');
                assertTrue(/Triangulation/.test(ok.guided[0].body), 'the guide carrier is checked through the projection text');
                // When the guide entry is removed, Then that carrier no longer counts
                const noGuide = coverageCarriers([bodyCarrier, { ...guided, text: '# fx\n' }], RPI, canon, canon);
                assertEqual(noGuide.body.length + noGuide.guided.length, 1, 'a skill with neither body nor guide must not count');
                // When the projection is missing or drifted, Then the guide carrier is a problem, not a carrier
                for (const projection of [null, '> Drifted.\n']) {
                    const bad = coverageCarriers([guided], RPI, projection, canon);
                    assertEqual(bad.guided.length, 0, 'a guide without a canonical projection must not count');
                    assertEqual(bad.problems.length, 1, 'a guide without a canonical projection must be reported');
                }
                // When an agent carries the guide instead of the body, Then it is a problem (agents keep full text)
                const agent = coverageCarriers([{ rel: '.claude/agents/fx-agent.md', text: guideBlock }], RPI, canon, canon);
                assertEqual(agent.guided.length, 0, 'an agent guide entry must not count as a carrier');
                assertEqual(agent.problems.length, 1, 'an agent guide entry must be reported');
            },
        },
        {
            name: 'GUARD: OVERRIDE:review-protocol-injection blocks track canonical substance (count + every protocol header AND body verbatim), customizing only routing',
            fn() {
                const contract = parseProtocolContract(readCanonicalBody(RPI));
                assertTrue(contract != null, 'canonical review-protocol-injection contract not parsed — parser or canonical broken (fail-closed)');
                assertTrue(contract.count != null, 'canonical protocol-count phrase ("embed N protocol blocks") not found (fail-closed)');
                assertTrue(contract.protocols.size > 0, 'canonical protocol bodies not parsed between "## Protocols" and "## Reference Docs" (fail-closed)');
                assertTrue(
                    contract.protocols.has('### Spec ↔ Tests ↔ Code Triangulation'),
                    'canonical is missing the Triangulation protocol — parser regressed or canonical reverted'
                );
                // Pin the known OVERRIDE carriers (no silent cap): a 4th appearing, or one vanishing,
                // must surface loudly rather than quietly narrow/widen the guarded set.
                assertEqual(
                    OVERRIDE_CARRIERS.length,
                    3,
                    `expected 3 OVERRIDE:${RPI} carriers (integration-test-review, architecture-review, ui-review), found ${OVERRIDE_CARRIERS.length}: ` +
                        `${OVERRIDE_CARRIERS.map((o) => o.carrier).join(', ') || '(none)'}`
                );
                const drift = [];
                for (const o of OVERRIDE_CARRIERS) {
                    const oc = parseProtocolContract(o.body);
                    if (oc == null) {
                        drift.push(`${o.carrier}: OVERRIDE block has no parseable "## Protocols … ## Reference Docs" region`);
                        continue;
                    }
                    if (oc.count !== contract.count) {
                        drift.push(`${o.carrier}: stale protocol count (override = ${oc.count}, canonical = ${contract.count})`);
                    }
                    // Every canonical protocol must be present in the copy with a VERBATIM-matching body.
                    for (const [header, body] of contract.protocols) {
                        if (!oc.protocols.has(header)) {
                            drift.push(`${o.carrier}: missing protocol "${header}"`);
                        } else if (oc.protocols.get(header) !== body) {
                            drift.push(`${o.carrier}: protocol "${header}" body drifted from canonical`);
                        }
                    }
                }
                assertEqual(
                    drift.length,
                    0,
                    `OVERRIDE blocks fell behind canonical substance in ${drift.length} case(s):\n  ${drift.join('\n  ')}\n` +
                        `Fix: hand-merge the missing/changed protocol(s)/count into each <!-- OVERRIDE:${RPI} --> block, ` +
                        `PRESERVING its subagent_type customization (OVERRIDE blocks are intentional divergences — sync-update-blocks.py does NOT touch them).`
                );
            },
        },
        {
            name: 'MUTATION PROBE: a carrier-body mutation is KILLED by the parity comparator (non-vacuous)',
            fn() {
                const sample = PAIRS[0];
                const canon = CANON_BODY.get(sample.tag);
                assertTrue(canon != null, 'sample tag has no canonical body (fail-closed)');
                // Baseline: the live pair matches — the property holds before mutation.
                assertEqual(norm(sample.body), norm(canon), 'baseline parity broken — reconcile drift before trusting the probe');
                // Mutation 1 — append a drift line: MUST be detected (killed).
                assertTrue(
                    norm(sample.body + '\n- injected drift line') !== norm(canon),
                    'append-drift mutant SURVIVED — comparator is vacuous'
                );
                // Mutation 2 — stance flip (the exact class of last cycle's bug): MUST be detected.
                const flipped = canon.replace('NEVER', 'ALWAYS');
                if (flipped !== canon) {
                    assertTrue(norm(flipped) !== norm(canon), 'stance-flip mutant SURVIVED — comparator is vacuous');
                }
                // Mutation 3 — OVERRIDE substance drift: a dropped protocol, a stale count, AND a
                // protocol whose BODY silently drifts MUST all be caught by the GUARD's contract checks.
                const contract = parseProtocolContract(readCanonicalBody(RPI));
                const live = OVERRIDE_CARRIERS[0];
                if (contract != null && contract.protocols.size > 0 && live != null) {
                    const liveContract = parseProtocolContract(live.body);
                    assertTrue(liveContract != null, 'OVERRIDE mutation probe inert — live block has no parseable protocol region');
                    const [header, body] = contract.protocols.entries().next().value;
                    // 3a — drop a whole protocol: the copy no longer has the header.
                    const dropMutant = parseProtocolContract(live.body.split(header).join('### Renamed Away'));
                    assertTrue(dropMutant != null && !dropMutant.protocols.has(header), 'dropped-protocol mutant SURVIVED — OVERRIDE substance check is vacuous');
                    // 3b — drift a protocol body: header stays, normalized body differs from canonical.
                    const driftMutant = parseProtocolContract(live.body.replace(body.split('\n')[0], 'SILENTLY ALTERED FIRST LINE'));
                    if (driftMutant != null && driftMutant.protocols.has(header)) {
                        assertTrue(driftMutant.protocols.get(header) !== contract.protocols.get(header), 'body-drift mutant SURVIVED — OVERRIDE body check is vacuous');
                    }
                    // 3c — stale count.
                    if (contract.count != null) {
                        const countMutant = parseProtocolContract(live.body.split(`embed ${contract.count} protocol blocks`).join('embed 99 protocol blocks'));
                        assertTrue(countMutant != null && countMutant.count !== contract.count, 'stale-count mutant SURVIVED — OVERRIDE count check is vacuous');
                    }
                }
            },
        },
        {
            name: 'TC-PDL-034: the duplication policy states the hybrid rule and no section keeps the old never-by-path prohibition',
            fn() {
                // Given the canonical policy sections
                const sections = policySections();
                for (const [name, text] of Object.entries(sections)) {
                    assertTrue(text != null && text.length > 0, `canonical policy section "${name}" not found (fail-closed)`);
                }
                // When they are read
                const all = Object.values(sections).join('\n');
                // Then no rule says never to reference a protocol by path
                const stale = OLD_PROHIBITIONS.filter((re) => re.test(all)).map(String);
                assertEqual(stale.length, 0, `old prohibition still present: ${stale.join(', ')}`);
                // And the hybrid rule is present in the policy body
                const required = [
                    [/Skills keep guides/, 'skills keep guides'],
                    [/Hooks deliver the full text/, 'hooks deliver the full text'],
                    [/guide path is the fallback/, 'the guide path is the fallback'],
                    [/`:reminder` digests stay/, 'reminder digests stay'],
                    [/Agents keep full protocol text/, 'agents keep full text'],
                    [/Reviewer prompts carry protocol bodies inline/, 'reviewer prompts carry bodies inline'],
                    [/references\/\*\.md` stays inline/, 'SYNC bodies in references/*.md stay inline'],
                ];
                const missing = required.filter(([re]) => !re.test(sections.policy)).map(([, label]) => label);
                assertEqual(missing.length, 0, `hybrid policy is missing: ${missing.join('; ')}`);
                // And it names exactly the review-family skills that protocol-groups.json keeps inline
                const inline = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8')).inlineSkills;
                assertTrue(Array.isArray(inline) && inline.length === 5, `expected 5 inlineSkills, found ${JSON.stringify(inline)}`);
                const unnamed = inline.filter((skill) => !sections.policy.includes(`\`${skill}\``));
                assertEqual(unnamed.length, 0, `policy does not name inline skill(s): ${unnamed.join(', ')}`);
                assertTrue(/five review-family skills keep full SYNC bodies inline/.test(sections.policy), 'policy does not say the review-family skills keep full bodies inline');
                // And no carrier (skill, references/*.md, agent — OVERRIDE copies and prose digests included)
                // nor a framework doc describing the policy restates the old prohibition (P27 carry-over)
                const docs = POLICY_DOCS.filter((f) => fs.existsSync(f)).map((f) => ({ rel: path.relative(REPO, f).split(path.sep).join('/'), text: fs.readFileSync(f, 'utf8') }));
                const restated = [...CARRIERS, ...docs].flatMap((c) =>
                    OLD_PROHIBITIONS.filter((re) => re.test(c.text)).map((re) => `${c.rel}: ${re}`)
                );
                assertEqual(restated.length, 0, `old never-by-path prohibition still stated:\n  ${restated.join('\n  ')}`);
                // Non-vacuous: the scan reaches the OVERRIDE copies it guards
                assertTrue(OVERRIDE_CARRIERS.length > 0 && CARRIERS.length > OVERRIDE_CARRIERS.length, 'the carrier scan found no OVERRIDE copy (vacuous)');
            },
        },
        {
            name: 'TC-PDL-082: the policy copy in .claude/docs/development-rules.md equals the canonical body of the same variant',
            skip: DEV_RULES_SKIP,
            fn() {
                // Given the development rules in the framework repository
                const text = fs.readFileSync(DEV_RULES_PATH, 'utf8');
                // When each policy variant they carry is compared with its canonical body
                const carried = [POLICY, `${POLICY}:reminder`]
                    .map((tag) => ({ tag, body: extractHtmlSyncBody(text, tag) }))
                    .filter((c) => c.body != null);
                assertTrue(
                    carried.some((c) => c.tag === POLICY),
                    `${path.relative(REPO, DEV_RULES_PATH)} lost its <!-- SYNC:${POLICY} --> block (fail-closed)`
                );
                // Then they are byte-equal (no whitespace normalization beyond line endings)
                for (const { tag, body } of carried) {
                    assertEqual(
                        body,
                        readCanonicalBody(tag),
                        `development-rules.md SYNC:${tag} drifted from canonical. It is outside sync-update-blocks.py's ` +
                            'carrier glob: copy the canonical body into it by hand after every canonical edit'
                    );
                }
            },
        },
        {
            name: 'TC-PDL-035: after conversion only the inline skills and the agents carry the four root-carried bodies',
            fn() {
                // Given every skill and agent, and the root-carried tags of the universal group
                const ctx = rootCarriedContext();
                assertEqual(ctx.tags.length, 4, `the universal group must hold exactly the four root-carried tags, found ${JSON.stringify(ctx.tags)}`);
                assertTrue(ctx.inline.size > 0 && ctx.converted.length > 0 && ctx.agents.length > 0, 'no inline skill, converted skill or agent found (vacuous scan)');
                for (const tag of AGENT_EXEMPT_ROOT_CARRIED) assertTrue(ctx.tags.includes(tag), `agent exemption names ${tag}, which is not a root-carried tag`);
                const hasBody = (text, tag) => extractHtmlSyncBody(text, tag) != null;
                // When each is scanned for the four bodies
                const leaked = ctx.converted.flatMap((s) => ctx.tags.filter((t) => hasBody(s.text, t)).map((t) => `${s.name}: ${t}`));
                const inlineGaps = [...ctx.inline].flatMap((name) => {
                    const skill = ctx.skills.find((s) => s.name === name);
                    if (!skill) return [`${name}: inline skill has no SKILL.md`];
                    return ctx.tags.filter((t) => !hasBody(skill.text, t)).map((t) => `${name}: ${t}`);
                });
                const agentGaps = ctx.agents.flatMap((a) => [
                    ...ctx.tags.filter((t) => !AGENT_EXEMPT_ROOT_CARRIED.has(t) && !hasBody(a.text, t)).map((t) => `${a.name}: no ${t} body`),
                    ...guideTags(a.text).map((t) => `${a.name}: carries a guide entry for ${t}`),
                ]);
                // Then no converted skill carries one
                assertEqual(
                    leaked.length,
                    0,
                    `converted skill(s) still carry a root-carried body:\n  ${leaked.join('\n  ')}\n` +
                        'Fix: py -3 .claude/scripts/sync-update-blocks.py --mode=guide --tags <tag> (python3 on macOS/Linux)'
                );
                // And every inline skill carries all four
                assertEqual(inlineGaps.length, 0, `inline skill(s) lost a root-carried body:\n  ${inlineGaps.join('\n  ')}`);
                // And every agent keeps them as full text, never as a guide entry
                assertEqual(agentGaps.length, 0, `agent(s) lost a root-carried body or gained a guide entry:\n  ${agentGaps.join('\n  ')}`);
            },
        },
        {
            name: 'TC-PDL-036: every former carrier of a root-carried protocol keeps one current guide line per protocol and its reminder',
            fn() {
                // Given the converted skills and the published index row of each root-carried tag
                const ctx = rootCarriedContext();
                assertEqual(ctx.tags.length, 4, `expected the four root-carried tags, found ${JSON.stringify(ctx.tags)}`);
                const expected = new Map();
                for (const tag of ctx.tags) {
                    const row = ctx.rows.get(tag);
                    assertTrue(row != null, `${tag}: no row in the projection index (build it: node .claude/scripts/build-protocol-projection.cjs)`);
                    assertTrue(fs.existsSync(path.join(REPO, ...row.file.split('/'))), `${tag}: the guide path ${row.file} does not exist`);
                    assertTrue(/carried by the root instruction file/.test(row.when), `${tag}: the guide line does not say the root file carries it (when: "${row.when}")`);
                    expected.set(tag, expectedGuideLine(row));
                }
                // When every converted skill is scanned for its guide lines
                const problems = [];
                const formerCarriers = new Map(ctx.tags.map((t) => [t, 0]));
                for (const s of ctx.converted) {
                    const entries = guideEntries(s.text);
                    for (const tag of ctx.tags) {
                        const lines = guideLikeLines(s.text, tag);
                        if (lines.length > 1) problems.push(`${s.name}: ${lines.length} guide lines for ${tag}`);
                        if (!entries.has(tag)) {
                            if (lines.length) problems.push(`${s.name}: a ${tag} guide line outside a guide block or malformed`);
                            continue;
                        }
                        formerCarriers.set(tag, formerCarriers.get(tag) + 1);
                        if (entries.get(tag) !== expected.get(tag)) problems.push(`${s.name}: stale ${tag} guide line: ${entries.get(tag)}`);
                    }
                }
                // Then each tag has former carriers, each with exactly one current guide line
                const none = [...formerCarriers].filter(([, n]) => n === 0).map(([t]) => t);
                assertEqual(none.length, 0, `no converted skill carries a guide entry for: ${none.join(', ')} (conversion not run?)`);
                assertEqual(problems.length, 0, `guide-line problems:\n  ${problems.join('\n  ')}\nFix: re-run guide mode for the tag (it refreshes existing lines)`);

                // And the conversion itself keeps the reminder: the shipped tool over a fixture carrier
                const result = runRootCarriedConversion(ctx);
                assertTrue(result.python !== null, 'no Python 3 interpreter found (tried: python, py -3, python3); the conversion case cannot run');
                assertEqual(result.run.status, 0, `sync-update-blocks.py --mode=guide failed: ${result.run.stderr || result.run.stdout}`);
                const carried = result.after.carrier;
                const lost = ctx.tags.filter((t) => extractHtmlSyncBody(carried, t) != null);
                assertEqual(lost.length, 0, `the fixture carrier still has body(ies): ${lost.join(', ')}`);
                assertEqual(JSON.stringify(guideTags(carried).sort()), JSON.stringify(ctx.tags), 'the fixture carrier has one guide entry per root-carried tag');
                const entries = guideEntries(carried);
                for (const tag of ctx.tags) {
                    assertEqual(entries.get(tag), expected.get(tag), `${tag}: the tool wrote a guide line other than the published one`);
                    const reminder = `${tag}:reminder`;
                    assertEqual(guideLikeLines(carried, tag).length, 1, `${tag}: exactly one guide line`);
                    assertEqual(
                        extractHtmlSyncBody(carried, reminder),
                        extractHtmlSyncBody(result.before.carrier, reminder),
                        `${tag}: the conversion changed or dropped the reminder digest`
                    );
                    assertTrue(extractHtmlSyncBody(carried, reminder) != null, `${tag}: reminder digest missing after conversion`);
                }
                // Boundary: the inline skill and the agent are left byte-identical
                assertEqual(result.after.inline, result.before.inline, 'the conversion changed an inline skill');
                assertEqual(result.after.agent, result.before.agent, 'the conversion changed an agent');
            },
        },
        {
            name: 'TC-PDL-037: the framework root instruction files carry all four root-carried rules',
            skip: ROOT_FILES_SKIP,
            fn() {
                // Given the framework repository's root instruction files and the root-carried tags
                const ctx = rootCarriedContext();
                const checks = {
                    'critical-thinking-mindset': (text) => {
                        const body = ckBlock(text, 'CRITICAL-THINKING');
                        return body != null && norm(body) === norm(readCanonicalBody('critical-thinking-mindset:full'));
                    },
                    'ai-mistake-prevention': (text) => {
                        const body = ckBlock(text, 'AI-MISTAKE-PREVENTION');
                        return body != null && norm(body) === norm(readCanonicalBody('ai-mistake-prevention:full'));
                    },
                    'project-protocol-overlay': (text) => {
                        const body = ckBlock(text, 'PROJECT-PROTOCOLS');
                        return body != null && body.includes('[PROJECT-PROTOCOL-OVERLAY]') && /Overlays are ADDITIVE ONLY/.test(body);
                    },
                    'project-reference-docs-guide': (text) =>
                        text.includes('**By task phase**') && text.includes('**Dedup:**') && text.includes('Canonical gate: `SYNC:project-reference-docs-guide`'),
                };
                // A fifth root-carried tag without a root check must fail here, not pass silently.
                assertEqual(JSON.stringify(Object.keys(checks).sort()), JSON.stringify(ctx.tags), 'every root-carried tag needs a root-file check');
                // When each root file is scanned
                const missing = [];
                for (const file of ['CLAUDE.md', 'AGENTS.md']) {
                    const full = path.join(REPO, file);
                    if (!fs.existsSync(full)) {
                        missing.push(`${file}: file missing`);
                        continue;
                    }
                    const text = fs.readFileSync(full, 'utf8').replace(/\r\n?/g, '\n');
                    for (const [tag, holds] of Object.entries(checks)) if (!holds(text)) missing.push(`${file}: ${tag}`);
                }
                // Then all four rules are present in both
                assertEqual(missing.length, 0, `root instruction file(s) lost a root-carried rule:\n  ${missing.join('\n  ')}\nFix: regenerate them (/ai-context-refresh, then the Codex sync)`);
            },
        },
        {
            name: 'TC-PDL-039: converted skills hold no full protocol body; inline skills, references and agents keep canonical full bodies and no guide',
            fn() {
                // Given the canonical base tags, the inline skills and every carrier
                const inline = new Set(JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8')).inlineSkills || []);
                const baseTags = TAGS.filter((t) => !t.includes(':'));
                const skillOf = (rel) => (/^\.claude\/skills\/([^/]+)\/SKILL\.md$/.exec(rel) || [])[1] || null;
                const leaked = [];
                const fullCarrierProblems = [];
                let fullCarriers = 0;
                for (const c of CARRIERS) {
                    const skill = skillOf(c.rel);
                    const bodies = baseTags.filter((t) => extractHtmlSyncBody(c.text, t) != null);
                    // When a converted skill is scanned, Then it holds no base-tag body (its :reminder digests stay)
                    if (skill && !inline.has(skill)) {
                        leaked.push(...bodies.map((t) => `${c.rel}: ${t}`));
                        continue;
                    }
                    // When an inline skill, a references/*.md file or an agent is scanned, Then it keeps full
                    // bodies equal to canonical and carries no guide entry
                    const guides = guideTags(c.text);
                    if (guides.length) fullCarrierProblems.push(`${c.rel}: guide entry for ${guides.join(', ')}`);
                    if (skill || c.rel.startsWith('.claude/agents/')) {
                        if (bodies.length === 0) fullCarrierProblems.push(`${c.rel}: no full protocol body left`);
                        else fullCarriers++;
                    }
                    for (const t of bodies) if (norm(extractHtmlSyncBody(c.text, t)) !== norm(CANON_BODY.get(t))) fullCarrierProblems.push(`${c.rel}: ${t} differs from canonical`);
                }
                assertEqual(
                    leaked.length,
                    0,
                    `converted skill(s) still hold full protocol bodies:\n  ${leaked.join('\n  ')}\n` +
                        'Fix: py -3 .claude/scripts/sync-update-blocks.py --mode=guide --tags <tag> (python3 on macOS/Linux)'
                );
                assertEqual(fullCarrierProblems.length, 0, `full-body carriers lost their contract:\n  ${fullCarrierProblems.join('\n  ')}`);
                // Non-vacuous: every inline skill and every agent was checked as a full-body carrier
                const agentCount = CARRIERS.filter((c) => c.rel.startsWith('.claude/agents/')).length;
                const inlinePresent = [...inline].filter((s) => CARRIERS.some((c) => c.rel === `.claude/skills/${s}/SKILL.md`)).length;
                assertEqual(fullCarriers, agentCount + inlinePresent, 'every inline skill and agent must be a full-body carrier');
            },
        },
        {
            name: 'TC-PDL-040: every guide line is the published line for its tag and its projection file exists',
            fn() {
                // Given the projection index and every carrier's guide entries
                const index = JSON.parse(fs.readFileSync(PROJECTION_INDEX_PATH, 'utf8'));
                const rows = new Map((Array.isArray(index.tags) ? index.tags : []).map((r) => [r.tag, r]));
                const problems = [];
                const guidedTags = new Set();
                for (const c of CARRIERS) {
                    for (const [tag, line] of guideEntries(c.text)) {
                        guidedTags.add(tag);
                        const row = rows.get(tag);
                        // When a guide line is checked, Then its tag is published, the line is current and its file exists
                        if (!row) {
                            problems.push(`${c.rel}: ${tag} has no row in the projection index`);
                            continue;
                        }
                        if (line !== expectedGuideLine(row)) problems.push(`${c.rel}: stale ${tag} guide line`);
                        if (!fs.existsSync(path.join(REPO, ...String(row.file).split('/')))) problems.push(`${c.rel}: ${tag} projection ${row.file} is missing`);
                    }
                }
                assertTrue(guidedTags.size > 0, 'no guide entry found in any carrier (conversion not run?)');
                assertEqual(problems.length, 0, `guide-line problems:\n  ${problems.join('\n  ')}\nFix: node .claude/scripts/build-protocol-projection.cjs, then re-run guide mode for the tag`);
            },
        },
        {
            name: 'GUARD: extractors fail-closed (null on miss; no fail-open)',
            fn() {
                assertTrue(
                    extractHtmlSyncBody('no markers here', 'review-protocol-injection') === null,
                    'carrier extractor must return null on a missing marker'
                );
                assertTrue(readCanonicalBody('definitely-not-a-real-tag-xyz') === null, 'canonical extractor must return null on a missing tag');
            },
        },
        {
            // The parity property above can only guard carriers `carrierFiles()` returns, and
            // sync-update-blocks.py can only repair carriers `find_target_files()` returns. The
            // two sets were kept aligned by a COMMENT in each file and nothing else — so a scope
            // edit on one side alone fails SILENTLY in whichever direction it goes:
            //   writer ⊃ test  → the writer rewrites a carrier no property inspects; it can drift
            //                    from canonical forever while this suite stays green.
            //   test ⊃ writer  → the property fails on a carrier the writer cannot repair, and the
            //                    failure message below emits `sync-update-blocks.py <tag>` as the
            //                    remedy — a fix that provably cannot work. Permanently red, lying.
            // Comparing against the REAL writer (not a third re-implementation of its glob, which
            // would just be one more copy free to drift) is what makes this a sensor rather than
            // another comment.
            name: 'PARITY: carrierFiles() and sync-update-blocks.py find_target_files() cover the SAME file set',
            fn() {
                const { spawnSync } = require('child_process');
                // Same resolution order as count-drift.test.cjs — `python3` is an MS Store alias
                // stub on Windows and exits 49, so it is deliberately not a candidate.
                const candidates = [
                    { command: 'python', baseArgs: [] },
                    { command: 'py', baseArgs: ['-3'] },
                ];
                const script =
                    'import json,sys;sys.path.insert(0,r"' +
                    path.join(REPO, '.claude', 'scripts') +
                    '");' +
                    'import importlib.util as u;' +
                    's=u.spec_from_file_location("swb",r"' +
                    path.join(REPO, '.claude', 'scripts', 'sync-update-blocks.py') +
                    '");m=u.module_from_spec(s);s.loader.exec_module(m);' +
                    'print(json.dumps(m.find_target_files()))';

                let out = null;
                for (const c of candidates) {
                    const r = spawnSync(c.command, [...c.baseArgs, '-c', script], { encoding: 'utf8' });
                    if (r.status === 0 && r.stdout) {
                        out = r.stdout;
                        break;
                    }
                }
                // Fail LOUD, never skip silently: an unavailable interpreter must not read as
                // "scopes agree" — that is the same silent-pass this test exists to prevent.
                assertTrue(out !== null, 'could not run sync-update-blocks.py find_target_files() (tried: python, py -3)');

                const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
                const writerSet = new Set(JSON.parse(out).map(rel));
                const testSet = new Set(carrierFiles().map(rel));

                const missingFromTest = [...writerSet].filter((f) => !testSet.has(f)).sort();
                const missingFromWriter = [...testSet].filter((f) => !writerSet.has(f)).sort();

                assertEqual(
                    missingFromTest.length,
                    0,
                    `writer updates ${missingFromTest.length} carrier(s) this suite never guards (they can drift silently): ${missingFromTest.join(', ')}`
                );
                assertEqual(
                    missingFromWriter.length,
                    0,
                    `this suite guards ${missingFromWriter.length} carrier(s) the writer cannot repair (its suggested fix would not work): ${missingFromWriter.join(', ')}`
                );
                assertTrue(writerSet.size > 0, 'writer scope resolved to an EMPTY set — a vacuous comparison, not a passing one');
            },
        },
    ],
};
