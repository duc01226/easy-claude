## Discovery Order

Read `docs/project-config.json` first (the single source of truth for this repo: modules, paths, commands, conventions), then the docs index (`docs/project-reference/docs-index-reference.md`) and `lessons.md` before investigating, planning, or coding; configured roots (`docsRoots`, `referenceDocs`) override these defaults (`SYNC:project-reference-docs-guide`). Answer a project question (not a change) from its Doc Lookup row in the root file, citing the doc you read — never from framework defaults or memory; for the `.claude` framework itself, read `.claude/docs/README.md` (the user can run `$project-help`). If required detail remains unavailable, stop and report its path; never invent rules or completion.

When you write or update a doc an agent reads (root context, reference docs, docs index, `lessons.md`), keep it discoverable: purpose and critical rules first, closing reminders last when long, and every pointer to another doc as `read <path> when <situation>` to a file that exists, routed from the Doc Lookup table or the docs index. The doc-writing skills end with this gate (`SYNC:ai-discovery-doc-quality`).

## Search Existing Code First

Before writing, read target code and `.claude/docs/development-rules.md`; grep 3+ similar patterns and cite `file:line`. Verify matching preconditions before copying conventions. Trace dependencies and downstream consumers before renames/deletions; update affected source-derived docs. Naming and detailed implementation conventions come from applicable project references.

**First Principles:** (1) **Understanding > Output** — never ship code you can't explain. (2) **Design before mechanics** — write WHY before WHAT. (3) **Own your abstractions** — every dependency and platform choice is yours. (4) **Operational awareness** — code that can't be debugged, monitored, or rolled back is debt. (5) **Depth over breadth** — one understood solution beats ten generated variants.
