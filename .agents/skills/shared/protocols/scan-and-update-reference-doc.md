> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header — but ONLY as part of a write that also changes content
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.
> 8. **NEVER write a no-op.** When the candidate differs from the doc on disk only by a date stamp or whitespace, write NOTHING — not the stamp either. Check with `node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file>` (exit 3 = no-op) and record the pass with `--record-verified <doc filename>`. — why: a date-only rewrite is an unmergeable line that makes two branches conflict over a value neither of them decided.
