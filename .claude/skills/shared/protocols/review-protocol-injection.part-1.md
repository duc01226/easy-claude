> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** A fresh reviewer must hold every rule it reviews against from its first token; a path or a placeholder would make it depend on a file read, or on a hook that may not fire for it. Reviewer prompts are therefore the one place the hybrid policy (`SYNC:shared-protocol-duplication-policy`) always keeps full bodies: the template carries all 11 protocol bodies pre-embedded, and the orchestrator copies it wholesale.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
```
