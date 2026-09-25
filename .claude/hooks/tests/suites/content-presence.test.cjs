/**
 * Content-Presence Test Suite
 *
 * Re-homes the parity guarantees that USED to be enforced by the now-deleted
 * context-injection hooks. Those hooks injected guidance at runtime; the guidance
 * now lives statically in CLAUDE.md / agent .md so any host
 * reads identical instructions. These are GENUINE presence asserts — each FAILS
 * if the relocated guidance goes missing. No tautologies (we assert specific
 * load-bearing phrases, not "file is non-empty").
 *
 * Coverage (what THIS suite asserts today):
 *   TC-CP-001 — CLAUDE.md carries the workflow route gate and path→reference-doc pointer table.
 *   TC-CP-008 — tracked context surfaces carry the route gate without a duplicated catalog.
 *   TC-CP-015 — the canonical route gate carries the brief complexity assessment, the >80%
 *               catalog-fit rule, table precedence, downgrade guards (investigation, spec/doc sync,
 *               test, review) and auto-select; route examples use canonical step ids; start-workflow
 *               never proposes or asks the user to choose a route.
 *   TC-CP-002 — the universal subagent-bootstrap phrases are present in a
 *               representative sample of agents (one code, one non-code).
 *   TC-CP-003 — agent-code-standards (dev-rules + pattern docs) is present in a
 *               code agent and ABSENT from a non-code agent — the relocated
 *               dev-rules guidance reaches code agents only.
 *   TC-CP-004 — design-system-canonical-guide hook's "read the canonical design-system
 *               doc first for tokens/components/BEM" guidance relocated into the design skill.
 *   TC-CP-006 — ba-refinement-context hook's DoR / hypothesis-validation BA guidance
 *               relocated into the refine skill.
 *   TC-CP-007 — graph-grep-suggester hook's post-grep "run a graph trace, grep can't find
 *               callers/consumers/events" mandate relocated into the investigate skill.
 *   TC-CP-009 — the integration-test execution-discipline rules (verify the WHOLE system,
 *               never hack seed data / drive through real use-case paths, /debug-investigate
 *               the root cause on failure, 60s runtime cap, loop until green) are present in
 *               EVERY integration-test-family skill (write / review / verify / workflow), so the
 *               family runs/diagnoses/clears a suite identically regardless of entry point.
 *   TC-CP-010 — the test-failure fault-adjudication rules (root-cause first, triangulate the
 *               failure against spec AND source, classify SOURCE-WRONG vs TEST-WRONG, and
 *               AskUserQuestion when intended behavior is unclear) are present in EVERY
 *               debug/fix/test-family skill, so every entry point decides WHO is at fault the
 *               same way instead of silently editing whichever side makes the suite green.
 *
 *   TC-CP-011 — the understand skill's report contract (four-part section order, the mandatory
 *               diagram set, the eight-field review-stage rule, the never-invent-a-case-ID rule,
 *               the single-owner target-form rule, and the git-ignored-write HARD RULE) is
 *               present, AND all three reference contracts it loads at Step 0.3 exist with their
 *               load-bearing sections. Every one of these is enforced by prompt text alone — an
 *               edit that drops one silently changes what every run produces.
 *               It also enforces the contract STRUCTURALLY: report-template.md's form registry
 *               must match all three of its per-form tables ID-for-ID, and no other file may
 *               enumerate the form set. Presence checks cannot catch two present-but-disagreeing
 *               statements, which is what drifted in three consecutive review rounds.
 *
 *   TC-CP-016 — the UI-review surface obligations stay wired end to end: the checklist owns the
 *               surface-scope/composition rule, surface-load (B12-B15), container-fit (E9-E11),
 *               forms (§R), dialog-focus (I15) and non-working-control (K10) checks plus the single
 *               severity map; ui-review runs Surface Composition + Surface UX passes and writes
 *               per-surface reports; plan + plan-review bind the UI checklist to front-end plans;
 *               design-spec carries information priority; the calibration set exists. Each phrase
 *               is load-bearing — dropping any one silently lets an overloaded or ancestor-broken
 *               surface pass review again.
 *
 *   TC-GWF-006/058/059/060/041/042/007/010 — the guided workflow flex rules: start-workflow (their single
 *               owner) keeps gate steps fixed, lets core/optional steps flex intent-first with one
 *               deviation-log line each under the baseline runId (closed kind set), keeps data
 *               dependencies and changed-behaviour tests green; workflow-end first checks evidence
 *               for every outcome gate (review-converged via the receipt JSON or a logged cited
 *               report); both review skills read the deviation log; the nested review stays inline.
 *
 *   TC-GWF-019/020/044 — the lean route wrapper (workflow-implement-spec) stops at its gap review on a
 *               vague, contradictory or incomplete spec and escalates to workflow-feature; its plan
 *               scope is anchored to the supplied spec baseline; the two wrapper descriptions route
 *               spec-complete work and spec gaps to opposite routes.
 *
 *   TC-PDL-028 — the shipped hooks guide carries the second-host trust note in one paragraph: a new or
 *               changed delivery step runs only after the user reviews it, the review step (`/hooks`)
 *               is named, the guides deliver until then, and unchanged steps keep their earlier review.
 *
 *   TC-ADS-006 — the commit skill's default message template carries no `Fix-Origin` trailer and no text
 *               claims a sensor or a mandatory trailer (opt-in via `commit.fixOriginTrailer`).
 *   TC-ADS-007 — the commit skill names `commit.fixOriginTrailer`, limits the trailer to new commits only
 *               and never advises rewording existing commits.
 *   TC-ADS-004 — graph-build installs the graph tooling with the cross-OS node `ensurePythonDeps` command
 *               before any graph CLI call, and stops when the install fails.
 *
 *   TC-ADS-008 — the command-only utility skills (decision D-2) each declare exactly one
 *               `disable-model-invocation: true` in frontmatter, and `commit` / `learn` / `git-conflict-resolve` stay
 *               model-callable. Framework-repo guarded (synchronous signal + parity tripwire):
 *               it asserts this repo's own skill defaults, which an adopting project may change.
 *
 *   TC-ADS-025 — emphasis diet (P32) keeps the primacy/recency anchors: in each G3-selected skill the
 *               top region (the STEP-TASK anchor block through the end of `## Quick Summary`) and the
 *               `## Closing Reminders` section keep at least their recorded emphasis-marker counts
 *               (MUST/NEVER/CRITICAL/IMPORTANT/BLOCKING, SYNC bodies and frontmatter excluded), so an
 *               anchors-only body edit can never strip the anchors themselves. A fixture row proves the
 *               rule names each stripped anchor; the live row is framework-repo guarded.
 *
 * The 3 per-context inject hooks (design-system-canonical-guide / ba-refinement-context /
 * graph-grep-suggester) are now presence-asserted by TC-CP-004, TC-CP-006 and TC-CP-007
 * against the verbatim load-bearing phrases their guidance relocated to. A future skill edit
 * that drops a relocated block fails the matching TC, restoring cross-host parity.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { assertTrue } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const AGENTS_DIR = path.resolve(PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(PROJECT_DIR, '.claude', 'skills');

const readFile = p => fs.readFileSync(p, 'utf8');
const readAgent = name => readFile(path.join(AGENTS_DIR, `${name}.md`));
const readSkill = name => readFile(path.join(SKILLS_DIR, name, 'SKILL.md'));

// TC-CP-009/-010 carrier rule (R2-19). A family skill holds each pinned fragment inline in SKILL.md,
// OR carries the protocol as a guide entry (shared P25 recognizer, never a copied line format) while
// `<skills root>/shared/protocols/<tag>.md` holds the fragment. Returns one line per missing rule,
// naming the skill and the rule. The fragment and family-skill lists belong to each test.
const guideCarrier = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));
function familyRuleGaps(skillsDir, familySkills, tag, rules) {
    const projectionFile = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
    const projection = fs.existsSync(projectionFile) ? readFile(projectionFile) : '';
    const missing = [];
    for (const skill of familySkills) {
        const body = readFile(path.join(skillsDir, skill, 'SKILL.md'));
        const guided = guideCarrier.hasGuideEntry(body, tag);
        for (const [rule, phrase] of Object.entries(rules)) {
            if (!body.includes(phrase) && !(guided && projection.includes(phrase))) {
                missing.push(`${skill} → missing rule "${rule}" ("${phrase}")`);
            }
        }
    }
    return missing;
}

// Self-check guard for assertions about this framework repo's own skill defaults: the shared
// synchronous CJS guard (an async guard in a CJS suite reports a false pass). The tripwire test
// below proves it resolves exactly like .claude/scripts/codex/tests/framework-repo.helper.mjs for
// every CJS suite that uses it.
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');
const FRAMEWORK_REPO_HELPER = frameworkRepoGuard.frameworkRepoHelperPath(PROJECT_DIR);
const IS_FRAMEWORK_REPO = frameworkRepoGuard.isFrameworkRepo(PROJECT_DIR);

// Owner decision D-2 (command-only utilities): plain utility skills that no workflow, agent preload,
// Skill call or hook starts are manual-only — the user runs them as `/name` (`$name` on Codex), the
// model never self-triggers them. `commit`, `learn` and `git-conflict-resolve` stay model-callable (an agent preloads
// `commit`; `learn` auto-activates by design; the agent resolves conflicts from its own pull-before-commit step).
const COMMAND_ONLY_UTILITIES = [
    'custom-agent', 'docx-convert', 'pdf-convert', 'playwright-cli',
    'presentation-builder', 'remotion', 'sync-skills-shared-protocols', 'release-notes',
    'git-developer-performance', 'skill-creator', 'scan-codebase-health', 'graph-export',
    'ck-help', 'project-help', 'custom-prompt',
];
const MODEL_CALLABLE_BY_DECISION = ['commit', 'learn', 'git-conflict-resolve'];

// TC-ADS-025 (emphasis diet). The five most emphasis-dense step skills of the four annotated
// workflows (feature, bugfix, refactor, big-feature: top five by markers per KB of own body),
// each with the emphasis-marker counts its two anchors held when selected. An anchors-only (G2) edit
// changes body prose only; lowering a floor is a deliberate anchor change, never a side effect.
const EMPHASIS_MARKERS = /\b(?:MUST|NEVER|CRITICAL|IMPORTANT|BLOCKING)\b/g;
const EMPHASIS_ANCHOR_FLOORS = {
    'deep-research': { top: 12, closing: 47 },
    'web-research': { top: 7, closing: 35 },
    'business-evaluation': { top: 9, closing: 41 },
    test: { top: 11, closing: 38 },
    'dor-gate': { top: 6, closing: 35 },
};
// Returns one line per anchor that lost markers (or is missing). Frontmatter and SYNC bodies are
// excluded: they are not the skill's own anchor text.
function emphasisAnchorGaps(body, floors) {
    const text = String(body).replace(/\r\n?/g, '\n')
        .replace(/^---\n[\s\S]*?\n---\n/, '')
        .replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
    const count = region => (region.match(EMPHASIS_MARKERS) || []).length;
    const gaps = [];
    const summary = text.indexOf('\n## Quick Summary');
    if (summary === -1) gaps.push('top anchor: no `## Quick Summary` section');
    else {
        const next = text.indexOf('\n## ', summary + 1);
        const top = count(text.slice(0, next === -1 ? undefined : next));
        if (top < floors.top) gaps.push(`top anchor (STEP-TASK anchor + Quick Summary) holds ${top} emphasis markers, floor ${floors.top}`);
    }
    const closingAt = text.indexOf('\n## Closing Reminders');
    if (closingAt === -1) gaps.push('closing anchor: no `## Closing Reminders` section');
    else {
        const closing = count(text.slice(closingAt));
        if (closing < floors.closing) gaps.push(`closing anchor (Closing Reminders) holds ${closing} emphasis markers, floor ${floors.closing}`);
    }
    return gaps;
}
// Every `disable-model-invocation` value declared in a skill's YAML frontmatter (body text ignored).
const modelInvocationValues = body => {
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body);
    if (!frontmatter) return null;
    return [...frontmatter[1].matchAll(/^disable-model-invocation:[ \t]*(.*?)[ \t]*$/gm)].map(m => m[1]);
};

// The graph-build first step (TC-ADS-004 Test Data): one install command, identical on Windows, macOS and Linux.
const GRAPH_TOOLING_INSTALL_COMMAND =
    'node -e "const r=require(\'./.claude/hooks/lib/graph-utils.cjs\').ensurePythonDeps(); process.exit(r && r.ok ? 0 : 1)"';
// Text from `start` up to (not including) the next `end` after it; '' when `start` is absent.
const sectionBetween = (body, start, end) => {
    const from = body.indexOf(start);
    if (from === -1) return '';
    const to = body.indexOf(end, from + start.length);
    return body.slice(from, to === -1 ? undefined : to);
};
// Guided workflow execution (spec: docs/specs/WorkflowExecution/README.GuidedWorkflow.md, BR-GWF-01…16).
// start-workflow's Step Execution Protocol is the single owner of the flex rules; workflow-end's first
// step is the outcome-gate evidence check. The closed deviation-kind set is shared with workflow-end and
// the usage report, so it is pinned exactly (TC-GWF-041).
const DEVIATION_KINDS = ['when-false', 'pre-action', 'intent-skip', 'merged', 'simplified', 'reordered', 'review-report'];
const stepContract = () => sectionBetween(readSkill('start-workflow'), '## Step Execution Protocol', '\n## ');
const outcomeGateCheck = () => sectionBetween(readSkill('workflow-end'), '0. **Outcome-gate evidence check**', '\n1. ');
// Paragraphs (blank or bare `>` lines separate them, so block quotes split too) that match `pattern`.
const paragraphsMentioning = (body, pattern) => body.split(/\r?\n[ \t>]*\r?\n/).filter(p => pattern.test(p));

// TC-PDL-028 (spec: docs/specs/ContextDelivery/README.ProtocolDelivery.md, BR-PDL-05/15). The hooks guide
// ships with `.claude/`, so its second-host trust note is pinned unconditionally. All four notes must
// sit in ONE paragraph that names the host's review step (`/hooks`), so a note cannot be stitched
// together from unrelated sentences elsewhere in the guide.
const HOOKS_GUIDE = path.resolve(PROJECT_DIR, '.claude', 'docs', 'hooks', 'README.md');
const HOOK_TRUST_NOTES = {
    'a new or changed step runs only after review': /\bnew or changed\b[^.]*\b(?:skipped|not run|never runs?)\b[^.]*\buntil\b[^.]*\breview/i,
    'the review step is named': /\breview\w*\b[^.]{0,60}\bin `\/hooks`/i,
    'guides deliver until the review': /\buntil then\b[^.]*\bguide/i,
    'an unchanged step keeps its earlier review': /\b(?:did not change|unchanged)\b[^.]*\bearlier review still holds\b/i,
};
// The trust notes the best `/hooks` paragraph lacks; every note name when no paragraph names `/hooks`.
function hookTrustNoteGaps(guide) {
    const missingIn = paragraph => Object.keys(HOOK_TRUST_NOTES).filter(note => !HOOK_TRUST_NOTES[note].test(paragraph));
    const candidates = paragraphsMentioning(guide, /`\/hooks`/).map(missingIn);
    if (candidates.length === 0) return Object.keys(HOOK_TRUST_NOTES);
    return candidates.reduce((best, gaps) => (gaps.length < best.length ? gaps : best));
}

// Assert a relocated inject-hook's guidance survives in its target skill. Each phrase is a
// verbatim load-bearing fragment of the deleted hook's output — NOT a tautology. Fails loudly
// (naming the deleted hook) if the relocation is dropped, so static parity can't silently rot.
const assertRelocated = (deletedHook, skill, phrases) => {
    const body = readSkill(skill);
    const missing = phrases.filter(p => !body.includes(p));
    assertTrue(missing.length === 0,
        `${deletedHook} guidance lost from ${skill}/SKILL.md (relocation regressed):\n  ${missing.join('\n  ')}`);
};

module.exports = {
    name: 'content-presence',
    tests: [
        {
            name: '[content-presence] TC-CP-001 CLAUDE.md carries the route gate and path→doc pointers',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const missing = [];
                if (!claudeMd.includes('<!-- CK:WORKFLOW-GATE -->')) missing.push('workflow route gate');
                if (!/Path Pattern/.test(claudeMd)) missing.push('Path Pattern routing table');
                if (!/Read first/.test(claudeMd)) missing.push('prompt → reference-doc lookup table');
                // The path→doc pointer rows — each names the reference doc a hook used to inject.
                for (const doc of [
                    'backend-patterns-reference.md',
                    'frontend-patterns-reference.md',
                    'integration-test-reference.md',
                    'e2e-test-reference.md',
                    'spec-system-reference.md',
                ]) {
                    if (!claudeMd.includes(doc)) missing.push(`pointer to ${doc}`);
                }
                assertTrue(missing.length === 0,
                    `CLAUDE.md missing relocated routing guidance:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-008 tracked contexts carry routing without duplicated catalogs',
            fn: () => {
                for (const relative of ['CLAUDE.md', 'AGENTS.md', '.codex/CODEX_CONTEXT.md']) {
                    const body = readFile(path.resolve(PROJECT_DIR, relative));
                    assertTrue(body.includes('<!-- CK:WORKFLOW-GATE -->'),
                        `${relative} omits the workflow route gate`);
                    assertTrue(!body.includes('<!-- CK:WORKFLOW-SKILLS -->'),
                        `${relative} carries the runtime workflow catalog`);
                    assertTrue(!/###\s+Workflows Index \(\d+\)/.test(body),
                        `${relative} carries a static Workflows Index`);
                }
            },
        },
        {
            // Guards routing INTENT: a brief complexity assessment picks direct / custom-simple /
            // catalog workflow, a catalog workflow needs >80% of its steps to do real work, and the
            // route is auto-selected (declared, never asked). Without these, a focused change routes
            // into a full catalog workflow whose spec/scenario/seed-data steps do no work.
            name: '[content-presence] TC-CP-015 route gate assesses complexity, applies catalog fit, never asks',
            fn: () => {
                const gate = readFile(path.join(SKILLS_DIR, 'shared', 'workflow-first-gate.md'));
                const missing = [
                    '**Assess (brief',
                    'change type',
                    'risk',
                    'ambiguity',
                    'artifacts actually needed',
                    'custom-simple: only the canonical steps it needs',
                    '>80% of its unconditional steps would do real work',
                    'A behavior change keeps its test and review steps',
                    'never ask the user to choose the execution path',
                    '— because {key signals}',
                ].filter(phrase => !gate.includes(phrase));
                assertTrue(missing.length === 0,
                    `workflow-first-gate.md lost routing-assessment guidance:\n  ${missing.join('\n  ')}`);

                // Downgrade guards: the Signals → Route table is the default and catalog fit may only
                // trim no-work steps — a downgraded route keeps root-cause investigation, spec/doc
                // sync, test and review. The same phrases must reach every routing surface.
                const DOWNGRADE_GUARDS = [
                    'trimming only steps that would do no real work',
                    'a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes',
                ];
                const missingGuards = (label, body) => DOWNGRADE_GUARDS
                    .filter(phrase => !body.includes(phrase)).map(phrase => `${label} → "${phrase}"`);
                assertTrue(/the table route is the default/i.test(gate),
                    'workflow-first-gate.md no longer states the Signals → Route table takes precedence over catalog fit');

                const { buildWorkflowSkillsCatalog } = require(path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
                const guide = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['routing'] });
                assertTrue(guide.includes('>80% of its unconditional steps would do real work'),
                    'runtime Routing Decision Guide diverges from the gate catalog-fit rule');
                assertTrue(guide.includes('never ask which path to take'),
                    'runtime Routing Decision Guide lost the auto-select rule');
                assertTrue(/the table route is the default/i.test(guide),
                    'runtime Routing Decision Guide lost the table-precedence rule');
                assertTrue(guide.includes('A behavior change keeps its test and review steps'),
                    'runtime Routing Decision Guide lost the test/review guard');

                const skill = readSkill('start-workflow');
                const guardGaps = [
                    ...missingGuards('workflow-first-gate.md', gate),
                    ...missingGuards('Routing Decision Guide', guide),
                    ...missingGuards('start-workflow/SKILL.md', skill),
                ];
                assertTrue(guardGaps.length === 0,
                    `downgrade guards diverge across routing surfaces:\n  ${guardGaps.join('\n  ')}`);

                // Mid-session guard: auto-activation is a first-task-of-session behavior only. Losing
                // it lets a follow-up or correction mid-work restart a full workflow over work already
                // under way. Every routing surface the model reads must carry the same rule.
                // Required gates stay outside the skill cap, and continuing a running workflow is not
                // activation — without these the cap silently drops investigation, test, review or
                // doc sync, or cuts an active workflow short.
                const MID_SESSION = [
                    'Mid-session: never auto-activate a workflow.',
                    'Auto-activation applies only to the first task of a session (its first user prompt; compaction or resume does not reset it).',
                    'a lean chain of at most 3 skills',
                    'required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap',
                    'continuing a workflow already running is not activating one',
                    'An explicit workflow request always runs, mid-session included',
                    'or the user asking in words to use a workflow; follow it.',
                ];
                // Generated root contexts carry the same gate; check each one this project has.
                const generatedCopies = ['CLAUDE.md', 'AGENTS.md', path.join('.codex', 'CODEX_CONTEXT.md')]
                    .map(rel => [rel, path.join(PROJECT_DIR, rel)])
                    .filter(([, abs]) => fs.existsSync(abs))
                    .map(([rel, abs]) => [rel, readFile(abs)]);
                const midSessionGaps = [['workflow-first-gate.md', gate], ['Routing Decision Guide', guide], ['start-workflow/SKILL.md', skill], ...generatedCopies]
                    .flatMap(([label, body]) => MID_SESSION.filter(p => !body.includes(p)).map(p => `${label} → "${p}"`));
                assertTrue(midSessionGaps.length === 0,
                    `mid-session no-auto-activation rule diverges across routing surfaces:\n  ${midSessionGaps.join('\n  ')}`);

                // Negative guard spans the WHOLE skill: no step may propose a route or ask the user
                // to pick one. (Prohibitions like "do not use AskUserQuestion to choose" stay legal.)
                for (const [pattern, why] of [
                    [/MAY propose/, '"MAY propose" a route'],
                    [/How to present \(AskUserQuestion/, 'an AskUserQuestion route-presentation step'],
                    [/Propose Custom Pipeline/i, 'a "Propose Custom Pipeline" step'],
                ]) {
                    assertTrue(!pattern.test(skill),
                        `start-workflow carries ${why}, contradicting the auto-select gate`);
                }
                const section = skill.slice(skill.indexOf('## Custom Pipeline Option'),
                    skill.indexOf('### Task creation for Custom Pipeline'));
                assertTrue(section.length > 0, 'start-workflow lost its Custom Pipeline section');
                assertTrue(section.includes('Do NOT use `AskUserQuestion` to choose'),
                    'start-workflow must auto-select the custom pipeline without a confirmation prompt');

                // Example routes teach the model the step vocabulary: every step in a
                // `Route: custom-simple [a → b]` example must be a real canonical skill id.
                const invalidSteps = [];
                for (const [label, body] of [['workflow-first-gate.md', gate], ['start-workflow/SKILL.md', skill]]) {
                    const examples = [...body.matchAll(/Route: custom-simple(?: "[^"]*")? \[([^\]]+)\]/g)];
                    assertTrue(examples.length > 0, `${label} lost its custom-simple route example`);
                    for (const match of examples) {
                        for (const step of match[1].split('→').map(s => s.trim().split(/\s+/)[0])) {
                            if (!fs.existsSync(path.join(SKILLS_DIR, step, 'SKILL.md'))) {
                                invalidSteps.push(`${label} → "${step}"`);
                            }
                        }
                    }
                }
                assertTrue(invalidSteps.length === 0,
                    `route examples name non-canonical step ids:\n  ${invalidSteps.join('\n  ')}`);
            },
        },
        {
            // Guards activation-tier INTENT: the model never starts a `manual` workflow on its own
            // selection, asks exactly once before a `confirm` workflow, and an explicit request runs every
            // tier. A surface that loses the rule lets that surface auto-start a heavy workflow again.
            name: '[content-presence] TC-CP-017 activation tiers reach every routing surface',
            fn: () => {
                // Given every surface the model routes from
                const gate = readFile(path.join(SKILLS_DIR, 'shared', 'workflow-first-gate.md'));
                const { buildWorkflowSkillsCatalog } = require(path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
                const guide = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['routing'] });
                const skill = readSkill('start-workflow');
                const generatedCopies = ['CLAUDE.md', 'AGENTS.md', path.join('.codex', 'CODEX_CONTEXT.md')]
                    .map(rel => [rel, path.join(PROJECT_DIR, rel)])
                    .filter(([, abs]) => fs.existsSync(abs))
                    .map(([rel, abs]) => [rel, readFile(abs)])
                    .filter(([, body]) => body.includes('<!-- CK:WORKFLOW-GATE -->'));
                // The always-loaded gate is byte-budgeted, so it carries the compact rule; start-workflow and the
                // runtime catalog carry the full procedure (question contents, best non-manual route).
                const GATE = [
                    'never ask the user to choose the execution path (`confirm` tier excepted)',
                    '**Tiers** (workflow `activation`)',
                    'never self-start a `manual` workflow — name it in your route',
                    'ask once before self-starting a `confirm` one',
                    'explicit requests run any tier',
                ];
                const surfaces = [
                    ['workflow-first-gate.md', gate, GATE],
                    ...generatedCopies.map(([rel, body]) => [rel, body, GATE]),
                    ['Routing Decision Guide', guide, [
                        'except the one question a `confirm`-tier workflow requires',
                        'ask ONCE with its step count and your lean custom-simple alternative',
                        'a `manual` workflow is never selected or started by you',
                        'An explicit user request runs every tier directly',
                    ]],
                    ['start-workflow/SKILL.md', skill, [
                        '**Activation tier**',
                        'never on your own selection — take the best non-manual route and name the manual workflow in the route declaration',
                        'ask ONCE before activating',
                        'an explicit request skips the question',
                        'Never auto-activate a `manual`-tier workflow.',
                    ]],
                ];
                // When each surface is checked for its tier phrases
                const gaps = surfaces.flatMap(([label, body, phrases]) =>
                    phrases.filter(phrase => !body.includes(phrase)).map(phrase => `${label} → "${phrase}"`));
                // Then none has lost the rule
                assertTrue(gaps.length === 0, `activation-tier rule diverges across routing surfaces:\n  ${gaps.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-01 + BR-GWF-13 (the quality floor of the flex rules): `core`/`optional` steps
            // may flex, `gate` steps never do, and every deviation leaves a log line. Losing either rule
            // lets a run silently drop tests, review or spec sync.
            name: '[content-presence] TC-GWF-006 start-workflow: gate steps never skip and every deviation writes a log line',
            fn: () => {
                // Given the single owner of the flex rules
                const protocol = stepContract();
                // When its Step Execution Protocol is read
                const required = [
                    '`gate` steps ALWAYS run and are NEVER skipped, merged away, simplified away or reordered',
                    'every deviation writes one line',
                    'only after both the comment and the deviation-log line',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then the gate-never-skips rule and the log requirement are both stated
                assertTrue(protocol.length > 0, 'start-workflow lost its Step Execution Protocol section');
                assertTrue(missing.length === 0,
                    `start-workflow step contract lost load-bearing rules:\n  ${missing.join('\n  ')}`);
                // And the task list shows each task's role, so gate tasks stay visible
                assertTrue(readSkill('start-workflow').includes('subject="[Workflow] [{role}] {step-name}'),
                    'start-workflow task subjects no longer show the occurrence role');
                // And the always-read closing reminder repeats the gate rule
                assertTrue(readSkill('start-workflow').includes('`gate` steps never skip;'),
                    'start-workflow closing reminder lost the gate-never-skips rule');
            },
        },
        {
            // Guards BR-GWF-13 + BR-GWF-16: intent first, core/optional steps may be skipped, merged,
            // simplified or reordered, each logged; the rules live in one owner fed by workflows.json.
            name: '[content-presence] TC-GWF-058 start-workflow: core and optional steps flex intent-first with a logged kind; gates do not',
            fn: () => {
                // Given the flex rules
                const protocol = stepContract();
                // When they are read
                const required = [
                    'single owner of the flex rules (BR-GWF-16)',
                    "read the manifest's `intent`",
                    '`outcomeGates`',
                    '`core` and `optional` steps are recommendations',
                    'Intent first, you may skip, merge, simplify or reorder one when every applicable outcome gate can still be satisfied',
                    'Simplified and reordered steps still invoke their Skill tool and add their line',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then the freedom, its limit and its log are all stated
                assertTrue(missing.length === 0, `start-workflow flex rules lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-14: a review of unfinished work, or of an unsynced spec, proves nothing.
            name: '[content-presence] TC-GWF-059 start-workflow: no flex decision breaks a data dependency',
            fn: () => {
                // Given the flex rules
                const protocol = stepContract();
                // When the dependency rule is read
                const required = [
                    'Data dependencies never flex',
                    'a change is made before it is reviewed and before its tests run',
                    'the spec sync runs before the review that checks it',
                    'the close runs last',
                    'A reorder or merge that breaks one of these is not allowed.',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then all three standing dependencies and the prohibition are stated
                assertTrue(missing.length === 0, `start-workflow dependency rule lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-15: "tests are recommendations" covers which tests run, never whether the
            // changed behaviour is tested and green — in the rule owner AND in the close check.
            name: '[content-presence] TC-GWF-060 test choice flexes but changed behaviour is tested green before close',
            fn: () => {
                // Given the rule owner and the close step
                const protocol = stepContract();
                const check = outcomeGateCheck();
                // When the test rules are read
                const starterGaps = [
                    'Tests are recommendations of which, never of whether',
                    'The choice of test steps and test cases may flex',
                    'every behaviour the run changed is covered by tests that ran green in this run',
                    'A skip or merge that would leave changed behaviour untested or failing is not allowed.',
                ].filter(p => !protocol.includes(p));
                // Then the scope is stated in the starter
                assertTrue(starterGaps.length === 0, `start-workflow test-scope rule lost:\n  ${starterGaps.join('\n  ')}`);
                // And the close accepts only tests that cover the changed behaviour
                const testsRule = check.split('\n').find(line => line.includes('`tests-pass`:')) || '';
                assertTrue(testsRule.includes('cover every behaviour the run changed and ran green in this run'),
                    'workflow-end tests-pass evidence no longer has to cover the changed behaviour');
            },
        },
        {
            // Guards BR-GWF-08: one deviation log per run, keyed by the baseline run id, with a closed
            // deviation-kind set that workflow-end and the usage report parse. A second id format or a
            // free-form kind makes deviations unreadable to review and to the usage report.
            name: '[content-presence] TC-GWF-041 deviation log lives under the baseline runId with a closed kind set; reviewers read it',
            fn: () => {
                // Given start-workflow, workflow-end and both review skills
                const protocol = stepContract();
                const end = readSkill('workflow-end');
                // When the log contract is read
                for (const phrase of [
                    'Deviation log (the skip log)',
                    '`tmp/workflow-runs/<runId>/skips.md`',
                    '`<occurrence-id> · <deviation-kind> · <evidence>`',
                    'the baseline run id captured at activation',
                    "a nested workflow writes to its parent's log",
                    'there is no other id format',
                ]) {
                    assertTrue(protocol.includes(phrase), `start-workflow deviation-log contract lost "${phrase}"`);
                }
                // Then the deviation kinds form exactly the closed set
                const marker = 'Deviation kinds (closed set; the reason code):';
                const kindsLine = protocol.split('\n').find(line => line.includes(marker)) || '';
                const kinds = [...kindsLine.slice(kindsLine.indexOf(marker)).matchAll(/`([a-z][a-z-]*)` \(/g)].map(m => m[1]);
                assertTrue(JSON.stringify(kinds) === JSON.stringify(DEVIATION_KINDS),
                    `deviation kinds changed: expected ${DEVIATION_KINDS.join(', ')}; got ${kinds.join(', ') || 'none'}`);
                // And workflow-end writes only kinds from that set
                const written = [...end.matchAll(/ · ([a-z][a-z-]*) · /g)].map(m => m[1]);
                assertTrue(written.length > 0, 'workflow-end no longer writes a deviation-log line');
                const unknown = written.filter(kind => !DEVIATION_KINDS.includes(kind));
                assertTrue(unknown.length === 0, `workflow-end writes deviation kinds outside the closed set: ${unknown.join(', ')}`);
                // And both review skills read the log when it exists
                const readLine = "read the run's deviation log (`tmp/workflow-runs/<runId>/skips.md`) when present";
                for (const name of ['workflow-review-changes', 'changes-review']) {
                    assertTrue(readSkill(name).includes(readLine), `${name} no longer reads the deviation log as a review input`);
                }
            },
        },
        {
            // Guards BR-GWF-03 + BR-GWF-15 (SC-3): a run cannot close while any declared outcome gate
            // lacks evidence. The check comes first and covers every gate id the schema allows.
            name: '[content-presence] TC-GWF-007 workflow-end first checks evidence for every outcome gate and blocks on a gap',
            fn: () => {
                // Given workflow-end and the schema's closed gate-id set
                const end = readSkill('workflow-end');
                const schema = JSON.parse(readFile(path.resolve(PROJECT_DIR, '.claude', 'workflows.schema.json')));
                const gateIds = schema.definitions.OutcomeGate.properties.id.enum;
                const steps = sectionBetween(end, '## What To Do', '\n---');
                // When its first numbered step is read
                const firstStep = /^(\d+)\. \*\*([^*]+)\*\*/m.exec(steps);
                assertTrue(firstStep !== null && firstStep[1] === '0' && firstStep[2] === 'Outcome-gate evidence check',
                    `workflow-end's first step is not step 0, the outcome-gate evidence check (found "${firstStep && firstStep[0]}")`);
                const check = outcomeGateCheck();
                // Then it refuses the close on missing evidence, names the gate, and maps every gate id
                assertTrue(check.includes('**Missing evidence for any gate blocks the close:**'),
                    'the outcome-gate check no longer blocks on missing evidence');
                assertTrue(check.includes('name the gate and the missing evidence'),
                    'the outcome-gate refusal no longer names the gate');
                const unmapped = gateIds.filter(id => !check.includes(`\`${id}\`:`));
                assertTrue(unmapped.length === 0, `outcome gates without an evidence rule: ${unmapped.join(', ')}`);
                // And the ordered mandatory sequence starts with it
                assertTrue(/\*\*IMPORTANT MANDATORY Steps:\*\* outcome-gate-evidence-check -> /.test(end),
                    'workflow-end mandatory step list does not start with the outcome-gate evidence check');
            },
        },
        {
            // Guards BR-GWF-03 (R2-11): review-converged is machine-checked through the receipt CLI's
            // JSON; a cited report from the gate's declared satisfier closes without a question and is
            // logged, with a not-converged or stale report named in the log and the close message; the
            // commit bar is unchanged.
            name: '[content-presence] TC-GWF-042 review-converged reads the receipt JSON and accepts a cited report as a logged deviation',
            fn: () => {
                // Given workflow-end's outcome-gate check
                const rule = outcomeGateCheck().split('\n').find(line => line.includes('`review-converged`:')) || '';
                // When the review-converged rule is read
                const required = [
                    'node .claude/hooks/lib/review-receipt.cjs check',
                    'read its JSON, not its exit code',
                    '`ERROR` blocks',
                    '`CLEAN` passes',
                    '`CHANGED` with a non-null `review` passes',
                    'a `skip` receipt alone is not a receipt',
                    '`CHANGED` with `review: null` passes only when the run cites the review report',
                    // the report comes from whichever step the gate declares as its satisfier (A-M1)
                    'written by the occurrence that satisfies this gate',
                    '`outcomeGates[].satisfiedBy`',
                    '`<that occurrence-id> · review-report · <report path>`',
                    'never block or ask when a report is cited',
                    // a weak report still closes, but visibly (AC-GWF-07, A-M2)
                    'not converged: <final status>',
                    'stale: predates <occurrence-id>',
                    'the close message repeats it',
                    'Neither a receipt nor a cited report → block',
                    'a commit still needs the receipt',
                ];
                const missing = required.filter(p => !rule.includes(p));
                // Then every branch of the receipt contract is present
                assertTrue(missing.length === 0,
                    `workflow-end review-converged rule lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-01 + BR-GWF-14: a nested workflow-review-changes stays in the main session,
            // and the flex rules keep that as a fixed dependency rather than a flexible step.
            name: '[content-presence] TC-GWF-010 nested workflow-review-changes stays inline under the flex rules',
            fn: () => {
                // Given start-workflow
                const skill = readSkill('start-workflow');
                // When the nested-workflow gate and the flex rules are read
                // Then both keep the inline rule
                assertTrue(skill.includes('**EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent):**'),
                    'start-workflow lost the workflow-review-changes inline exception');
                assertTrue(stepContract().includes('a nested `workflow-review-changes` runs inline'),
                    'the flex rules no longer keep the nested review inline as a data dependency');
            },
        },
        {
            // Guards BR-GWF-04: the lean route never builds behavior the supplied spec does not contain.
            name: '[content-presence] TC-GWF-019 workflow-implement-spec: a vague, contradictory or incomplete spec stops the route and escalates',
            fn: () => {
                // Given the lean route wrapper
                const [escalation] = paragraphsMentioning(readSkill('workflow-implement-spec'), /\[ESCALATION/);
                // When its escalation paragraph is read
                const required = [
                    'the spec is vague or contradictory',
                    'the requested behavior is not in the supplied spec',
                    'STOP before `/plan`',
                    'ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first',
                    'Never guess the missing behavior and never drop it silently',
                ];
                // Then all three triggers, both options and the no-guess rule sit in that one paragraph
                assertTrue(Boolean(escalation), 'workflow-implement-spec lost its escalation paragraph');
                const missing = required.filter(p => !escalation.includes(p));
                assertTrue(missing.length === 0, `workflow-implement-spec escalation lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-05: spec-supplied work does not grow beyond the spec it was given.
            name: '[content-presence] TC-GWF-020 workflow-implement-spec: plan scope is anchored to the supplied spec baseline',
            fn: () => {
                // Given the lean route wrapper and the plan skill that records the baseline
                const [anchor] = paragraphsMentioning(readSkill('workflow-implement-spec'), /\[PLAN SCOPE ANCHOR\]/);
                // When the plan-scope paragraph is read
                const required = [
                    'Plan scope is anchored to the supplied spec baseline',
                    '`spec_baseline` at plan start',
                    'every plan task traces to that baseline',
                    '`## Proposed additions (need approval)`',
                    'never a planned task',
                ];
                // Then the anchor, the trace and the approval route for additions are stated
                assertTrue(Boolean(anchor), 'workflow-implement-spec lost its plan-scope anchor paragraph');
                const missing = required.filter(p => !anchor.includes(p));
                assertTrue(missing.length === 0, `workflow-implement-spec plan-scope anchor lost:\n  ${missing.join('\n  ')}`);
                // And the plan section it points to still exists under that name
                assertTrue(anchor.includes('Supplied-Spec Scope Baseline') && readSkill('plan').includes('## Supplied-Spec Scope Baseline'),
                    'the anchor must point at the plan skill section that records spec_baseline');
            },
        },
        {
            // Guards BR-GWF-09 + BR-GWF-04: missing behavior is specified first, never built from a guess.
            name: '[content-presence] TC-GWF-044 workflow-implement-spec: a spec lacking the requested behavior stops at the gap review; the descriptions route it to workflow-feature',
            fn: () => {
                // Given the lean and feature route wrappers
                const lean = readSkill('workflow-implement-spec');
                const feature = readSkill('workflow-feature');
                // When the gap-review paragraph and both descriptions are read
                const [escalation] = paragraphsMentioning(lean, /\[ESCALATION/);
                const description = body => (/^description:[ \t]*(.*)$/m.exec(body) || [])[1] || '';
                // Then the lean route stops at its gap review, which runs before planning
                assertTrue(Boolean(escalation) && escalation.includes('`/spec-clarify` runs as a gap review of the supplied spec against the request'),
                    'workflow-implement-spec must run /spec-clarify as the gap review that can stop the route');
                assertTrue(/IMPORTANT MANDATORY Steps:\*\* \/investigate -> \/spec-clarify -> \/plan ->/.test(lean),
                    'the gap review must run between /investigate and /plan');
                // And each description sends the other case to the other route
                assertTrue(description(lean).includes('A spec that lacks the requested behavior goes to workflow-feature'),
                    'the lean description must route a spec gap to workflow-feature');
                assertTrue(description(feature).includes('Spec-complete work goes to workflow-implement-spec'),
                    'the feature description must route spec-complete work to workflow-implement-spec');
            },
        },
        {
            name: '[content-presence] TC-CP-002 universal subagent-bootstrap phrases present in sampled agents',
            fn: () => {
                // Sample one code agent + one non-code agent — bootstrap is universal (all 29).
                // The meta-rationale header was removed (no operational value to the agent);
                // assert only the actionable load-bearing guidance.
                const phrases = [
                    'Plan first, then act',               // plan-first
                    'Context guard / progress file',      // progress-file protocol
                    'tmp/ck-agent-',                      // progress-file path contract
                ];
                const missing = [];
                for (const agent of ['backend-developer', 'docs-manager']) {
                    const body = readAgent(agent);
                    for (const p of phrases) {
                        if (!body.includes(p)) missing.push(`${agent} → "${p}"`);
                    }
                    // Autonomy was REMOVED in the Phase-03 rework — assert it did not return.
                    if (/run autonomously until the task/.test(body)) {
                        missing.push(`${agent} → autonomy paragraph re-appeared (should be removed)`);
                    }
                }
                assertTrue(missing.length === 0,
                    `subagent-bootstrap guidance drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-003 agent-code-standards reaches code agents, not non-code agents',
            fn: () => {
                const codeBody = readAgent('backend-developer');
                const nonCodeBody = readAgent('docs-manager');
                const missing = [];
                // Code agent MUST carry dev-rules + pattern-doc guidance. The meta-rationale
                // header was removed; key on the actionable content ("Development rules" lead-in
                // is unique to the code-standards block) instead of a header phrase.
                if (!codeBody.includes('Development rules')) missing.push('code agent missing dev-rules guidance');
                if (!codeBody.includes('backend-patterns-reference.md')) missing.push('code agent missing pattern-doc pointer');
                // Non-code agent MUST NOT carry it — "Development rules" appears only in this block.
                if (nonCodeBody.includes('Development rules')) missing.push('non-code agent LEAKS code-standards guidance');
                assertTrue(missing.length === 0,
                    `agent-code-standards relocation drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-004 design-system-canonical guidance relocated into design skill',
            // The relocated guidance was GENERALIZED, not lost: the deleted hook injected a
            // hardcoded `design-system-canonical.md` filename, while the skill now resolves the
            // authority from `docs/project-config.json` (`designSystem.canonicalDoc`) so a project
            // declares its own. Keying on the retired literal filename asserted the old mechanism
            // rather than the obligation, so it failed against a skill that carries the guidance in
            // full — including against HEAD, which is why this was already red before this change.
            // These two phrases pin the obligation itself: the read-before-choose ordering and the
            // never-invent floor. Each was mutation-checked to BITE — deleting the relocated bullet
            // fails both. `designSystem.canonicalDoc` was deliberately NOT included despite being
            // the obvious key: it also appears in the authority-resolution step earlier in the
            // skill, so it survives deleting this bullet entirely and would assert nothing here
            // while reading as though it did.
            fn: () => assertRelocated('design-system-canonical-guide', 'design', [
                'before choosing tokens, component patterns, breakpoints, or BEM conventions',
                'never invent a canonical path or token vocabulary',
            ]),
        },
        {
            name: '[content-presence] TC-CP-006 ba-refinement DoR/hypothesis guidance relocated into refine skill',
            fn: () => assertRelocated('ba-refinement-context', 'refine', [
                'Definition of Ready',
                'hypothesis validation',
            ]),
        },
        {
            name: '[content-presence] TC-CP-007 graph-grep post-grep trace mandate relocated into investigate skill',
            fn: () => assertRelocated('graph-grep-suggester', 'investigate', [
                'Post-Grep Trace Trigger',
                'grep CANNOT find',
            ]),
        },
        {
            name: '[content-presence] TC-CP-009 integration-test execution-discipline rules present in EVERY integration-test-family skill',
            fn: () => {
                // The five load-bearing rules the user requires across the whole integration-test
                // family. Each is a verbatim fragment of SYNC:integration-test-execution-discipline.
                // Keyed per-rule (not the literal block prose) so a phrasing tweak that PRESERVES the
                // rule still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'verify-configured-suite': 'Verify the configured relevant suite',
                    'no-shortcut-that-skips-invariant': 'Never use a shortcut that skips the behavior the assertion is meant to protect',
                    'debug-investigate-on-failure': '`/debug-investigate` the root cause',
                    'timeouts-are-budgets': 'Use project timeouts as budgets, not as fixes',
                    'configured-repeat-policy': 'Follow the configured repeat policy',
                };
                // Every integration-test-family skill — write (integration-test), review, verify,
                // and the workflow that chains them. Adding a family skill without these rules
                // (or dropping one here) must surface as a failure, not a silent gap.
                const familySkills = [
                    'integration-test',
                    'integration-test-review',
                    'integration-test-verify',
                    'workflow-write-integration-test',
                ];
                const missing = familyRuleGaps(SKILLS_DIR, familySkills, 'integration-test-execution-discipline', rules);
                assertTrue(missing.length === 0,
                    `integration-test execution-discipline rule drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: re-sync SYNC:integration-test-execution-discipline ` +
                    `(py -3 .claude/scripts/sync-update-blocks.py integration-test-execution-discipline).`);
            },
        },
        {
            name: '[content-presence] TC-CP-010 test-failure fault-adjudication rules present in EVERY debug/fix/test-family skill',
            fn: () => {
                // The load-bearing rules the user requires across the whole debug/fix/test family:
                // when a test fails, root-cause it, triangulate the failure against the owner
                // artifact AND the source to decide whether the SOURCE or the TEST is at fault, and
                // ask the user when the spec is silent/ambiguous. Keyed per-rule (verbatim fragments
                // of SYNC:test-failure-fault-adjudication) so a phrasing tweak that PRESERVES a rule
                // still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'who-is-at-fault': 'who is at fault — the source code or the test code',
                    'root-cause-first': 'trace end-to-start before editing',
                    'triangulate-owner-and-source': 'Triangulate against the owner artifact AND the source',
                    'classify-source-wrong': 'SOURCE-WRONG',
                    'classify-test-wrong': 'TEST-WRONG',
                    'ask-user-when-unclear': 'Ask the user when intended behavior is unclear',
                };
                // Every debug/fix/test-family skill — investigate, fix, the test runner,
                // the integration-test trio, e2e, and the bugfix workflow.
                // Adding a family skill without these rules (or dropping one here) must surface as
                // a failure, not a silent gap.
                const familySkills = [
                    'debug-investigate',
                    'fix',
                    'test',
                    'integration-test',
                    'integration-test-review',
                    'integration-test-verify',
                    'e2e-test',
                    'workflow-bugfix',
                ];
                const missing = familyRuleGaps(SKILLS_DIR, familySkills, 'test-failure-fault-adjudication', rules);
                assertTrue(missing.length === 0,
                    `test-failure fault-adjudication rule drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: re-sync SYNC:test-failure-fault-adjudication ` +
                    `(py -3 .claude/scripts/sync-update-blocks.py test-failure-fault-adjudication).`);
            },
        },
        {
            // Guards R2-19: once a family skill carries either pinned protocol as a guide entry, the
            // fragments must still be reachable — in the projection file — and a lost guide or a
            // projection missing one fragment must still fail, naming the skill and the rule.
            name: '[content-presence] TC-PDL-084 TC-CP-009/-010 accept a guide carrier only while the projection holds every fragment',
            fn: () => {
                const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-guide-'));
                try {
                    for (const tag of ['integration-test-execution-discipline', 'test-failure-fault-adjudication']) {
                        // Given: a fixture family skill holding a guide entry for the tag, and a
                        // projection file holding every pinned fragment.
                        const skillsDir = path.join(tmp, tag, '.claude', 'skills');
                        const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
                        const skillFile = path.join(skillsDir, 'family-skill', 'SKILL.md');
                        fs.mkdirSync(path.dirname(projection), { recursive: true });
                        fs.mkdirSync(path.dirname(skillFile), { recursive: true });
                        const rules = { 'first-rule': 'First pinned fragment', 'second-rule': 'Second pinned fragment' };
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n> ${rules['second-rule']}.\n`);
                        const guideLine = guideCarrier.formatGuideLine({ tag, summary: 'Fixture protocol', when: 'testing', path: `.claude/skills/shared/protocols/${tag}.md` });
                        fs.writeFileSync(skillFile, `# Family\n\n${guideCarrier.GUIDE_BLOCK_START}\n\n${guideLine}\n\n${guideCarrier.GUIDE_BLOCK_END}\n`);
                        const gaps = () => familyRuleGaps(skillsDir, ['family-skill'], tag, rules);

                        // When the rule check runs, Then it passes.
                        assertTrue(gaps().length === 0, `${tag}: guide carrier rejected: ${gaps().join('; ')}`);
                        // When the projection lacks one fragment, Then it fails naming the skill and rule.
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n`);
                        assertTrue(gaps().length === 1 && gaps()[0].startsWith('family-skill → missing rule "second-rule"'),
                            `${tag}: a projection missing a fragment must fail: ${gaps().join('; ')}`);
                        // When the guide entry is removed (projection whole again), Then both rules fail.
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n> ${rules['second-rule']}.\n`);
                        fs.writeFileSync(skillFile, '# Family\n\nNo carrier.\n');
                        assertTrue(gaps().length === 2 && gaps().every(g => g.startsWith('family-skill → missing rule')),
                            `${tag}: a skill with neither form must fail: ${gaps().join('; ')}`);
                        // And the inline form still passes on its own.
                        fs.writeFileSync(skillFile, `# Family\n\n${rules['first-rule']}. ${rules['second-rule']}.\n`);
                        fs.rmSync(projection);
                        assertTrue(gaps().length === 0, `${tag}: an inline carrier must still pass`);
                    }
                } finally {
                    fs.rmSync(tmp, { recursive: true, force: true });
                }
            },
        },
        {
            // Business Intent / Invariant Guarded (BR-PDL-05, BR-PDL-15): an unreviewed second-host step
            // never runs, so users must learn from the guide that a new or changed step waits for their
            // review, where to review it, that the guides deliver until then, and that unchanged steps
            // keep their earlier review.
            name: '[content-presence] TC-PDL-028 the hooks guide tells second-host users to review new delivery steps',
            fn: () => {
                // Given the shipped hooks guide
                const guide = readFile(HOOKS_GUIDE);
                // When its trust note is read, Then one paragraph carries every note
                const gaps = hookTrustNoteGaps(guide);
                assertTrue(gaps.length === 0, `.claude/docs/hooks/README.md trust note is missing: ${gaps.join('; ')}`);

                // And removing a note (boundary counter-case) fails, naming exactly that note
                const note = paragraphsMentioning(guide, /`\/hooks`/).find(p => hookTrustNoteGaps(p).length === 0);
                const withoutUnchanged = note.replace(/[^.]*\bearlier review still holds\b[^.]*\./i, '');
                assertTrue(JSON.stringify(hookTrustNoteGaps(withoutUnchanged)) === JSON.stringify(['an unchanged step keeps its earlier review']),
                    `dropping the unchanged-step sentence must fail on that note alone: ${hookTrustNoteGaps(withoutUnchanged).join('; ')}`);
                const withoutReviewGate = note.replace(/[^.]*\bnew or changed\b[^.]*\./i, '');
                assertTrue(hookTrustNoteGaps(withoutReviewGate).includes('a new or changed step runs only after review'),
                    `dropping the review-gate sentence must fail: ${hookTrustNoteGaps(withoutReviewGate).join('; ')}`);
                // And a guide with no `/hooks` paragraph fails on every note
                assertTrue(hookTrustNoteGaps('# Hooks\n\nNo trust note here.\n').length === Object.keys(HOOK_TRUST_NOTES).length,
                    'a guide without the trust note must fail on every note');
            },
        },
        {
            name: '[content-presence] TC-CP-011 understand skill carries its report contract + both reference files',
            fn: () => {
                // The understand skill's deliverable contract — section order, the mandatory diagram
                // set, the review-path stage rule, the never-invent-an-ID rule, the single-matrix
                // rule, and the git-ignored-write HARD RULE — is enforced ONLY by prompt text. An
                // edit that deletes any of it changes what every run produces while every other
                // suite still passes. These are the load-bearing phrases, not a non-empty check.
                const skillPhrases = {
                    'part-1-orient': 'Part I — Orient',
                    'part-2-route': 'Part II — Route',
                    'part-3-depth': 'Part III — Depth',
                    'part-4-prove': 'Part IV — Prove & Push Back',
                    'never-invent-a-case-id': 'Never invent a case ID',
                    'eight-field-stage-rule': 'all eight fields',
                    'single-target-form-owner': 'SOLE owner of the target-form contract',
                    'write-hard-rule': 'any git-tracked path',
                    // §0 is the read-only-this section and the FIRST thing in the report. It is
                    // registered here (not only in the template) because a section that exists in
                    // the skeleton but not in SKILL.md's [BLOCKING] drop-risk bar is a section a
                    // run under budget pressure drops first.
                    'section-zero': '§0 Detailed Summary',
                    // The report is ONE combined file at every tier. This rule replaced a
                    // report-DIRECTORY rule that survived unexamined until a real run emitted 12
                    // files; without an assertion it is one edit away from returning.
                    'one-file-always': 'ONE file at every tier',
                };
                const missing = [];
                const body = readSkill('understand');
                for (const [rule, phrase] of Object.entries(skillPhrases)) {
                    if (!body.includes(phrase)) missing.push(`understand/SKILL.md → missing "${rule}" ("${phrase}")`);
                }

                // Step 0.3 loads three contracts. A missing one degrades to a stated blocker rather
                // than a crash, but it still silently strips the detail the report depends on — so
                // the distribution must carry all three.
                const refPhrases = {
                    'report-template.md': [
                        'Target forms — the single-owner contract',
                        'The form registry — the ONE enumeration',
                        'Where this sits in the system that already existed',
                        '## 0. Detailed Summary',
                    ],
                    // D5 deliberately has NO per-diagram spec section — review-path.md owns all five
                    // of its fields. A stub here that only pointed there drifted out of agreement
                    // with the table row three review rounds running, so the table row is the only
                    // place D5 is described and it must carry the "rendered in §4" scope itself.
                    'diagram-catalog.md': [
                        'D7 — Story map (MANDATORY)',
                        'Derivation ladder',
                        '**MANDATORY** — rendered in §4, not §2',
                        '**D5 has no spec here**',
                    ],
                    // 'Cap: 3 context files per stage' was asserted here until the contract
                    // deliberately REMOVED that cap: a cap makes a run drop a file the reviewer
                    // needs, where the replacement rule makes it split the stage or the group.
                    // Asserting a rule the contract retired would have pushed the next maintainer
                    // to "fix" the red by restoring the cap — so the assertion moved to the
                    // replacement wording instead. TC-CP-013 makes the cap's RETURN a failure.
                    'review-path.md': ['No cap on context files', '[context — not changed]'],
                };
                for (const [file, phrases] of Object.entries(refPhrases)) {
                    const p = path.join(SKILLS_DIR, 'understand', 'references', file);
                    if (!fs.existsSync(p)) { missing.push(`understand/references/${file} → FILE MISSING`); continue; }
                    const ref = readFile(p);
                    for (const phrase of phrases) {
                        if (!ref.includes(phrase)) missing.push(`understand/references/${file} → missing "${phrase}"`);
                    }
                }

                // ---- Single-owner structural guard on the target-form contract ----
                //
                // Three review rounds each produced the SAME failure: a form-set claim asserted in
                // N files, a fix applied to the 1 that was cited, and nothing detecting the other
                // N-1. Phrase-parity assertions could not catch that — they check that a phrase is
                // PRESENT, and every drift instance was two present phrases disagreeing.
                //
                // So the contract was consolidated: report-template.md now owns a form REGISTRY
                // (the one enumeration) plus all three per-form detail tables, and every other file
                // carries a pointer and no list. That makes the invariant structural and checkable:
                // the registry's ID column must equal each detail table's key column, exactly and
                // in order. Adding a form to the registry alone, or to two tables out of three,
                // fails here — which is precisely the half-edit that drifted three times.
                //
                // IDs are matched, not display names: detail rows abbreviate ("F5 · Un-fixed bug"
                // vs the registry's "Un-fixed bug/error"), and it is the ID correspondence that
                // carries the invariant. Coupling to markdown table shape is intentional — a
                // reformat that breaks these patterns IS a change to the contract's single source
                // and should require updating this TC.
                const OWNER = 'report-template.md';
                const ownerPath = path.join(SKILLS_DIR, 'understand', 'references', OWNER);
                const owner = fs.existsSync(ownerPath) ? readFile(ownerPath) : '';
                const chunks = owner.split(/^### /m);
                const chunkFor = (heading) => chunks.find((c) => c.startsWith(heading)) || '';

                // Registry rows are `| **F1** | Diff | ... |`; detail rows are `| **F1 · Diff** |`.
                // The closing `**` right after the digits keeps the two patterns disjoint.
                const registryIds = [...chunkFor('The form registry')
                    .matchAll(/^\|\s*\*\*(F\d+)\*\*\s*\|/gm)].map((m) => m[1]);

                if (registryIds.length < 2) {
                    missing.push(`understand/references/${OWNER} → form registry missing or has <2 rows (expected "| **F1** | … |" rows under "### The form registry")`);
                } else {
                    const expected = registryIds.map((_, i) => `F${i + 1}`).join(',');
                    if (registryIds.join(',') !== expected) {
                        missing.push(`understand/references/${OWNER} → registry IDs are [${registryIds.join(', ')}], expected sequential [${expected}] — renumber so a form's ID is stable and greppable`);
                    }
                    for (const table of ['Table 1 of 3', 'Table 2 of 3', 'Table 3 of 3']) {
                        const chunk = chunkFor(table);
                        if (!chunk) { missing.push(`understand/references/${OWNER} → "### ${table}" section absent — the contract's three per-form tables must stay in the owner file`); continue; }
                        const ids = [...chunk.matchAll(/^\|\s*\*\*(F\d+)\s*·/gm)].map((m) => m[1]);
                        if (ids.join(',') !== registryIds.join(',')) {
                            missing.push(`understand/references/${OWNER} → "${table}" covers [${ids.join(', ') || 'none'}] but the registry declares [${registryIds.join(', ')}] — a form was added or removed in one place only; every form needs a row in the registry AND in all three tables`);
                        }
                    }
                }

                // No file outside the owner may enumerate the form set — not as registry-style rows,
                // not as a re-introduced legacy table keyed on the form nouns, and not as a COUNT.
                // The count check covers both historical violations: "Six target forms are declared
                // in Step 0" (was SKILL.md) and "Six forms are declared in Step 0" (was
                // report-template.md) — an earlier regex required the word "target" and caught only
                // the first, so `target` is optional here. Illustrative prose naming individual
                // forms stays allowed; only an enumeration or a count is drift.
                const COUNT_RX = /\b(?:four|five|six|seven|eight|nine)\s+(?:target\s+)?forms?\b/i;
                const ID_ROW_RX = /^\|\s*\*\*F\d+/m;
                const LEGACY_ROW_RX = /^\|\s*\*\*(?:Diff|Subsystem|Plan|Concept|Un-fixed bug|No user-facing story)\b/im;
                const nonOwner = { 'SKILL.md': body };
                for (const f of ['review-path.md', 'diagram-catalog.md']) {
                    const p = path.join(SKILLS_DIR, 'understand', 'references', f);
                    if (fs.existsSync(p)) nonOwner[`references/${f}`] = readFile(p);
                }
                for (const [where, text] of Object.entries(nonOwner)) {
                    const count = text.match(COUNT_RX);
                    if (count) missing.push(`understand/${where} → asserts a target-form COUNT ("${count[0]}") — the set is enumerated ONLY in references/${OWNER}'s registry; delete the count and point there`);
                    if (ID_ROW_RX.test(text)) missing.push(`understand/${where} → carries form-registry rows ("| **F…") — only references/${OWNER} may enumerate the form set`);
                    if (LEGACY_ROW_RX.test(text)) missing.push(`understand/${where} → carries a per-form table keyed on form names — that second list is what drifted from the owner three rounds running; replace it with a pointer to references/${OWNER}`);
                    // Dangling deixis. Consolidation moved the per-form tables out of these files
                    // but left two prose pointers reading "see the target-form matrix below" —
                    // aimed at a table no longer there. A cross-file pointer must name the FILE, so
                    // "below"/"above" deixis about the form contract is banned outside the owner.
                    const dangling = text.match(/target[- ]form matrix|form matrix (?:below|above)/i);
                    if (dangling) missing.push(`understand/${where} → points at a "${dangling[0]}" that does not live here — the per-form tables are in references/${OWNER}; cite it by filename and table number, never by "below"`);
                }

                assertTrue(missing.length === 0,
                    `understand report-contract drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: restore the dropped contract text, or update this TC if the contract ` +
                    `intentionally changed (a deliberate contract change SHOULD edit this test).`);
            },
        },
        {
            name: '[content-presence] TC-CP-012 understand skill emits ONE report file — no multi-file vocabulary',
            fn: () => {
                // The skill used to emit a report DIRECTORY at tier S3+ (`00-index.md` spine plus
                // `NN-{group-slug}.md` per group). That rule survived unexamined until a real run
                // produced 12 files nobody opened as a whole. It is now ONE file at every tier.
                //
                // ALLOWLIST RATIONALE — READ BEFORE BROADENING THIS PATTERN:
                // this check matches FILE-SHAPED TOKENS, never the English word "directory". The
                // word appears deliberately in the do-not-re-split rationale ("a directory is a
                // deliverable nobody opens as a whole") and in an anti-rationalization row quoting
                // the mistake ("I'll split it into a directory"). A `/directory/i` pattern would
                // fail on exactly the text that PREVENTS the regression — the guard would fight
                // the guardrail. Match what materializes files; not what argues against them.
                const FILE_SHAPED = [/00-index/i, /NN-\{group-slug\}/i, /sub-spine/i, /block path/i];
                const dir = path.join(SKILLS_DIR, 'understand');
                const files = [];
                const walk = (d) => {
                    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                        const p = path.join(d, e.name);
                        if (e.isDirectory()) walk(p);
                        else if (e.name.endsWith('.md')) files.push(p);
                    }
                };
                walk(dir);

                // Vacuity guard: a glob that matches nothing asserts nothing.
                assertTrue(files.length >= 5,
                    `TC-CP-012 found only ${files.length} markdown file(s) under .claude/skills/understand — ` +
                    `expected at least 5 (SKILL.md + 4 references). The scan is vacuous; fix the walk before trusting a green.`);

                const hits = [];
                for (const p of files) {
                    const text = readFile(p);
                    for (const rx of FILE_SHAPED) {
                        const m = text.match(rx);
                        if (m) hits.push(`${path.relative(SKILLS_DIR, p)} → "${m[0]}"`);
                    }
                }
                assertTrue(hits.length === 0,
                    `understand multi-file vocabulary returned:\n  ${hits.join('\n  ')}\n` +
                    `Fix: the report is ONE file at every tier — see references/report-template.md → ` +
                    `"Scaled report layout". At >12 groups it NESTS in the same file, never splits. ` +
                    `If the contract intentionally changed back, update this TC.`);
            },
        },
        {
            name: '[content-presence] TC-CP-013 understand skill caps nothing it SAYS, and keeps every split trigger',
            fn: () => {
                // Three assertions, one invariant with three halves. A tree where the caps are gone
                // but the triggers went with them is NOT a pass — deleting a trigger removes the
                // structure that keeps a large target readable, which is the opposite of the goal.
                //
                // ALLOWLIST RATIONALE — READ BEFORE BROADENING THESE PATTERNS:
                // this check matches CAP PHRASINGS, never bare numbers. report-template.md's
                // "Caps vs split triggers" note quotes the trigger numbers deliberately, and
                // scale-protocol.md keeps its trigger rows. A digit-shaped pattern would fail on
                // the text that documents the distinction.
                //
                // KNOWN BLIND SPOT — this guard is ONE-DIRECTIONAL. It blocks the caps that
                // existed, not a cap invented later: a future "§0: keep under 500 words" passes it
                // green. That is accepted, not overlooked — a general "no numeric limit" regex
                // would fire on the caps-vs-triggers note itself. Two backstops: CAP_PHRASINGS
                // carries BOTH the digit and word forms a cap has historically taken here, and
                // report-template.md's caps-vs-triggers note is the human-readable rule a reviewer
                // reads. Do not trust this guard past that range.
                const CAP_PHRASINGS = [
                    /1[–-]4 concepts/i, /concepts MAX/i, /1[–-]3 flows/i,
                    /3[–-]7[- ]stages?/i, /bounds the route to 3[–-]7/i, /Cap: 3 context files/i,
                    // Word forms. The digit patterns above cannot see these, which is exactly how
                    // SKILL.md's "exactly three lines — no more" survived the first cap inventory.
                    /exactly three lines/i, /lines? — no more/i,
                ];
                // Digit-free sentences BUILT ON a removed cap. No cap-shaped pattern can see these
                // — none contains a number. The last two catch the subtler second-order failure:
                // REWORDING such a sentence into the vocabulary of review-path.md's replacement
                // rule, which abolished the named-but-unrouted mechanism outright. A paraphrase
                // that keeps the mechanism contradicts the rule on the same page, and is harder to
                // spot than the dangling reference it replaced.
                const ORPHAN_PHRASINGS = [
                    /context cap/i, /cap of 3/i, /The cap bounds/i, /(file|stage) cap/i,
                    /named but/i, /(did|could) not route/i,
                ];
                // The other half: exceeding one of these ADDS structure. They must survive.
                // SECOND KNOWN BLIND SPOT, measured not assumed: this is a FILE-LEVEL presence
                // check, and several triggers are stated twice in their owning file (once in the
                // §1 group-size table, once in the §7 triggers table). Deleting ONE statement
                // leaves the guard green — proven by mutating only §1's "≤ 8 files" and watching
                // this assertion pass. Deleting BOTH goes red. So it catches a trigger REMOVED,
                // not a trigger left half-stated. Anchoring each pattern to its specific table row
                // would close the gap and couple the test to markdown layout; the looser check was
                // kept deliberately. Restating a trigger is redundancy that helps a reader — but
                // do not read a green here as proof that every restatement still agrees.
                const TRIGGERS = [
                    { file: 'references/scale-protocol.md', rx: /≤ ?8 files/, what: 'group size (≤8 files)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?2000/, what: 'group size (≤2000 diff-lines)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?12/, what: 'groups per level (≤12 → nest)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?10 lines/, what: 'sub-agent return bound (a MESSAGE bound, not a report bound)' },
                    { file: 'references/diagram-catalog.md', rx: /~ ?20 nodes/, what: 'diagram size (~20 nodes → split/subgraph)' },
                ];

                const dir = path.join(SKILLS_DIR, 'understand');
                const files = [];
                const walk = (d) => {
                    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                        const p = path.join(d, e.name);
                        if (e.isDirectory()) walk(p);
                        else if (e.name.endsWith('.md')) files.push(p);
                    }
                };
                walk(dir);
                assertTrue(files.length >= 5,
                    `TC-CP-013 found only ${files.length} markdown file(s) under .claude/skills/understand — ` +
                    `expected at least 5. The scan is vacuous; fix the walk before trusting a green.`);

                const problems = [];
                for (const p of files) {
                    const text = readFile(p);
                    const rel = path.relative(SKILLS_DIR, p);
                    for (const rx of CAP_PHRASINGS) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → content cap returned: "${m[0]}"`);
                    }
                    for (const rx of ORPHAN_PHRASINGS) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → orphaned cap reference: "${m[0]}"`);
                    }
                }
                for (const t of TRIGGERS) {
                    const p = path.join(dir, t.file);
                    const text = fs.existsSync(p) ? readFile(p) : '';
                    if (!t.rx.test(text)) problems.push(`${t.file} → SPLIT TRIGGER DELETED: ${t.what}`);
                }

                assertTrue(problems.length === 0,
                    `understand cap/trigger contract broken:\n  ${problems.join('\n  ')}\n` +
                    `Fix — "content cap returned": no rule may cap what the report SAYS; a limit that ` +
                    `binds makes a run drop knowledge to fit. Replace the count with the quality rule ` +
                    `it approximated.\n` +
                    `Fix — "orphaned cap reference": a sentence still points at (or paraphrases) a cap ` +
                    `this contract removed. Delete the clause; do not reword it into the replacement ` +
                    `rule's vocabulary.\n` +
                    `Fix — "SPLIT TRIGGER DELETED": removing a trigger does NOT remove a cap — it ` +
                    `removes the structure that keeps a large target readable. See ` +
                    `references/report-template.md → "Caps vs split triggers".`);
            },
        },
        {
            name: '[content-presence] TC-CP-014 no skill or framework config instructs CHANGELOG.md generation',
            fn: () => {
                // The framework generates release notes, never a changelog. This asserts the
                // ABSENCE of a generation duty, which presence tests cannot cover: a skill that
                // re-grows a "prepend to CHANGELOG.md" step, or a config that re-adds a
                // changelog output key, fails here.
                //
                // Deliberately NOT flagged (and the regexes below must keep letting these pass):
                //   - "history belongs in git / CHANGELOG.md / docs/adr/**" — says where a
                //     consumer project's history lives; instructs no one to write one.
                //   - "Check CHANGELOG.md" / "read the upstream CHANGELOG" — third-party.
                //   - CHANGELOG.md listed as an example root doc to SCAN — reads, never creates.
                //   - "[skip changelog]" — a commit-message marker excluding a commit from the
                //     generated notes; an input filter, not an output.
                const WRITE_VERBS =
                    /\b(?:write|writes|writing|update|updates|updating|prepend|prepends|prepending|append|appends|appending|generate|generates|generating|create|creates|creating|maintain|maintains|maintaining)\s+(?:the\s+|a\s+|an\s+|to\s+|into\s+)*[`'"]?CHANGELOG\.md/i;
                // The verb also shows up AFTER the filename ("Aggregated log: CHANGELOG.md
                // (prepended)"), so match that shape too — same verb set, opposite order.
                const WRITTEN_SUFFIX =
                    /CHANGELOG\.md[^\n]{0,40}?\b(?:prepended|appended|generated|written|created|updated|maintained|auto-saved)\b/i;
                const OUTPUT_KEYS = /\b(?:changelog_file|changelog_root|per_service_changelog)\b/;
                const GENERATOR_REF = /\bupdate-changelog(?:\.cjs)?\b/;

                const roots = [
                    path.join(PROJECT_DIR, '.claude', 'skills'),
                    path.join(PROJECT_DIR, '.claude', 'config'),
                ];
                const EXT = /\.(?:md|ya?ml|json|c?js|mjs)$/i;
                // Skill-local dependencies are installed beside documented skill
                // runners. Their third-party CHANGELOGs are not framework guidance.
                const IGNORED_DIRS = new Set(['node_modules']);
                const files = [];
                const walk = dir => {
                    if (!fs.existsSync(dir)) return;
                    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                        const p = path.join(dir, e.name);
                        if (e.isDirectory()) {
                            if (IGNORED_DIRS.has(e.name)) continue;
                            walk(p);
                        }
                        else if (EXT.test(e.name)) files.push(p);
                    }
                };
                for (const r of roots) walk(r);

                assertTrue(files.length >= 100,
                    `TC-CP-014 scanned only ${files.length} file(s) under .claude/skills + ` +
                    `.claude/config — expected at least 100. The walk is vacuous; fix it before ` +
                    `trusting a green.`);

                const problems = [];
                for (const p of files) {
                    const text = readFile(p);
                    const rel = path.relative(PROJECT_DIR, p);
                    for (const [label, rx] of [
                        ['writes a CHANGELOG.md', WRITE_VERBS],
                        ['declares a CHANGELOG.md as written output', WRITTEN_SUFFIX],
                        ['changelog output config key', OUTPUT_KEYS],
                        ['changelog generator script reference', GENERATOR_REF],
                    ]) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → ${label}: "${m[0]}"`);
                    }
                }

                assertTrue(problems.length === 0,
                    `CHANGELOG generation re-introduced:\n  ${problems.join('\n  ')}\n` +
                    `Fix: this framework produces release notes only — one dated file per release ` +
                    `under the configured release-notes output dir. Remove the changelog step, key, ` +
                    `or script; do not rename it. Reading an existing or third-party CHANGELOG is ` +
                    `fine — writing one is not.`);
            },
        },
        {
            name: '[content-presence] TC-CP-016 UI review judges whole surfaces, surface load, container fit, and binds plans',
            // Business Intent / Invariant Guarded: a UI review must judge what RENDERS (the composed
            // surface) and whether a view asks for more than its task needs, and a front-end plan must
            // be checked against the same checklist before code exists. Every phrase below is the only
            // carrier of one obligation; removing it re-opens the "30-field dialog passes review" gap.
            fn: () => {
                const DOCS_DIR = path.resolve(PROJECT_DIR, '.claude', 'docs');
                const expectations = [
                    ['docs/design-review-checklist.md', readFile(path.join(DOCS_DIR, 'design-review-checklist.md')), [
                        '### 0.5 Surface scope and composition',
                        'Severity vocabulary map',
                        '| B12 | **Surface load fits the task**',
                        '| B15 | **Complexity budget respected**',
                        '| E9  | **Container fits the task**',
                        '| E11 | Dismissing a container with unsaved input is protected',
                        '## R. Forms & Data Entry',
                        'Field Necessity Matrix',
                        '| I15 | Dialogs and overlays manage focus',
                        '| K10 | Every visible control works end to end',
                        '## H. Expert, Data-Heavy & Enterprise Use',
                    ]],
                    ['docs/design-review-calibration.md', readFile(path.join(DOCS_DIR, 'design-review-calibration.md')), [
                        '## C1 — The overloaded creation dialog',
                        '**NOT a finding.**',
                    ]],
                    ['skills/ui-review/SKILL.md', readSkill('ui-review'), [
                        '**Expand files → surfaces (MANDATORY when UI files match).**',
                        '## Phase 2B: Surface Composition',
                        '**Style-origin map.**',
                        '## Phase 2C: Surface UX Pass',
                        '**Stacking-context trap**',
                        '/surfaces/{surface}.md',
                    ]],
                    ['skills/plan-review/SKILL.md', readSkill('plan-review'), [
                        '## UI Plan Checklist Gate',
                        '**UI Plan Checklist lens**',
                    ]],
                    ['skills/plan/SKILL.md', readSkill('plan'), [
                        '**UI Surface Contract (MANDATORY',
                    ]],
                    ['skills/design-spec/SKILL.md', readSkill('design-spec'), [
                        '## 1b. Information Priority & Container',
                    ]],
                ];
                const missing = [];
                for (const [label, body, phrases] of expectations) {
                    for (const phrase of phrases) if (!body.includes(phrase)) missing.push(`${label} → ${phrase}`);
                }
                assertTrue(missing.length === 0,
                    `UI-review surface obligations lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-05: with the trailer switch off (the default) the commit guidance asks for no line
            // that nothing reads, and no text promises an automated check of it. Skill text ships with the
            // bundle, so this asserts unguarded (like TC-CP-004).
            name: '[content-presence] TC-ADS-006 commit template omits Fix-Origin by default and claims no sensor',
            fn: () => {
                // Given the commit skill
                const body = readSkill('commit');
                const step4 = sectionBetween(body, '### Step 4: Commit', '### Step 5');
                // When its default message template (the first bash block of Step 4) is read
                const template = /```bash\r?\n([\s\S]*?)```/.exec(step4);
                assertTrue(template !== null && template[1].includes('git commit -F -'),
                    'commit Step 4 lost its default message template (bash block piping into git commit -F -)');
                // Then the template carries no Fix-Origin trailer
                assertTrue(!template[1].includes('Fix-Origin'), `default commit template still carries Fix-Origin:\n${template[1]}`);
                // And the default (switch absent or false) is stated as "no Fix-Origin line"
                assertTrue(step4.includes('When the key is absent or `false`, the message carries no `Fix-Origin` line.'),
                    'commit Step 4 no longer states that the default message has no Fix-Origin line');
                // And no paragraph about the trailer claims a sensor, a presence check or a mandatory field
                const claims = paragraphsMentioning(body, /Fix-Origin|fixOriginTrailer/)
                    .filter(p => /\bsensors?\b|verif(?:y|ies)\s+(?:its\s+)?presence|required on every/i.test(p));
                assertTrue(claims.length === 0, `commit skill claims a Fix-Origin check or requirement:\n  ${claims.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-05: turning the trailer on never leads anyone to rewrite existing history.
            name: '[content-presence] TC-ADS-007 commit skill names commit.fixOriginTrailer and limits the trailer to new commits',
            fn: () => {
                // Given the part of the commit skill that describes the trailer option
                const step4 = sectionBetween(readSkill('commit'), '### Step 4: Commit', '### Step 5');
                // When a maintainer reads it
                const missing = [
                    '`commit.fixOriginTrailer` is `true` in `docs/project-config.json`',
                    'It applies to new commits only',
                    'never reword existing commits to add it',
                ].filter(p => !step4.includes(p));
                // Then it names the switch and scopes the trailer to new commits only
                assertTrue(missing.length === 0, `commit Fix-Origin opt-in text lost:\n  ${missing.join('\n  ')}`);
                // And no sentence advises rewording existing commits
                const rewordAdvice = step4.split(/(?<=[.!?])\s+/).filter(s => /\breword/i.test(s) && !/\bnever\b/i.test(s));
                assertTrue(rewordAdvice.length === 0, `commit skill advises rewording commits:\n  ${rewordAdvice.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-02: sessions no longer install the graph tooling, so the explicit build installs it
            // first, with one command that is the same on every OS, and stops on failure.
            name: '[content-presence] TC-ADS-004 graph-build installs the graph tooling as its first step',
            fn: () => {
                // Given the graph-build skill
                const body = readSkill('graph-build');
                const steps = body.slice(body.indexOf('## Steps'));
                // When its Steps section is read
                const installAt = steps.indexOf(GRAPH_TOOLING_INSTALL_COMMAND);
                const firstGraphCallAt = steps.indexOf('python .claude/scripts/code_graph');
                // Then the node install command is present and precedes every graph CLI call
                assertTrue(body.includes('## Steps') && installAt !== -1, 'graph-build lost the node ensurePythonDeps install step');
                assertTrue(firstGraphCallAt === -1 || installAt < firstGraphCallAt,
                    'graph-build runs a graph CLI command before installing the graph tooling');
                // And a failed install stops the build with a message
                const step0 = sectionBetween(steps, '### Step 0', '### ');
                assertTrue(/Non-zero exit:\*\*\s*stop\./.test(step0), 'graph-build Step 0 no longer stops when the install fails');
            },
        },
        {
            // Guards decision D-2: a utility that drops its manual-only flag re-enters the model's skill
            // list and self-triggers again; a flipped `commit`/`learn` breaks the agent and lesson paths.
            name: '[content-presence] TC-ADS-008 command-only utility skills are manual-only; commit, learn and git-conflict-resolve stay callable',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skill defaults (framework-repo signal)',
            fn: () => {
                // Given the command-only utilities and the skills the owner keeps model-callable
                const defects = [];
                // When each SKILL.md frontmatter is parsed
                for (const name of COMMAND_ONLY_UTILITIES) {
                    const values = modelInvocationValues(readSkill(name));
                    if (values === null) defects.push(`${name}: no YAML frontmatter`);
                    else if (values.length !== 1 || values[0] !== 'true') {
                        defects.push(`${name}: disable-model-invocation must be exactly one \`true\`, found ${JSON.stringify(values)}`);
                    }
                }
                for (const name of MODEL_CALLABLE_BY_DECISION) {
                    const values = modelInvocationValues(readSkill(name)) || [];
                    if (values.includes('true')) defects.push(`${name}: must stay model-callable, found disable-model-invocation: true`);
                }
                // Then every utility is manual-only and the callable pair is untouched
                assertTrue(defects.length === 0, `command-only skill policy (D-2) broken:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Guards the primacy/recency rule under the emphasis diet: body prose may go plain, the
            // top and closing anchors may not.
            name: '[content-presence] TC-ADS-025 anchors-only emphasis: a stripped top or closing anchor is named (fixture)',
            fn: () => {
                // Given a fixture skill whose anchors hold emphasis and whose body is plain
                const floors = { top: 2, closing: 2 };
                const skill = [
                    '---', 'name: fx', "description: 'Fixture.'", '---', '',
                    '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->', '> **[BLOCKING]** Run steps in order.', '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->', '',
                    '## Quick Summary', '', 'NEVER skip the checklist.', '',
                    '## Step 1', '', 'Read the input; stop when it is missing.', '',
                    '<!-- SYNC:fx -->', 'MUST MUST MUST', '<!-- /SYNC:fx -->', '',
                    '## Closing Reminders', '', '**IMPORTANT MUST ATTENTION** cite evidence.', '',
                ].join('\n');
                // When it is checked, Then no anchor gap is reported
                assertTrue(emphasisAnchorGaps(skill, floors).length === 0, `unexpected gaps: ${emphasisAnchorGaps(skill, floors).join('; ')}`);
                // When the Quick Summary loses its marker, Then the top anchor is named
                const plainTop = emphasisAnchorGaps(skill.replace('NEVER skip', 'Do not skip'), floors);
                assertTrue(plainTop.some(g => g.startsWith('top anchor')), `top anchor not named: ${plainTop.join('; ')}`);
                // When the closing reminder goes plain, Then the closing anchor is named
                const plainClose = emphasisAnchorGaps(skill.replace('**IMPORTANT MUST ATTENTION** cite', 'Cite'), floors);
                assertTrue(plainClose.some(g => g.startsWith('closing anchor')), `closing anchor not named: ${plainClose.join('; ')}`);
                // When a section is removed, Then its absence is named
                assertTrue(emphasisAnchorGaps(skill.replace('## Closing Reminders', '## Notes'), floors).some(g => g.includes('no `## Closing Reminders`')), 'missing closing section not named');
                // And a SYNC body's markers never count toward an anchor (moving the markers into SYNC fails)
                const syncOnly = skill.replace('NEVER skip', 'Do not skip').replace('## Step 1', '<!-- SYNC:q -->\nNEVER NEVER\n<!-- /SYNC:q -->\n\n## Step 1');
                assertTrue(emphasisAnchorGaps(syncOnly, floors).some(g => g.startsWith('top anchor')), 'SYNC markers were counted toward the top anchor');
            },
        },
        {
            name: '[content-presence] TC-ADS-025 the emphasis-diet skills keep their top and closing anchor markers',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skill anchors (framework-repo signal)',
            fn: () => {
                // Given the five G3-selected skills and the anchor counts they held when selected
                const gaps = [];
                // When each SKILL.md is read
                for (const [name, floors] of Object.entries(EMPHASIS_ANCHOR_FLOORS)) {
                    for (const gap of emphasisAnchorGaps(readSkill(name), floors)) gaps.push(`${name}: ${gap}`);
                }
                // Then no anchor lost emphasis markers
                assertTrue(gaps.length === 0, `emphasis anchors stripped:\n  ${gaps.join('\n  ')}`);
            },
        },
        {
            // Guards lessons.md "a tripwire per guard": every CJS suite that gates a self-check on
            // tests/lib/framework-repo-guard.cjs (content-presence, project-config-refactor-keys,
            // workflow-routing-switch) must resolve exactly like the ESM helper, which PORT-011 locks
            // active here. A drift makes a guarded self-check skip silently, so both the layouts that
            // decide the signal and this checkout are compared.
            name: '[content-presence] tripwire: the shared synchronous framework-repo guard agrees with framework-repo.helper',
            skip: fs.existsSync(FRAMEWORK_REPO_HELPER) ? false : 'framework-repo helper not present in this bundle',
            fn: async () => {
                const helper = await import(pathToFileURL(FRAMEWORK_REPO_HELPER).href);
                // Given fixture roots for each layout the signal depends on (the helpers read only files
                // under the root they are given, so no env or home-dir state is involved)
                const upstream = frameworkRepoGuard.DEFAULT_FRAMEWORK_PACKAGE_NAME;
                const pkg = name => JSON.stringify({ name });
                const tooling = name => JSON.stringify({ portability: { toolingPackageName: name } });
                const cases = [
                    { label: 'upstream name, no config', files: { 'package.json': pkg(upstream) }, expected: true },
                    { label: 'adopter package', files: { 'package.json': pkg('adopter-app') }, expected: false },
                    { label: 'no package.json', files: {}, expected: false },
                    { label: 'malformed package.json', files: { 'package.json': '{bad' }, expected: false },
                    {
                        label: 'configured tooling name',
                        files: { 'package.json': pkg('vendor-tooling'), 'docs/project-config.json': tooling('vendor-tooling') },
                        expected: true
                    },
                    {
                        label: 'config relocated by .ck.json',
                        files: {
                            'package.json': pkg('vendor-tooling'),
                            '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/team.json' } }),
                            'config/team.json': tooling('vendor-tooling'),
                            'docs/project-config.json': tooling('other-name')
                        },
                        expected: true
                    }
                ];
                for (const { label, files, expected } of cases) {
                    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-framework-guard-'));
                    try {
                        for (const [relative, body] of Object.entries(files)) {
                            fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
                            fs.writeFileSync(path.join(root, relative), body, 'utf8');
                        }
                        // When both helpers resolve the signal
                        const sync = frameworkRepoGuard.isFrameworkRepo(root);
                        const esm = helper.isFrameworkRepo(root);
                        // Then they agree, and on the expected answer
                        assertTrue(sync === esm, `${label}: guard parity: helper=${esm} sync=${sync}`);
                        assertTrue(sync === expected, `${label}: expected ${expected}, got ${sync}`);
                    } finally {
                        fs.rmSync(root, { recursive: true, force: true });
                    }
                }
                // And this checkout resolves identically through both
                assertTrue(helper.isFrameworkRepo(PROJECT_DIR) === IS_FRAMEWORK_REPO,
                    `guard parity: helper=${helper.isFrameworkRepo(PROJECT_DIR)} sync=${IS_FRAMEWORK_REPO}`);
            },
        },
    ],
};
