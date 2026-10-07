---
name: spec-sidecar-and-registry-checks
description: The WorkTracking provenance sidecar has no generator and the feature-registry verifier needs default discovery in this repo; what to expect from each
metadata:
  type: project
---

The `.sdd-provenance-map.jsonl` sidecar in the business spec root has no generating tool in the repository and nothing reads it (checked 2026-10-07). Its line numbers, block hashes and assertion text were already stale against the committed test sources then, and 18 executor names matched no registered test.

**Why:** a plan step said "regenerate with its owning tool"; there is none, and its case-body/intent hash inputs and assertion selection cannot be reproduced reliably.

**How to apply:** do not rebuild it by guesswork. Fix only exact renamed names if asked, say what stays stale, and report that it needs an owning tool. Check `grep -rl blockSha256 .claude` first in case a generator has been added since.

`node .claude/scripts/codex/verify-feature-registry.mjs --configured-roots` throws here because the project config has no `specSystem.featureRegistryRoots`; run it with no flag. On 2026-10-07 it reported 314 errors (311 `MISSING_BR_TARGET`, all in the WorkTracking spec's rule-row format, plus 3 `SPEC_TC_SPLIT_REQUIRED`) — an accepted baseline, so compare counts instead of expecting a pass.

Registered test titles for `CoveredBy` checks come from requiring each suite with `CLAUDE_PROJECT_DIR` set and reading `tests[].name`; browser titles are `<name> [variant: <variant>]` from `workspace-browser.test.cjs` exports.
