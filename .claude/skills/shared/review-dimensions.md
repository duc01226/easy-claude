# Review Dimensions — shared owner

> Single owner of the angles a rationale or artifact review judges. `why-review` full mode and `plan --mode=review` (with plan creation's Self-Review Pass) read this file; neither keeps its own copy. A new angle is one row here.

## How to work the dimensions

- **One todo per applicable dimension, created before judging.** A dimension applies when its subject exists in the artifact; otherwise close its todo `N/A` with a one-line reason. — why: an angle folded into one general pass gets skipped without anyone noticing.
- **One dimension at a time, closed with tool evidence.** Close each todo with its verdict (`PASS` / `FINDING` / `N/A`) and the evidence a tool returned (a search you ran, a `file:line`, a test name, a section reference) before starting the next. A todo closed without evidence counts as unchecked. — why: checklist review works; self-review without outside feedback does not.
- **A plan's profile picks the set.** For a `/plan` plan, the light profile works Goal alignment, Future change cost, Decision readiness and Test/spec/doc sync; a full profile, or no profile declared, works every applicable dimension, Outsider read included in any session. Every plan profile also runs three plan-only checks: Is the outcome governed by a clear owner/spec, with non-goals and no silent expansion? Is discovery bounded, with a named way to settle each uncertainty? Does the `Not yet specified` list hold only items that cannot yet be stated as a precise question, and no product-intent, public-contract or irreversible decision parked there? Any other artifact works every applicable dimension. — why: small work does not pay for a large review, and both plan review and plan creation's own review read this file.
- **Judge the saved artifact.** Re-read it from disk; never judge it from memory of the conversation.
- **Fresh context is your call, never required.** Outsider read is the dimension self-review is weakest at in the session that wrote the artifact. When its list stays empty on a long or high-risk draft, you may choose a cheap fresh read: a small model briefed with only the artifact path and the Outsider read row. Tell it who the reader is (someone with the repository open) and ask for at most 10 items, most misleading first: what neither the page nor a file it names resolves, and statements on the page that contradict each other — why: without that brief the probe lists repository vocabulary too, and the real gaps drown in noise. This probe is a comprehension check, not a review round: it returns the unresolved terms and contradictions it found and no findings or verdict, so the review-round prompt template (`review-protocol-injection`) does not apply to it. A helper started for a round is never one reused from an earlier round.

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
| Outsider read | Write the list of terms, assumptions and context the artifact relies on but does not define or link — what this session knows that the page does not say. Each item is a finding; its fix adds the item to the artifact or links it. |
| Decision readiness | Is every product, public-contract, data or irreversible choice settled or explicitly blocked, so the builder guesses none? Local mechanics stay with the builder. |
