# Review Dimensions — shared owner

> Single owner of the angles a rationale or artifact review judges. `why-review` full mode and `plan --mode=review` (with plan creation's Self-Review Pass) read this file; neither keeps its own copy. A new angle is one row here.

## How to work the dimensions

- **One todo per applicable dimension, created before judging.** A dimension applies when its subject exists in the artifact; otherwise close its todo `N/A` with a one-line reason. — why: an angle folded into one general pass gets skipped without anyone noticing.
- **One dimension at a time, closed with tool evidence.** Close each todo with its verdict (`PASS` / `FINDING` / `N/A`) and the evidence a tool returned (a search you ran, a `file:line`, a test name, a section reference) before starting the next. A todo closed without evidence counts as unchecked. — why: checklist review works; self-review without outside feedback does not.
- **Judge the saved artifact.** Re-read it from disk; never judge it from memory of the conversation.
- **Fresh context is your call, never required.** Outsider read is the dimension self-review is weakest at in the session that wrote the artifact. When its list stays empty on a long or high-risk draft, you may choose a cheap fresh read: a small model briefed with only the artifact path and the Outsider read row. This probe is a comprehension check, not a review round: it returns the terms it could not resolve and no findings or verdict, so the review-round prompt template (`review-protocol-injection`) does not apply to it. A helper started for a round is never one reused from an earlier round.

## Review Dimensions

| Dimension | Think |
| --- | --- |
| Target fit | Did we resolve what user asked, with evidence and confidence? |
| Goal alignment | Does the rationale serve the saved Goal Contract's purpose and success criteria — or drift past them? |
| Rationale depth | Are alternatives real, causal, symmetric, assumption-aware? |
| Trade-off honesty | What does this SACRIFICE, is it worth it, and is the trade-off material enough to confirm with the user? An unpriced benefit is a rationale gap. |
| Behavioral risk | What breaks in happy, error, edge, and rollback paths? |
| Cross-boundary impact | Does a changed contract break a consumer on the other client↔server tier (BE↔FE), or a loosely-coupled/external service or event consumer? (tier seam + service/event) |
| Test/spec/doc sync | Does evidence prove tests/specs/docs protect the intended invariant and avoid stale claims? |
| Future change cost | Is each change needed, and is it the smallest change at the root cause? Was an existing helper, module or pattern searched for (cite the search and 3 siblings)? Does the recommendation reduce coupling, hidden state, duplication, unclear intent? |
| Outsider read | Write the list of terms, assumptions and context the artifact relies on but does not define or link — what this session knows that the page does not say. Each item is added to the artifact or linked. |
| Decision readiness | Is every product, public-contract, data or irreversible choice settled or explicitly blocked, so the builder guesses none? Local mechanics stay with the builder. |
