# Production readiness review — fresh re-review sub-agent

> Read when the full re-review after validated fixes uses a fresh sub-agent. Never under `--report-only` or a caller-owned pass (`--loop-owner=caller`): the caller owns fixes and any re-review.

**When a fresh sub-agent is part of the restarted review, spawn via canonical template in `SYNC:review-protocol-injection`:**

1. `subagent_type`: `code-reviewer`
2. Task: `"SRE production readiness review after validated fixes — score all 12 criteria (0-2) for {files reviewed in the current full scope}"`
3. Review mode: `"Fresh full re-review after validated fixes. Zero memory of prior rounds. Re-read ALL target files from scratch."`
4. Reference Docs: `code-review-rules.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
5. Target Files: same files from Scope Resolution
6. Integrate sub-agent report findings — DO NOT filter or override

**Fresh re-review focus** (what prior rounds typically miss):

- Operational concerns spanning multiple services
- Subtle reliability gaps (retry, circuit breakers, timeout handling)
- Missing observability (structured logging, correlation IDs, metrics)
- Data-integrity edge cases under concurrent load
