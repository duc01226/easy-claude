# Caller-Mode Contract — `--report-only` and `--defer=<list>`

> One contract for a review-family skill that runs under a caller: a workflow step, a parent review skill or a review batch. The caller passes the flags explicitly. A skill never infers a caller from context and never infers "an earlier step already did this" — no flag means standalone, and every phase of the skill runs exactly as its own `SKILL.md` documents. Read this file when `$ARGUMENTS` carries `--defer=`, and when you are the caller passing these flags.

## `--report-only` — read-only leaf

The skill runs its analysis phases and hands findings to a caller that owns validation and every fix. Rules common to every skill that offers the flag; the skill's own **Report-Only Mode** section names its last phase and its return shape:

1. **No fix, no restart.** No edit of source, test, config or doc; no fix loop; no fresh-context re-review round — the caller owns fixes and re-review. — why: two writers of one artifact inside a barrier race each other.
2. **Scope from the caller's brief — never ask.** Record the scope in the report. — why: a leaf cannot reach the user, so an "ask" branch would stall the caller's barrier.
3. **No nested fan-out.** A leaf specialist skill that is a member of the caller's barrier reviews sequentially in this context; no sub-agents. An orchestrating skill whose own `SKILL.md` declares review waves (`changes-review`) keeps them under `--report-only` — the flag removes fixing, asking and restarts, not its own fan-out. A `why-review` whole-target occurrence is a leaf. — why: a barrier-member leaf is already part of the caller's fan-out; an orchestrator is the fan-out.
4. **No user questions.** An owner decision or material trade-off goes UNANSWERED into the returned summary for the caller to ask.
5. **Write only the report** under `tmp/reports/`, appended per file or batch. A missing or stale project-reference doc is recorded as a `NOT VERIFIABLE` assumption, never a trigger to run `/scan`, `/project-init` or any other writer.
6. **Return** the report path, validated findings by severity, and every unconfirmed trade-off, plus the local verdict or severity mapping the skill defines.

## `--defer=<list>` — duties the caller owns

A comma-separated list. Each value names one duty the caller runs and the skill skips; the skill records `<phase> deferred to the caller: <value>` where it would have run. A value the skill does not define is ignored and recorded, never guessed.

| Value | Skill | Duty skipped | What the caller must run |
| --- | --- | --- | --- |
| `whole-target` | `changes-review` | Phase 0.8 whole-target rationale pass | a FULL `/why-review` over the whole review target |
| `specialists` | `changes-review` | escalation to specialist skills (keeps the inline lens) | the specialist reviewers |
| `tests` | `changes-review` | Phase 3.7 test-coverage gate | `/integration-test --mode=review` |
| `entities` | `changes-review` | Phase 3.8 domain-entity gate | `/domain-analysis --mode=review` |
| `simplify` | `changes-review` | Phase 3.5 simplification analysis | a mutating `/code-simplifier` over the same code, after the fixes |
| `review` | `code-simplifier` | Self-Review Gate (`/code-quality-review` over its own edits) | a FULL `/why-review` over the settled whole target after the simplifier returns; the simplifier still returns the list of files it changed |

**Caller obligations.** Pass a value only while the caller's own step for that duty will run; a caller that skips or merges the owning step omits the value, so the duty stays with the skill. — why: a deferral without an owner drops the check silently.

**`/workflow-review-changes` passes:**

- Step 1 `/changes-review`: `--report-only --defer=whole-target,specialists,tests,entities` and, when its `code-simplifier` occurrence will run, `,simplify`.
- The `code-simplifier` occurrence: `--defer=review` — the post-fix `why-review` runs in FULL mode over the settled target whenever the simplifier changed a file (its registry applicability), so the simplifier's own edits are re-reviewed there.
- Specialist occurrences: their registry `args` — `--report-only`, plus `--prove-tests` on `integration-test --mode=review` (dropped under `--tests=defer`).

`--tests={prove|defer}` is a different flag: a parent passes it to `/workflow-review-changes` itself to decide whether this workflow runs tests at all.
