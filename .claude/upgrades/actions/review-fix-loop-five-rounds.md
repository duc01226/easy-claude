---
id: review-fix-loop-five-rounds
kind: notice
title: Review fix loops now default to a maximum of five rounds
added: 2026-11-19
---

Review and audit fix loops now allow up to five rounds by default across the shared policy, skills,
workflow callers and host projections. A clean review finishes as soon as current evidence clears the
bar. Unresolved blocking findings or failed required checks at round five require an explicit bounded
extension decision.

Saved review records use policy version 8. Older records stay on disk and cannot be resumed or
overwritten under this version. A fresh current-policy run is required, with the prior findings and
spent-round history retained by the coordinator.

Tell the user about the new default and the saved-record compatibility boundary when applying this
update.
