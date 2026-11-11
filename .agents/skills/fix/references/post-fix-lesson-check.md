# Post-fix lesson check

> Read when a fix has passed its review, before the single verify step: standalone `$fix` after its `$why-review` sign-off, and `workflow-bugfix` after `$workflow-review-changes` converges. Running it before the verify keeps the verify last (`SYNC:verify-last-order`), so a lesson saved through `$learn` lands before the final green run. This file is the one owner of the check for both. A `$fix` step nested under any other caller records the bug class and any lesson candidate in its report and hands them back instead of asking.

**Purpose:** a fixed bug often belongs to a class that will strike again elsewhere in the project. Name that class, and when it teaches a generic rule, offer the rule to `$learn` so future sessions avoid the whole class, not just this instance.

1. **Classify the bug class**, apart from its business subject, with the root-cause `file:line`: test reliability (flaky, order-dependent, shared state, timing), code quality (unchecked null or lookup, boundary, swallowed error, duplicated rule, hidden coupling), performance (unbounded loop or query, query per row, missing index, cache misuse), concurrency (race, missing await, retry storm), contract drift (spec, API or schema against code), configuration or environment, security, data integrity, build or tooling.
2. **Look for a generic lesson.** Strip every feature, entity, customer and file name, then ask which rule would have prevented this class elsewhere. Keep a candidate only when all three hold:
    - **Generic** — it names no business rule (a business rule belongs in the spec and its tests, not in a lesson).
    - **Likely to recur** — sibling code or past fixes show the same pattern, or the class is common in this stack; cite what you searched.
    - **Not already covered** — no lint rule, type check, test or hook catches it, and the project's lessons and reference docs do not already say it (search them).
3. **Confirm with the user.** For a surviving candidate, ask through the host question tool whether to save it: `Save with $learn (Recommended)` or `Skip`. On save, invoke `$learn` with the generalized lesson, its bug class and the evidence; `$learn` chooses the carrier, runs its own confirmation and saves. When a test, lint rule or hook would enforce the lesson better than prose, offer that follow-up instead.
4. **Record the outcome** in the fix or workflow report: `Lesson: <class> — saved via $learn (<carrier>)`, `Lesson: <class> — declined by the user`, or `Lesson: none — <reason>` (business-specific, one-off, already caught by <check>, already written at <path>).

**Worth offering:** a flaky test caused by shared mutable fixtures → each test owns its data; a crash from an unchecked lookup → check every lookup result where it enters; a slow page from one query per row → load related data in one bounded query. **Not worth offering:** a business rule the code violated, a one-off typo, a rule a check already enforces.

**Limits:** never save without the user's answer; the check never blocks or reopens the fix. A sub-agent or headless run cannot ask: it records the candidate in its report and returns it to its caller, which asks. This check covers the defect's class; the Lesson Extraction Gate still covers the assistant's own reasoning mistakes — when both find a lesson, ask about them in one question.
