# Workflow skill audit — design, planning and artifact lanes

Read-only source audit against `docs/knowledge/research/ai-agent-skills-best-and-bad-practices.md`. No runtime behavior trials or skill/no-skill evals. Coverage and final in-batch findings validation appear below. Canonical skill source is authoritative; generated mirrors are outside this leaf scope.

## Validated candidate findings (initial evidence)

### D1 — HIGH: plan creation omits the required producer contract for plan validation
- Evidence: `.claude/skills/plan/SKILL.md:74`–`:142` prescribes its complete artifact structure and final checks but has no `Plan Gate`, scope-brief/scenario applicability, or `product-roadmap-contract` route anywhere. `.claude/skills/plan/references/mode-validate.md:67`–`:79` requires one `## Plan Gate`, branch artifacts/scenario, command evidence and human approval for every plan, treating absent values as blocking. Shared owner `.claude/skills/shared/product-roadmap-contract.md` explicitly makes `/plan` enforce matching applicability and Plan Gate.
- Reachable trigger: workflow-big-feature creates strategic/implementation plans at `.claude/workflows.json:159`, `:205` then mandatory validation `:273`; a fresh agent following default plan's eight-part artifact contract has no producer instruction for the mandatory consumer fields. It either stalls at missing applicability or fabricates an upstream contract during validation (which is annotation-only).
- Correction: restore the applicable shared-owner route and minimal branch/Plan Gate output duty in plan creation; keep discovery mechanics flexible. Trade-off: a short mandatory producer contract adds context, worth it to make existing mandatory handoff executable; no new product-policy decision required.
- Confidence: 97%; spec drift: SPEC-STALE instruction contract relative to shared owner; test feedback: add a producer/consumer contract test plus a clean-context default-plan→validate trial, not just string presence.

### D2 — MEDIUM: reference scanner gives contradictory fresh-eyes stopping rules
- Evidence: `.claude/skills/scan/SKILL.md:90`–`:101` describes Round 2 fresh-subagent verification, then says a clean Round 1 ends the scan and fresh-eyes is mandatory only after issues were found/fixed; `:201`/`:212` require multi-round fresh-eyes and the anti-rationalization row calls fresh subagent non-negotiable even for small scans.
- Trigger: every applicable built-in scan invoked by workflows, e.g. `--target=integration-tests` at `.claude/workflows.json:254`. A clean main draft has mutually incompatible instructions: return after self-check or spend a fresh reviewer. Agent cannot identify the required exit gate consistently.
- Correction: choose one risk/issue-based predicate in canonical scan owner and align procedure/reminders. Trade-off: conditional fresh-eyes reduces cost but lowers independent checking; unconditional adds cost. Materiality: owner should select policy; this audit reports the contradiction, not a silent choice.
- Confidence: 99%; spec drift: AMBIGUOUS procedural gate; test feedback: contract regression for consistent predicate plus clean-target and corrected-target execution trials.

### D3 — LOW: design spec has conflicting canonical filename patterns
- Evidence: `.claude/skills/design-spec/SKILL.md:145`–`:148` writes `{YYMMDD}-designspec-{feature-slug}.md`, but `:152`–`:159` declares canonical role token ux and `{YYMMDD}-{role}-{type}-{slug}.md`, producing `{YYMMDD}-ux-designspec-{slug}.md`.
- Trigger: workflow-spec-to-mockup and greenfield routes invoke design-spec; either path can be chosen by a compliant agent, fragmenting naming/search conventions. Link-back records actual saved path, so no automatic broken link is claimed.
- Correction: use canonical role/type pattern in Step 7 and examples. Trade-off: tiny instruction edit and preserving legacy files (do not rename existing artifacts), worth it; no material behavior risk.
- Confidence: 99%; spec drift: SPEC-STALE local save rule relative to canonical role section; test feedback: filename contract check when artifact is newly generated.

### D4 — MEDIUM: docs update routes explicit file lists through a different impact-map scope
- Evidence: `.claude/skills/docs-manager/references/mode-update.md:679` says `changed_files` skips git diff and uses the provided list, but Step 0.3 `:145` and Step 1.1 `:204` call doc-impact-map with no files argument. Flag `base` at `:685` scopes only the map, while Step 0.1 `:123` separately gathers HEAD/HEAD~1/origin/develop changes. Consumer `.claude/scripts/doc-impact-map.cjs:1055`–`:1081` accepts positional explicit file paths; absent these it calls `collectChangedFiles(base)`, proving these are different scopes.
- Trigger: workflow caller supplies committed/explicit changed files while working tree is clean or contains unrelated changes. Phase 0 categories and Phase 1 impact wave can disagree; an empty map fast-exits without checking requested files.
- Correction: forward the resolved exact file list to both impact-map calls, and keep base handling consistent with the selected source. Trade-off: small argument plumbing cost, worth it to prevent the existing explicit scope contract from being discarded.
- Confidence: 95%; spec drift: SPEC-STALE producer/consumer handoff. Test feedback: explicit-file request against a clean or unrelated dirty tree must map precisely those files. Read-only CLI probe with `.claude/skills/plan/SKILL.md` confirmed `source: explicit file list`, one changed file and non-fast-exit; no claim that current workspace reproduced an empty map.

### D5 — MEDIUM: learn mandates a Markdown enhancer for machine-readable configuration
- Evidence: `.claude/skills/learn/SKILL.md:46`–`:53` routes project facts into project-config fields; `:375` confirms this target. `:461`/`:465` require prompt-enhance after any save regardless of target; `:484`–`:488` omit a JSON exception, and `:493`–`:499` prohibit completion until that task runs. `.claude/skills/prompt-enhance/SKILL.md:83`–`:94` supports Markdown-file types or pathless raw text, with no JSON carrier branch. Its enhancement steps `:297`–`:312` add Markdown Quick Summary/Closing Reminders.
- Trigger: learning a project command/path writes configured JSON through project-config, then mandates handing that machine-readable file to a prose-only enhancer. This is an explicit route/format contradiction; unsupported handling can block completion or damage format if prose anchors are applied. No observed runtime corruption is claimed, and the existing project-config validation precedes this mandatory final handoff.
- Correction: restrict prose enhancement to supported carriers; verify configuration schema after the final configuration write. Trade-off: JSON cannot carry prose attention anchors, but preserving machine validity is worth that loss; no product policy decision is needed.
- Confidence: 95%; spec drift: SPEC-STALE cross-skill target contract; test feedback: a project-fact learn scenario must preserve parseable/schema-valid JSON and select an applicable completion route.

### D6 — MEDIUM: skill-creator executable commands resolve to nonexistent project-root scripts
- Evidence: `.claude/skills/skill-creator/SKILL.md:57`/`:62` instruct `scripts/init_skill.py` and `node scripts/validate-skills.cjs --path .claude/skills/<skill>`; `:100`–`:102` and `:114`–`:115` repeat bare script paths. Actual files are under `.claude/skills/skill-creator/scripts/`, including init_skill.py, validate-skills.cjs and package_skill.py; no repository-root scripts directory exists. `.claude/docs/troubleshooting.md:298` prescribes project-root working directory so framework relative paths resolve. Creation-process repeats these commands without a working-directory transition.
- Trigger: the supplementary manual skill-creation route executes documented scaffold/validate/package commands from project root and cannot find the helper. Changing into the skill directory would instead break the documented `.claude/skills/<skill>` target path.
- Correction: resolve executable paths from the installed skill root while keeping repository targets rooted in the project; use the host-supported Python interpreter. Trade-off: more explicit paths, worth it for runnable scaffolding and required validation.
- Confidence: 99%; spec drift: SPEC-STALE invocation contract; test feedback: command-path smoke check from documented project root (fixture scope, no production writes).

## Coverage and limits

Each of the 25 assigned canonical entry points was inspected. `Full entry` means complete entry read; `Entry operational contract` means activation/modes, procedure/output/gates and relevant cross-skill contracts read, with repeated shared SYNC sections and some non-relevant body detail inspected structurally rather than independently line-by-line. This is source-contract coverage, not a behavior evaluation. Ancillary references were inventoried and routed/structurally checked, not all fully read. Workflow-selected modes were prioritized; findings above received detailed consumer/owner verification. Parent owns workflow wrapper inspection and shared-protocol structural probes. No generated mirror changes or source fixes were made.

| Skill | Entry coverage | Workflow-mode/reference coverage | Status / evidence |
|---|---|---|---|
| spec | Full entry | All ten mode routes inventoried; mode contracts and native-profile owner checked; ancillary engines structural | No additional validated defect; shared profile precedence prevents asserting forced duplicate TC registry |
| pbi | Full entry | refine/story/challenge/dor/mockup/review routes; mode outputs and handoffs checked, ancillary template detail structural | No additional validated defect |
| plan | Full entry | review/validate full operational contracts, checklist and legacy engines structural | D1; default producer checked against shared product-roadmap contract |
| architecture | Full entry | full-review/scalability route and outputs checked; ancillary report/checklist structural | No additional validated defect |
| domain-analysis | Entry operational contract | default, report-only review, artifact/dependency and follow-up contracts checked; ancillary structural | Additional interview/council overhead is evaluation candidate, not proven defect |
| design-spec | Entry operational contract | default/wireframe, artifact save/link-back and UI/native owner contracts checked; ancillary templates structural | D3; profile literals noted below |
| ui-design | Entry operational contract | explicit workflow review/report-only, default design and gate contracts; ancillary design advice structural | No additional validated defect |
| scan | Full entry | workflow backend/integration-tests/project-structure/ui target contracts checked; manifest targets structurally inventoried | D2 |
| docs-manager | Full entry | mode-update operational contract with changed_files/base, scope selection/impact-map consumers detailed; initialize ancillary structural | D4 |
| prioritize | Full entry | default ranking/inputs/output and downstream contract checked | No additional validated defect |
| idea | Full entry | default interview, save and continuation contract checked | Interview checkpoints are eval candidate, not unsupported approval finding |
| scenario | Full entry | analysis output and plan applicability consumption checked | No additional validated defect |
| why-review | Entry operational contract | terminal validate read fully; full-mode validation/retry/recursion contract checked; repeated protocols structural | Used to validate this batch; once-per-cycle recursion interpretation is plausible, so no recursion finding |
| changes-review | Entry operational contract | default/report-only, lens dispatch and validated completion ledger; repeated shared sections structural | Parent owns workflow-end acceptance concern; no duplicate finding |
| production-readiness-review | Entry operational contract | service/API scope, skip applicability, evidence and reporting gates; repeated sections structural | Jobs/config dispatch breadth alone does not prove lost coverage; other lenses may cover it |
| ai-context-refresh (supplementary) | Full entry | generated fence ownership, root projection and sync handoff; ancillary refs structural | No additional validated defect |
| custom-prompt (supplementary) | Entry operational contract | create/update/list/remove, index/carrier and mutation bounds | No additional validated defect |
| learn (supplementary) | Entry operational contract | target routing, project-config/protocol/root/docs owners, review and mandatory enhancement | D5; configuration-target contradiction, no corruption observed |
| project-config (supplementary) | Entry operational contract | project scan/schema/output and relevant native-profile/config fields; ancillary fields structural | Consumer verification for D5 |
| project-init (supplementary) | Entry operational contract | phased config/docs/context pipeline and nested handoffs; ancillary detail structural | No additional validated defect |
| project-skill-protocol (supplementary) | Full entry | list/add/update/remove; body/index two-write boundary and enhancement route | Learn has a stale three-write summary, demoted below |
| prompt-enhance (supplementary) | Entry operational contract | target matrix, supported prose operations, anchors/verification; ancillary principles structural | Consumer verification for D5 |
| skill-creator (supplementary) | Full entry | create/update/package executable paths; creation-process command contracts and actual helper location | D6; manual closure route, not directly a workflow step |
| scan-all (supplementary) | Full entry | target selection, bounded scan handoffs, completeness/status gates | No additional validated defect |
| web-design-guidelines (supplementary) | Full entry | applicability, guideline intake, UX/accessible evidence and review output | No additional validated defect |

## Rejected, demoted and cross-concern observations

- Native spec literals: design-spec early section assumptions (`SKILL.md:107`–`:118`) and workflow-feature §8 language can conflict in presentation with native profiles. The canonical shared profile owner explicitly governs native carriers, and design-spec carries that profile-aware owner later. Treat as clarity/portability debt; do not assert unavoidable duplicate registries or data corruption. Parent consolidates this concern.
- Learn's project-skill-protocol routing summary claims three-write/mirror work (`learn/SKILL.md:48`), while the protocol owner explicitly confines writes to body+index (`project-skill-protocol/SKILL.md:182`); learn's other summaries agree with the two-write owner. Demoted stale summary observation, not a separately escalated failure.
- Plan legacy engine's unconditional backend/frontend reference reads are not routed by the current default plan; rejected as unreachable to the present producer.
- Long files, repeated shared SYNC blocks, interview/confirmation counts and optional council overhead are not correctness findings by themselves. They deserve skill/no-skill and scoped-workflow cost/quality evals before policy changes. No evaluated regression is claimed.
- UI-review description vs default design-mode concern is not escalated: audited workflow callers supply explicit review flags.
- Production-review service/API applicability is narrower than some dispatch triggers, but alternative specialist coverage exists; no demonstrable dropped lens established.

## Final in-batch validation

Applied why-review terminal-validation questions to the final six findings, without fixes, delegation or user questions. Each has a reachable source-level trigger, direct producer/consumer or contradictory-owner evidence, appropriately bounded consequence, priced correction and test/spec feedback. D1 HIGH; D2/D4/D5/D6 MEDIUM; D3 LOW. Confidence ranges 95–99%. All six are validated in-batch; D2 leaves the policy choice explicit. D4 verified positional-file support through the actual script and a read-only explicit-file CLI probe. D5 is restricted to unsupported handoff risk, not observed JSON corruption. Coverage limitations above remain part of the result.
