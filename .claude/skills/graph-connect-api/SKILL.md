---
name: graph-connect-api
description: '[Code Intelligence] Use when detecting frontend-to-backend API connections via the knowledge graph.'
version: 2.0.0
---

## Quick Summary

**Goal:** [Code Intelligence] Detect frontend-to-backend API connections using the knowledge graph. Matches configured frontend HTTP-call patterns with configured backend route patterns via project-config.json configuration.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## How It Works

The connector scans frontend files for HTTP calls and backend files for route definitions, normalizes URL paths, and matches them using a multi-strategy algorithm:

1. **Exact match** — normalized paths identical
2. **Prefix-augmented** — prepends `routePrefix` to frontend path
3. **Suffix match** — strips `routePrefix` from backend, matches remainder
4. **Deep strip** — strips leading `{param}` segments from backend (handles class-level `{companyId}` routes)
5. **Controller resolution** — resolves configured route placeholders to actual route owner names

## Zero-Config Auto-Detection

**No configuration needed.** The connector auto-detects frameworks by scanning for marker files:

| Frontend | Markers                                                    |
| -------- | ---------------------------------------------------------- |
| Configured frontend framework | framework manifests and package metadata from project config |
| React    | `react` in package.json                                    |
| Vue      | `vue.config.js`, `vue` in package.json                     |
| Next.js  | `next.config.js`, `next` in package.json                   |
| Svelte   | `svelte.config.js`, `svelte` in package.json               |

| Backend | Markers                                     |
| ------- | ------------------------------------------- |
| Configured backend framework | backend manifests and route metadata from project config |
| Spring  | `pom.xml`/`build.gradle` with `spring-boot` |
| Express | `express` in package.json                   |
| NestJS  | `@nestjs/core` in package.json              |
| FastAPI | `fastapi` in requirements.txt               |
| Django  | `manage.py` with django                     |
| Rails   | `Gemfile` with `rails`                      |
| Go      | `go.mod` (Gin/Echo patterns)                |

## Auto-Run Behavior

The connector runs **automatically** in these situations:

| When                                    | Behavior                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| After `build` / `update` / `sync`       | Always runs via `_auto_connect()`                            |
| First `trace` / `query` / `connections` | Runs once via `_ensure_connectors_ran()` if never run before |

**You almost never need to run this manually.** The graph CLI handles it automatically.

## Custom Config (Optional)

For projects with custom HTTP patterns (e.g., base class API service), add to `docs/project-config.json`:

```json
{
    "graphConnectors": {
        "apiEndpoints": {
            "enabled": true,
            "frontend": {
                "framework": "{configured-frontend-framework}",
                "paths": ["{frontend-source-root}/"],
                "customPatterns": ["this\\.\\s*(get|post|put|delete|patch)\\s*[<(]\\s*['\"]([^\"']+)"]
            },
            "backend": {
                "framework": "dotnet",
                "paths": ["{api-source-root}/"],
                "routePrefix": "api",
                "customPatterns": []
            }
        }
    }
}
```

Custom patterns **extend** (not replace) built-in framework patterns. Explicit config **overrides** auto-detected config for paths.

## Manual Run

```bash
python .claude/scripts/code_graph connect-api --json
```

## Steps (when manually invoked)

1. **Run connector** via Bash:
    ```bash
    python .claude/scripts/code_graph connect-api --json
    ```
2. **Report results:** Frontend calls found, backend routes found, matches created, edge count

## Matching Strategies

The connector tries 5 strategies in order (highest confidence first):

| #   | Strategy         | Confidence | Example                                           |
| --- | ---------------- | ---------- | ------------------------------------------------- |
| 1   | Exact match      | 1.0        | FE `/api/users` = BE `/api/users`                 |
| 2   | Prefix-augmented | 0.95       | FE `/users` + prefix `api` → `/api/users`         |
| 3   | Suffix match     | 0.9        | BE `/api/users` stripped → `/users` = FE `/users` |
| 4   | Deep strip       | 0.85       | BE `/api/{param}/users` → `/users` = FE `/users`  |
| 5   | Deep strip both  | 0.8        | Both sides have `{param}` segments stripped       |

## See Also

- **Implicit Connections** — For event buses, entity events: `graphConnectors.implicitConnections[]` in project-config.json. CLI: `connect-implicit --json`

## Related Skills

- `/graph-build` — Build/update the knowledge graph (prerequisite)
- `/graph-trace` — Trace full system flow (API_ENDPOINT edges enable frontend-to-backend tracing)
- `/graph-blast-radius` — Analyze structural impact of changes
- `/graph-query` — Query code relationships in the graph

---

# Connect API

Detect frontend HTTP calls and match them to backend route definitions, creating `API_ENDPOINT` edges in the knowledge graph.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Code Intelligence] Detect frontend-to-backend API connections via the knowledge graph, matching configured frontend HTTP-call patterns against configured backend route patterns.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** apply critical + sequential thinking; every claim needs traced `file:line` proof, confidence >80%.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
