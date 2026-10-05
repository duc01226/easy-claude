## Discovery Order

Before investigating, planning, or coding, use `.claude/hooks/lib/project-config-loader.cjs` to resolve the project config (default `docs/project-config.json`) and docs index; read existing config, then the index and `lessons.md` at configured owner paths. Apply `project-reference-docs-guide` below: absent config is supported, derive facts from repository evidence; declared invalid sections need repair. Never require default paths when owners are relocated. Answer a project question from its root Doc Lookup row and cite the doc read, not memory or generic defaults. For framework questions read `.claude/docs/README.md` (`/project-help`). Report missing required docs through the gate's repair route; never invent rules or completion.

When you write or update a doc an agent reads (root context, reference docs, docs index, `lessons.md`), keep it discoverable: purpose and critical rules first, closing reminders last when long, and every pointer to another doc as `read <path> when <situation>` to a file that exists, routed from the Doc Lookup table or the docs index.

## Search Existing Code First

Before writing, read target code and `.claude/docs/development-rules.md`; grep 3+ similar patterns and cite `file:line`. Verify matching preconditions before copying conventions. Trace dependencies and downstream consumers before renames/deletions; update affected source-derived docs. Naming and detailed implementation conventions come from applicable project references.

**First Principles:** (1) **Understanding > Output** — never ship code you can't explain. (2) **Design before mechanics** — write WHY before WHAT. (3) **Own your abstractions** — every dependency and platform choice is yours. (4) **Operational awareness** — code that can't be debugged, monitored, or rolled back is debt. (5) **Depth over breadth** — one understood solution beats ten generated variants.
