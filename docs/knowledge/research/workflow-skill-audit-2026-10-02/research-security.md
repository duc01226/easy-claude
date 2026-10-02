# Workflow skill audit — research, content and specialist reviews

Read-only audit of current working tree, 2026-10-02. Baseline: `docs/knowledge/research/ai-agent-skills-best-and-bad-practices.md`. Existing uncommitted framework edits were reviewed as current behavior; no canonical files edited. No live model performance experiment was conducted.

## Coverage

| Skill | Full body/reference coverage | Outcome |
|---|---|---|
| web-research | SKILL.md; references/research-chain.md; shared web-research protocol | Source hierarchy and budgets clear; see cross-chain observations |
| source-deep-dive | SKILL.md, whole procedure | Missing-input recovery clear; affected by RS-1 |
| knowledge-synthesis | SKILL.md, whole procedure | RS-1 |
| knowledge-review | SKILL.md, whole procedure; review-policy; why-review terminal validation routine | RS-2; conflicting convergence wording observation |
| market-analysis | SKILL.md, whole procedure | Stable workflow artifact identity; no confirmed local issue |
| business-evaluation | SKILL.md, whole procedure | Missing market evidence handled; arbitrary comparable-pattern floor observation |
| tech-stack-research | SKILL.md, whole procedure | RS-3 |
| brainstorm | SKILL.md, all 875 lines | Scenario-specific routing contradicted by mandatory method coverage observation |
| security-audit | SKILL.md, all 656 lines | Strong report-only, provenance, trust-boundary controls; secret-output cross-concern candidate |
| performance-review | SKILL.md, all 685 lines; references/performance-knowledge.md | RS-4 |
| ai-engineering-review | SKILL.md, all 475 lines | Strong selective reference routes, bounded external verification, read-only mode; fallback observation |
| watzup | SKILL.md; references/session-report-template.html (whole template) | RS-5; HTML escaping/CSP and no-script contract sound |

Owning consumers checked: workflow-research/SKILL.md, workflow-greenfield-init relevant triage/tech-stack occurrences, workflows.json relevant occurrences. This batch does not claim to have read every linked framework catalog in full: catalogs outside the named local references were consulted only where needed for a retained finding. Parent owns broader protocol/evaluation coverage.

## Retained findings — validated in-batch

### RS-1 — Medium, 99%: synthesis deletes inputs needed by the downstream repair loop

Evidence: `.claude/skills/knowledge-synthesis/SKILL.md:29` and `:87` require deleting this run's source/evidence files after successful synthesis; `:48` requires those files to synthesize again. `.claude/skills/workflow-research/SKILL.md:14` runs synthesis BEFORE knowledge-review; `:88` repairs a synthesis defect through its synthesis skill and an evidence gap through source-deep-dive over the existing map. `.claude/skills/source-deep-dive/SKILL.md:55` must stop on a missing map.

Trigger: a normally completed synthesis followed by a knowledge-review REVISE requiring a missing section or correction to confidence/citations. Consequence: the prescribed owner cannot rerun because its mandatory input was just removed; a targeted deep-dive repair is also blocked. Final report source URLs cannot reconstruct the original extraction, omitted findings and source triage without repeating research.

Recommendation: move cleanup to the workflow after review acceptance; standalone synthesis should retain inputs until its own acceptance policy says they are no longer needed. Trade-off: retains disposable disk files longer; worth it because repair remains reproducible; materiality: no consequential product boundary change, parent may resolve routine lifecycle detail. Spec verdict: CODE-WRONG relative to workflow repair contract. Verification proposal: simulate synthesis → rejection → owner rerun and assert the input files persist until gate acceptance; add a prompt-contract regression for cleanup ordering.

Validation: opposing argument “successful synthesis means acceptance” rejected because the separate later knowledge-review gate explicitly can reject it. No observed live run required to establish this deterministic contract conflict.

### RS-2 — Medium, 98%: a knowledge-only review has a mandatory code-inheritance prerequisite

Evidence: `.claude/skills/knowledge-review/SKILL.md:13` scopes the skill to reports/courses/strategies, whereas `:196` mandates same-suffix classes inherit a base “even if empty now” and requires checking linting/analyzers. Workflow-research/SKILL.md:69 always invokes this gate for research artifacts.

Trigger: review any research-only artifact or course in a project with no relevant application hierarchy. Consequence: the reviewer receives an unconditional unrelated code-design obligation, invites out-of-scope findings and speculative empty abstractions, and spends context/tool work without improving the requested knowledge artifact. This also conflicts with the review's own applicable-principle rule at :259.

Recommendation: remove this prerequisite from the knowledge gate and let an explicitly code-linked artifact route to applicable code protocols. Trade-off: loses a redundant generic code reminder in rare code-linked reports; worth it because code reviews already own that responsibility and scope is more precise; materiality: routine scope correction. Spec verdict: SPEC-STALE skill prose relative to declared target contract. Verification proposal: research-only artifact in a project without application classes yields no code-inheritance/linter findings; code-linked claims still trace their referenced code.

Validation: retained despite inherited global review duties; the line explicitly mandates an empty common base and is not conditioned on a code target.

### RS-3 — Medium, 96%: tech-stack research mandates irrelevant layers and a query minimum without an applicability exit

Evidence: `.claude/skills/tech-stack-research/SKILL.md:23`, `:31`, `:100`, `:280` require backend, frontend, database, messaging, infrastructure and auth; minimum five queries per layer and three options per layer. `.claude/skills/workflow-greenfield-init/SKILL.md:40` expressly supports no-UI products and its sequence invokes tech-stack-research. No layer applicability/N/A gate exists in this skill.

Trigger: greenfield CLI/library/static tool with no frontend or broker, or a constrained stack decision where some layers are already fixed. Consequence: at least 30 nominal queries, comparisons for irrelevant layers and confirmation questions; pressure to select dependencies the product does not need. Requirements discovery does not waive these repeated MUST clauses.

Recommendation: derive required layers from confirmed requirements; record N/A for absent layers and already-decided constraints; set a total research cap and use more depth only for unresolved consequential choices. Trade-off: less blanket coverage, mitigated by an explicit applicability table; worth it because uncertainty determines research cost; materiality: research depth is routine, product layer choices remain human-confirmed. Spec verdict: SPEC-STALE skill prose relative to right-sized workflow triage. Verification proposal: CLI-only and fixed-stack cases must omit frontend/messaging research while still comparing genuinely open choices; capture searches, duration and tokens against current baseline.

Validation: scope inferred as full-stack was steel-manned; the activation text and owning workflow do not restrict the target to full-stack systems, so the counter-case remains reachable.

### RS-4 — Medium, 99%: non-sargable-predicate recipe suggests a semantics-changing case-insensitive rewrite

Evidence: `.claude/skills/performance-review/SKILL.md:260` suggests replacing case-insensitive normalization with `col == x || col == xLower`; its Phase 5 Optimize Plan requires preserving behavior. The index recipe is loaded during ordinary query review.

Trigger: a case-sensitive store with rows `test`, `TEST`, and `TeSt`, and existing normalized predicate `lower(col) == 'test'`. Suggested candidate-list rewrite matches only supplied variants, excluding valid mixed-case rows. A faster query can silently change search results and authorization/filter semantics if this recipe is copied.

Recommendation: remove this general candidate-list example; use a database-supported case-insensitive collation/operator or normalized indexed column/expression index only after verifying equivalence under actual collation and normalization rules. Trade-off: a little more stack-specific investigation; worth it because correctness is the skill's own invariant; materiality: correcting the recipe is routine, actual production collation/schema migrations remain owner decisions. Spec verdict: CODE-WRONG recipe relative to behavior-preservation contract. Verification proposal: mixed-case and Unicode fixtures must preserve the result set before/after a rewrite; query plan proves access-path improvement separately.

Validation: mixed-case counterexample is deterministic; a case-insensitive collation might mask the issue but is not required by the portable example. Existing requirement to verify does not make a non-equivalent default recipe correct.

### RS-5 — Low, 97%: spec-health check treats recent commits as positive evidence of maintenance

Evidence: `.claude/skills/watzup/SKILL.md:121` and `:134` use the same 30-day git-log query; `:127` and `:140` report that spec/features are being maintained when any recent commits exist.

Trigger: business behavior changed this session while an unrelated spec file was committed recently, or the correct updated spec remains uncommitted. Consequence: the wrap-up offers a misleading maintenance signal (or duplicated stale flags), without checking whether the changed behavior's canonical owner matches code. Age is useful as a weak hint, not proof of current correspondence.

Recommendation: map changed business paths/behavior to their spec owners and report inspected correspondence; keep age only as explicitly limited metadata. Trade-off: slightly more tracing in wrap-up; worth it for actual confidence, but proportionally limit to changed features; materiality: routine report correction. Spec verdict: SPEC-STALE verification recipe. Verification proposal: unrelated recent spec commit does not mark changed feature current; uncommitted correct spec update does not trigger age-based stale status.

Validation: demoted Medium → Low because wording is a wrap-up hint, not a release gate, and formal spec gates can independently protect correctness.

## Rejected, demoted and cross-concern candidates

- Knowledge-review read-only versus `fix → full re-review` wording (:17, :284): ambiguous, but workflow explicitly owns fixes (:88) and READ-ONLY appears first and repeatedly. Demoted to clarity observation; do not claim this proves unauthorized edits.
- Uniform single-source `<60%` ceiling (knowledge-review:139; workflow-research:58) conflates direct first-party specification with empirical corroboration. Observation for policy review, not an asserted defect merely because the report guidance favors authoritative sources. Parent should decide whether this is an intentional research policy or needs an explicit primary-source exception.
- Security D2 scan commands print secret-containing lines (security-audit:196 onward). Cross-concern: inspect host output redaction/credential masking before asserting exposure; no secrets were scanned by this audit. Do not treat installed prose as a host boundary.
- Research chain has no local explicit untrusted-page rule, unlike ai-engineering-review Phase 6. Cross-concern: confirm inherited host/universal protection before filing a finding; absence in one skill alone does not prove missing enforcement.
- AI review self-validation fallback says “no Skill tool” (ai-engineering-review:258); active-host guide supports native execution without that foreign-host tool name. Cross-concern: parent should inspect mirror host translation before retaining a portability finding.
- Repeated protocol and closing text across specialist entry points is measurable bloat but no task-quality/cost experiment was run; record as optimization candidate, not proven quality loss.
- Business-evaluation:175 demands three comparable patterns before any claim; knowledge-synthesis:106 demands three prior reports. First-use fallback is absent. Cross-concern: parent can deduplicate with first-project/bootstrap assumptions across other skills.
- Brainstorm gives scenario-specific technique selection but mandatory all-method phase outputs (:398, :486) and P0 re-asks supplied context. Observation: structured workshop depth may be intentional; evaluate smaller prompt variants before calling it universally bad.
- Tests found for manifest ordering and prompt pins verify text/structure. They do not alone prove skill/no-skill incremental value; no global absence-of-evaluations claim is made by this batch.

## Validation and limits

All retained findings re-traced to current owning text and reachable workflow consumers; correct/proof-backed/reasonable/fit/trade-off/confidence checks from why-review terminal routine applied in-batch. No High/Critical claim retained. Findings intentionally survive the reverse request (“prove these skills are sound”) by identifying concrete repair failures or false guidance. Parent owns merged-report validation and any material decision questions. This is source/contract evidence, not proof an agent actually followed each bad instruction.

## Supplementary dependency closure coverage

Added on parent request. Scope is entry-point, routing and relevant nested-handoff review; supporting references structural unless needed to validate a finding. This is narrower than initial full-body ownership.

| Root | Coverage | Result |
|---|---|---|
| course-builder | Full 105-line root; course template citation-section lookup | Missing explicit source/evidence path handoff and Sources section is a cross-concern candidate against knowledge-review; parent should review template owner |
| strategy-builder | Full 105-line root; template citation-section lookup | Market artifact identity and absent-input fallback present; no new confirmed issue |
| ck-help | Full 155-line root | Live generator output contract; generic task/ask boilerplate is an optimization observation |
| code-quality-review | Entry/root procedure, routing, leaf ownership, validation routine, heading/protocol structure | Parent has already invoked its leaf contract; no new entry-point defect retained |
| graph-code | Full 75-line root; mode-build procedure; structural mode-reference inventory | Strong progressive loading and missing-graph fallback; no confirmed new defect |
| graph-export | Full 145-line root | Structured output; no confirmed new defect |
| llm-council | Full 260-line root | Consequence-based gate, bounded chairman repair and degraded-result marker present; mandatory five-way waves may exceed host capacity, but no fallback experiment performed |
| product-roadmap | Full 146-line root; template reference presence | Explicit-only activation and approved-artifact handoff clear |
| project-help | Full 81-line root | Terminal/no-task root conflicts with closing task boilerplate; observation because earlier section wins |
| scan-codebase-health | Full 245-line root; graph tools.py importer implementation | Symbol-unused detection uses file importers, not symbol usage; observation/incomplete heuristic, graph stale controls need parent's cross-check |
| understand | Root entry/routing/sizing, detailed sections and closing contract; scale-protocol tier/ownership sections | RS-6 |
| workflow-mode | Full 39-line root | Personal scope and precedence explicit; no confirmed new defect |

### RS-6 — Medium, 99%: understand tier routing shadows the large/program branches

Evidence: `.claude/skills/understand/SKILL.md:114` declares first matching row top-down. Its S2 at :120 matches ≥10 files OR ≥2 flows/contexts; S3 (>40 files) at :121 and S4 whole repo at :122 occur later. The same line :114 gives a 63-file example claiming S3, impossible under the declared algorithm. `references/scale-protocol.md:128` reserves full group/fragment fan-out for S3+, while :5 explicitly gives S2 only evidence gathering.

Trigger: explain 63 files, 9 capabilities, 4 contexts, or an ordinary whole-repo multi-context project. Actual declared first-match result is S2. Consequence: intended full-group/hierarchical route and fragment resumability are bypassed; the central orchestrator must author a large scope at the smaller route's 2–6-group altitude. S0/S1 can similarly win when a whole-repo small project is requested.

Recommendation: evaluate most-specific program/large conditions first, then multi/small/point, or bound each earlier predicate so it cannot consume a larger target. Trade-off: a tiny routing rewrite and new explicit ordering tests; worth it because it restores already intended behavior without adding scope. Materiality: routine routing correction. Spec verdict: CODE-WRONG declarative algorithm against its own example and downstream scale contract. Verification proposal: table-driven routing cases for 1/9/10/40/41/63 files and explicit whole-repo input; assert S3/S4 reach the scale owner and S0/S1 remain inline.

Validation in-batch: largest example re-evaluated with literal predicates; no external assumption needed. Opposing reading “choose highest matching tier” would fix behavior but contradicts literal first-match top-down instruction; therefore retained.
