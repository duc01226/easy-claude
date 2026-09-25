> **Shared Protocol Duplication Policy (hybrid)** — `.claude/skills/shared/sync-inline-versions.md` owns every shared protocol; every other copy is a projection of it, never a second source. Where each carrier holds a protocol:
>
> - **Skills keep guides.** A converted skill's `SKILL.md` carries one guide line per protocol in its `PROTOCOL-GUIDES` block (tag, summary, when it applies, path of the published text) instead of the full `<!-- SYNC:tag -->` body.
> - **Hooks deliver the full text** where the host runs hooks, from the generated projection `.claude/skills/shared/protocols/`. The guide path is the fallback: when a protocol's text is not in your context, read its file before you act on it.
> - **`:reminder` digests stay** in every carrier for must-never-miss rules.
> - **The five review-family skills keep full SYNC bodies inline** — `changes-review`, `code-review`, `plan-review`, `why-review`, `workflow-review-changes` (`inlineSkills` in `.claude/skills/shared/protocol-groups.json`) — because their protocol text is larger than hook delivery can carry.
> - **Agents keep full protocol text.** `.claude/agents/*.md` are never converted to guides.
> - **Reviewer prompts carry protocol bodies inline.** The orchestrator copies ONE template (`SYNC:review-protocol-injection`) wholesale into each fresh reviewer prompt; a reviewer is never handed a path to go read.
> - **`references/`:** a mode-only section of a skill may live in `references/*.md`, read at the point of use as that mode's first action; a SYNC body inside `references/*.md` stays inline.
>
> Never hand-extract, deduplicate or replace a SYNC body outside these rules. To update a protocol: edit the canonical file first; run `.claude/scripts/sync-update-blocks.py <tag>` (Windows `py -3`, macOS/Linux `python3`), which rewrites every skill AND agent carrier; convert skills to guides only with its `--mode=guide --tags <tag>`; rebuild the projection with `node .claude/scripts/build-protocol-projection.cjs`; then grep `SYNC:<tag>` for copies outside the tool's scope, such as `.claude/docs/development-rules.md`.
