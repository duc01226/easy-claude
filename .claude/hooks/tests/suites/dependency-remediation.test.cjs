/**
 * Dependency Remediation Test Suite
 *
 * Guards the Dependency Remediation capability (docs/specs/WorkflowExecution/README.DependencyRemediation.md):
 * one shared fix-at-owner rule, the remediation mode of the dependency-change skill, its evidence
 * contract and authority limits, one cited table of ecosystem facts, and the entry points that hand a
 * failed dependency scan to the remediation.
 *
 * Coverage:
 *   TC-DPR-001 — one owner for the fix-at-owner rule; carriers point to it; no other guidance restates the route order.
 *   TC-DPR-002 — routes are tried in order and a later route records why earlier ones failed.
 *   TC-DPR-003 — temporary forces are removed; accepted entries carry reason, owner and expiry.
 *   TC-DPR-004 — reachability lowers priority only.
 *   TC-DPR-005 — every moved package (from the lock difference) is researched; a planned upgrade keeps its target.
 *   TC-DPR-006 — done means a clean re-scan; no runnable scanner means blocked.
 *   TC-DPR-007 — edits wait for approval; each external action needs its own authority; Git stays elsewhere.
 *   TC-DPR-008 — targeted tests first, the full lane once (in the caller's verify when it has one, standalone fix included), no all-pass claim from targeted runs.
 *   TC-DPR-009 — one cited ecosystem table; no second per-manager scanner command block in guidance.
 *   TC-DPR-010 — evidence carries identifiers only.
 *   TC-DPR-011 — the remediation contract is complete when called directly.
 *   TC-DPR-012 — every entry point reaches the remediation; planning keeps its own route.
 *   TC-DPR-014 — every run reports remediation path health; scanner setup names a responder.
 *   (TC-DPR-013, the optional policy settings, lives in dependency-security-config.test.cjs.)
 *
 * Portability: every row asserts this framework repository's own guidance and is skipped in any
 * other project (framework-repo signal). Paths use node:path; text is read with LF line endings.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own dependency guidance (framework-repo signal)';

const CLAUDE = path.join(REPO_ROOT, '.claude');
const SKILLS = path.join(CLAUDE, 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const TAG = 'dependency-fix-at-owner';
const skill = () => read(SKILLS, 'package-upgrade', 'SKILL.md');
const remediate = () => read(SKILLS, 'package-upgrade', 'references', 'mode-remediate.md');
const ecosystems = () => read(SKILLS, 'package-upgrade', 'references', 'ecosystems.md');
const supplyChain = () => read(SKILLS, 'security-audit', 'references', 'security-audit-skill-supply-chain.md');

/** The canonical body of `tag` in sync-inline-versions.md, without its heading. */
function canonical(tag) {
    const text = read(SKILLS, 'shared', 'sync-inline-versions.md');
    const head = `\n## SYNC:${tag}\n`;
    const start = text.indexOf(head);
    assert.ok(start >= 0, `canonical SYNC:${tag} exists`);
    const from = start + head.length;
    return text.slice(from, text.indexOf('\n---\n', from)).trim();
}

/** Every Markdown file under the skills tree and the agents folder, as [relative path, text]. */
function guidanceMarkdown() {
    const out = [];
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) out.push([path.relative(REPO_ROOT, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n')]);
        }
    };
    walk(SKILLS);
    walk(path.join(CLAUDE, 'agents'));
    return out;
}

/** Text with every generated `<!-- SYNC:tag -->` / `:reminder` block removed (those are projections of their owner). */
function withoutSyncBlocks(text) {
    return text.replace(/<!-- SYNC:([^>\s]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
}

/** True when the text restates all four fix routes. */
function namesAllRoutes(text) {
    return /refresh(?:es)?[^.\n]{0,40}within[^.\n]{0,20}range/i.test(text)
        && /(?:parent upgrade|upgrade[^.\n]{0,20}owning parent)/i.test(text)
        && /temporary force/i.test(text)
        && /accepted entr/i.test(text);
}

const tests = [
    {
        name: 'TC-DPR-001 one owner holds the fix-at-owner rule and its carriers point to it',
        skip: SKIP,
        fn: () => {
            // Given the canonical owner, Then it states all six parts of the rule
            const body = canonical(TAG);
            for (const part of ['Trace the owner chain', 'Try the routes in order', 'Forces are temporary; accepted entries expire', 'Reachability lowers priority only', 'Research every moved package', 'Done means a clean re-scan']) {
                assert.ok(body.includes(`**${part}**`), `the owner states "${part}"`);
            }
            // The published projection exists, and both carriers reach it
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${TAG}.md`)), 'the projection is published');
            assert.match(skill(), new RegExp(`- \`${TAG}\` — [^\\n]*→ \\.claude/skills/shared/protocols/${TAG}\\.md`), 'the dependency-change skill carries a guide line');
            assert.match(supplyChain(), new RegExp(`\\.claude/skills/shared/protocols/${TAG}\\.md`), 'the audit dimension points to the published rule');
            // Boundary: outside the owner, its projection and the procedure that applies it, no guidance restates the four routes
            const exempt = new Set([
                '.claude/skills/shared/sync-inline-versions.md',
                `.claude/skills/shared/protocols/${TAG}.md`,
                '.claude/skills/package-upgrade/references/mode-remediate.md'
            ]);
            const copies = guidanceMarkdown().filter(([rel, text]) => !exempt.has(rel) && namesAllRoutes(withoutSyncBlocks(text))).map(([rel]) => rel);
            assert.deepEqual(copies, [], 'no second copy of the route order');
        }
    },
    {
        name: 'TC-DPR-002 fix routes are tried in order and a later route records why',
        skip: SKIP,
        fn: () => {
            const body = canonical(TAG);
            const order = ['(a) refresh the lock within the ranges already declared', '(b) upgrade the owning parent', '(c) force the indirect version temporarily', '(d) only when no route delivers the fixed version, accept the advisory'];
            const at = order.map(step => body.indexOf(step));
            at.forEach((index, i) => assert.ok(index >= 0, `the owner names route ${order[i]}`));
            assert.deepEqual([...at].sort((x, y) => x - y), at, 'routes appear in the stated order');
            assert.match(body, /Record why each earlier route could not\./);
            // The procedure stops at the first route that works and keeps the reason
            assert.match(remediate(), /Check routes in order and stop at the first that delivers the fixed version/);
            assert.match(remediate(), /record why the first two routes failed/);
            // Boundary: a declared package owns itself
            assert.match(body, /a declared package owns itself/);
        }
    },
    {
        name: 'TC-DPR-003 temporary forces are removed and accepted entries carry reason, owner and expiry',
        skip: SKIP,
        fn: () => {
            const body = canonical(TAG);
            assert.match(body, /gets a reason, an owner and an expiry in the scanner's own suppression file, or beside it in the project's own record when the scanner has no such field\. An entry missing any of the three is not accepted\./);
            const text = remediate();
            assert.match(text, /Remove every temporary force the lock no longer needs, and confirm the lock still holds the fixed version\./);
            assert.match(text, /If the lock cannot keep the fixed version without it, it becomes an accepted entry with reason, owner and expiry\./);
            assert.match(text, /\*\*Forces and accepted entries:\*\* added, kept and removed, each with reason, owner and expiry\./);
            // Existing forces and entries are audited on the way (the vulnerable-floor case)
            assert.match(text, /a force whose floor is now vulnerable, a force the lock no longer needs, or an expired entry is part of this remediation/);
        }
    },
    {
        name: 'TC-DPR-004 reachability lowers priority only',
        skip: SKIP,
        fn: () => {
            assert.match(canonical(TAG), /\*\*Reachability lowers priority only\*\* — evidence that vulnerable code is not reached changes the ranking; it never closes or accepts an advisory by itself\./);
            assert.match(remediate(), /\*\*lowers priority only\*\*/);
            assert.match(supplyChain(), /Reachability lowers priority only: it never closes or accepts an advisory by itself/);
        }
    },
    {
        name: 'TC-DPR-005 every moved package is researched and a planned upgrade keeps its target version',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            assert.match(text, /Diff the lock before and after\. \*\*Every\*\* package whose resolved version moved is listed, declared or not\./);
            assert.match(text, /Record the source link and a verdict/);
            assert.match(text, /Moved packages outside the advisory's owner chain are still researched/);
            // A pinned or compared old version breaks on a harmless move: the repository is searched for it
            assert.match(text, /Search the repository, lock files excluded, for each moved package's old exact version/);
            assert.match(canonical(TAG), /search the repository, lock files excluded, for each moved package's old exact version/);
            assert.match(skill(), /the repository is searched for its old exact version/);
            // A mover the research missed is researched and shown before approval again (PR review F6)
            assert.match(text, /Research any package that moved and was not on that list, and, unless the user already asked for the fix, show those packages with their verdicts and wait for approval again/);
            // A breaking change gets a code fix and a test that fails without it
            assert.match(text, /add or update a test that fails without the fix/);
            // Planning keeps its target and adds the movers (BR-DPR-11)
            const plan = skill();
            assert.match(plan, /\*\*Target version:\*\* the latest stable release from the ecosystem's official registry page, or the version the user named/);
            assert.match(plan, /list every package whose resolved version moves, declared or not, and research each one the same way/);
            assert.match(plan, /Plan mode leaves the project's own files unchanged\./);
        }
    },
    {
        name: 'TC-DPR-006 done means a clean re-scan, and no runnable scanner means blocked',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            assert.match(text, /\*\*Done when:\*\* a re-scan with the project's scanner reports accepted entries only/);
            assert.match(text, /Only accepted entries may remain\. Any other advisory returns to step 3 for that advisory\./);
            assert.match(text, /A scanner that cannot run makes the run \*\*blocked\*\*, never done/);
            assert.match(canonical(TAG), /No runnable scanner means blocked, never done\./);
            // A default-branch alert service cannot prove an unmerged change clean (PR review F3)
            assert.match(text, /An alert service that reads only the default branch \(Dependabot alerts\) cannot re-scan an unmerged change\./);
        }
    },
    {
        name: 'TC-DPR-007 edits wait for approval and each external action waits for its own authority',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            assert.match(text, /Wait for explicit approval\./);
            assert.match(text, /Skip this question only when the user already asked for the fix to be made/);
            assert.match(text, /Each of these needs the user's explicit authority, asked once per action:/);
            assert.match(text, /Committing, pushing and opening a pull request go through the `commit` and `pull-request` skills/);
            // Nothing in the working tree changes before approval: research resolves in a throwaway copy (PR review F1)
            assert.match(text, /Produce the candidate lock in a throwaway copy, never in the working tree before approval/);
            assert.doesNotMatch(text, /resolve in the working tree/);
            // A decline at the second approval, after edits began, restores the files saved before the first edit
            assert.match(text, /Before the first edit, copy every manifest, lock and suppression file this step will change to a folder under `tmp\/`\. If the user declines at the second approval below, restore those files from that copy/);
            // Dismissing a remote alert needs its own authority
            assert.match(text, /- dismissing a remote alert \(for example a Dependabot alert\) as an accepted entry;/);
            // Boundary: plan mode never edits
            assert.match(skill(), /Plan mode never edits project files; it writes only its own notes and report under `tmp\/`\./);
        }
    },
    {
        name: 'TC-DPR-008 targeted tests run first, the full lane once, and no all-pass claim from targeted runs',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            assert.match(text, /Run the tests that exercise moved packages first/);
            assert.match(text, /Then run the project's full test lane once\./);
            assert.match(text, /Claim "all tests pass" only after the full lane passed; an unavailable full lane is reported as not run\./);
            // A caller with its own verify step owns the tests, so the full lane still runs once (PR review F2)
            assert.match(text, /A caller with its own verify step \(such as `workflow-bugfix`\) owns step 8: this mode runs steps 1–7/);
            assert.doesNotMatch(text, /this mode still runs steps 1–8/);
            // The caller's verify fills the report's test item, so a caller-owned run still records its results (AC-DPR-12)
            assert.match(text, /so the full lane still runs once; the caller adds that run's results to the report's test item\./);
            // Standalone fix ends in one verify, so it owns the full lane too; its inherited review gates are not dropped
            assert.match(text, /A standalone `fix` handoff is such a caller: its contract ends in one verify\./);
            assert.doesNotMatch(text, /from a standalone `fix` handoff, this mode runs steps 1–8/);
            const fixSkill = read(SKILLS, 'fix', 'SKILL.md');
            const fixCi = read(SKILLS, 'fix', 'references', 'target-ci.md');
            assert.match(fixSkill, /\*\*Vulnerable-dependency issue handoff:\*\* [^\n]*runs its steps 1–7[^\n]*this branch's inherited gates still follow, and its single verify runs that selection first and then the full lane once/);
            assert.match(fixCi, /\*\*Dependency vulnerability scan handoff:\*\* [^\n]*the inherited gates and the single verify then follow/);
            for (const [label, body] of [['fix SKILL.md', fixSkill], ['fix target-ci.md', fixCi]]) {
                assert.doesNotMatch(body, /stop this branch/, `${label} hands off without dropping the inherited gates`);
            }
        }
    },
    {
        name: 'TC-DPR-009 one cited table owns the ecosystem facts',
        skip: SKIP,
        fn: () => {
            const text = ecosystems();
            assert.match(text, /Accessed: 20\d\d-\d\d-\d\d/, 'the table states its access date');
            const rows = text.split('\n').filter(line => line.startsWith('|') && !/^\|\s*-/.test(line));
            const dataRows = rows.filter(line => !/^\|\s*(?:Package manager|Scanner|Manager)\s*\|/i.test(line));
            assert.ok(dataRows.length >= 8, 'the table covers several package managers and scanners');
            for (const row of dataRows) assert.match(row, /https?:\/\//, `every row cites a source: ${row.slice(0, 60)}`);
            // The throwaway-copy research resolves lock-only for the JavaScript managers, so it installs nothing
            assert.match(text, /\*\*Lock-only resolution\*\*/);
            for (const command of ['npm install --package-lock-only', 'pnpm install --lockfile-only', 'yarn install --mode=update-lockfile']) {
                assert.ok(text.includes(`\`${command}\``), `the table names ${command}`);
            }
            assert.match(remediate(), /lock-only where the manager supports it \(ecosystem table, "Lock-only resolution"\), so the research installs nothing/);
            // Boundary: no other guidance holds a fenced block listing two or more scanner commands
            const scanners = /\b(?:npm audit|pnpm audit|yarn npm audit|pip-audit|dotnet list package --vulnerable|govulncheck|cargo audit|osv-scanner)\b/g;
            const second = guidanceMarkdown().filter(([rel]) => !rel.endsWith('package-upgrade/references/ecosystems.md')).filter(([, body]) => {
                for (const block of body.match(/```[\s\S]*?```/g) || []) {
                    if (new Set(block.match(scanners) || []).size >= 2) return true;
                }
                return false;
            }).map(([rel]) => rel);
            assert.deepEqual(second, [], 'no second per-manager scanner command block');
        }
    },
    {
        name: 'TC-DPR-010 evidence carries identifiers only',
        skip: SKIP,
        fn: () => {
            assert.match(remediate(), /\*\*Identifiers only:\*\* reports and comments name packages, versions and advisory identifiers\. Never paste scanner logs, URLs carrying tokens, or credentials\./);
        }
    },
    {
        name: 'TC-DPR-011 the remediation contract is complete when called directly',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            for (const part of ['**Inputs** (any one)', '**Project inputs**', '**Missing input**', '**Output**', '**Authority**']) {
                assert.ok(text.includes(`| ${part} |`), `the contract names ${part}`);
            }
            assert.match(text, /Never invent advisories or scan results\./);
            // The skill sends remediation through this reference first
            assert.match(skill(), /\| `--mode=remediate` \|[^\n]*\| \[references\/mode-remediate\.md\]\(references\/mode-remediate\.md\) — in full, before any step \|/);
        }
    },
    {
        name: 'TC-DPR-012 every entry point reaches the remediation and planning keeps its own route',
        skip: SKIP,
        fn: () => {
            const description = skill().match(/^description: '([^'\n]+)'$/m);
            assert.ok(description, 'the skill has a description');
            assert.match(description[1], /^\[Code Quality\] Use when planning dependency upgrades or researching breaking changes in any package ecosystem\. --mode=remediate fixes a red dependency scan, alert or vulnerable-package issue/);
            assert.ok(description[1].length <= 250, 'description stays within 250 characters');
            assert.match(read(SKILLS, 'fix', 'references', 'target-ci.md'), /\*\*Dependency vulnerability scan handoff:\*\* [^\n]*`\/package-upgrade --mode=remediate`/);
            assert.match(read(SKILLS, 'fix', 'SKILL.md'), /\*\*Vulnerable-dependency issue handoff:\*\* [^\n]*`\/package-upgrade --mode=remediate`/);
            const bugfix = read(SKILLS, 'workflow-bugfix', 'SKILL.md');
            assert.match(bugfix, /· dependency advisory \(a vulnerable package version reported by a dependency scan, alert or issue\)\./);
            assert.match(bugfix, /\| Dependency advisory \|[^\n]*`\/package-upgrade --mode=remediate` is the fix step[^\n]*RED proof = the project's scanner reports the advisory on the old lock and not on the new one/);
            assert.match(read(CLAUDE, 'workflows.json'), /DEPENDENCY ADVISORY kind: \/package-upgrade --mode=remediate is the fix; RED = the scanner reports the advisory on the old lock, GREEN = not on the new one/);
            assert.match(supplyChain(), /\*\*Remediation:\*\* this audit reports\. When the user asks for the vulnerable packages to be fixed, hand the findings to `\/package-upgrade --mode=remediate`/);
            assert.match(read(SKILLS, 'security-audit', 'references', 'security-audit-skill-fix-loop.md'), /Validated D3 dependency advisories \(vulnerable package versions\) go to `\/package-upgrade --mode=remediate` instead/);
            assert.match(read(CLAUDE, 'agents', 'security-auditor.md'), /fixes go to `\/package-upgrade --mode=remediate`/);
            // Boundary: planning stays the default mode and edits nothing
            assert.match(skill(), /\| _\(none\)_ — plan \| Planning upgrades, checking outdated dependencies, researching breaking changes before a version change \| this file \|/);
        }
    },
    {
        name: 'TC-DPR-014 every run reports remediation path health and scanner setup names a responder',
        skip: SKIP,
        fn: () => {
            const text = remediate();
            assert.match(text, /\*\*Remediation path health\*\* section:/);
            assert.match(text, /automated security-update setting: on, off, or "could not read" \(never assumed\)/);
            assert.match(text, /the alert owner \(`alertOwner` when declared/);
            assert.match(text, /every force and accepted entry in the project with reason, owner and expiry, naming expired or reason-less ones/);
            assert.match(read(SKILLS, 'linter-setup', 'SKILL.md'), /Runs dependency vulnerability scanner \(fail on HIGH\/CRITICAL CVEs\)\. Name who responds when it fails and by when/);
        }
    }
];

module.exports = { name: 'dependency-remediation', tests };
