# Project config — local-only workflow routing

> Read when the request changes `portability.workflowRouteMode`, `portability.workflowRouteProtocol` or `portability.workflowActivation`, or asks for a personal or machine-local setting.

## Contents

- [⛔ Local-Only Workflow Routing — `.claude/.ck.local.json`](#-local-only-workflow-routing--claudecklocaljson)
- [Custom route protocol (`portability.workflowRouteProtocol`)](#custom-route-protocol-portabilityworkflowrouteprotocol)
- [Workflow activation tiers (`portability.workflowActivation`)](#workflow-activation-tiers-portabilityworkflowactivation)

## ⛔ Local-Only Workflow Routing — `.claude/.ck.local.json`

**MUST ATTENTION — route by who the change is for, and ask when it is ambiguous.**

| The user says | Write to |
| --- | --- |
| "turn workflow routing off/on, or set it to ask/auto/off, **for me / on my machine / locally / just here / don't commit it**" | `/framework-config --mode=workflow <mode> --save` (`~/.claude/.ck.json`, every project) or `--save --local` (`.claude/.ck.local.json`, this checkout) — **never** the team file |
| "add/change the route protocol **for me / on my machine / locally / just here / don't commit it**" | `.claude/.ck.local.json` — **never** the team file |
| "turn workflow routing off/on **for this project / for the team / for everyone**" | The configured project-config file (the normal scan/merge path) |
| "add/change the route protocol **for this project / for the team / for everyone**" | The configured project-config file (the normal scan/merge path) |
| "make workflows ask first / never auto-start **for me / on my machine / locally**" | `.claude/.ck.local.json` — **never** the team file |
| "make workflows ask first / never auto-start **for this project / for the team / for everyone**" | The configured project-config file (the normal scan/merge path) |
| A scan/merge run (Phases 0–7 below) | The configured project-config file — scans describe the repository, which is a team fact |
| A local request for any other project-config field | Explain that no generic local overlay exists; keep repository facts in the team config |

**Writing the local override:**

1. Confirm it is ignored before writing — `git check-ignore -v .claude/.ck.local.json`.
   It is covered by the portable `.claude/.gitignore` rule `*.local.json`. If that command reports
   nothing, the file would be committed: STOP, tell the user, and add the ignore rule first.
   Never create an un-ignored `*.local.json`; that is the one outcome this whole path exists
   to prevent.
2. Write **only the overridden keys**, in the same nesting as the team file. It is a sparse
   overlay, not a copy — duplicating the whole config guarantees it rots against the team file.
3. Never delete or rewrite keys the user did not name, and never migrate settings out of the
   team file into the local one.
4. Report the absolute path you wrote, that it is git-ignored, and how to undo it (delete the
   file, or set the key back).

```jsonc
// .claude/.ck.local.json — git-ignored, this machine only, sparse override
{
  "portability": { "workflowRouteMode": "off" }   // "ask" (default) | "auto" | "off"
}
```

**Resolution contract** (`.claude/scripts/lib/workflow-routing-config.cjs` implements it for both
`workflowRouteMode` and `workflowRouteProtocol`): framework default (`ask` / none) → the configured
team project-config file → (mode only) `~/.claude/.ck.json` → local `.claude/.ck.local.json` → (mode only) env `CK_WORKFLOW_ROUTE_MODE`, **later valid layer wins**. A layer that is
absent, unparseable, or simply silent on a key expresses no opinion and falls through to the layer
below — so a missing file never flips a setting, and the override works in BOTH directions (a
developer can set `ask`/a protocol locally to opt back in when the team set `off`/its own text).
The team path follows `.ck.json` `portability.projectConfigPath`; the local path remains
`.claude/.ck.local.json` so the portable framework carries its ignore rule to every consuming project.

### Custom route protocol (`portability.workflowRouteProtocol`)

Use this when the project wants the runtime route reminder to carry ADDITIONAL rules or a custom
protocol on top of the canonical route gate. The value is either:

- a **string** — inline markdown appended verbatim; or
- an **object** `{ "text": "...", "path": "..." }` — inline `text` and/or a **repo-relative** `path`
  to a markdown file read at runtime. Both may be supplied; `text` renders first, then the file body.
  Absolute paths and `..` segments are rejected (fail-closed in the schema; at runtime an unreadable
  or escaping path simply expresses no opinion and the cascade falls through).

```jsonc
// team (docs/project-config.json) — committed, applies to everyone
{ "portability": { "workflowRouteProtocol": { "path": "docs/project-protocols/route.md" } } }

// developer (git-ignored .claude/.ck.local.json) — local REPLACES the team value
{ "portability": { "workflowRouteProtocol": "Always prefer a targeted run over the full suite." } }
```

**Semantics.**

- The text is **additive** to the canonical gate and catalog, injected in its own marker block
  (`<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`) by `workflow-route-inject.cjs` at `UserPromptSubmit`. It is
  advisory context, never a blocking decision and never an authority escalation.
- Keep it to about 3,300 characters or fewer. The framework never cuts it, but it shares one hook
  output with the gate, and a host shows only a preview of an output past 10,000 characters, the gate
  included; the route output then says so on its second line and names the size that fits.
- Team and local layers do **not** concatenate: a valid local value **replaces** the team value, the
  same "later valid layer wins" rule the on/off switch uses. To extend the team protocol locally, copy
  its text into the local value (or point the local `path` at the shared file and add your lines).
- It is **runtime-only**. It is never stamped into tracked `CLAUDE.md` / `AGENTS.md`
  (those remain team-owned), so `/ai-context-refresh` and `/sync-codex` are
  never required to apply it.
- A protocol edit changes the delivery content hash, so the next `UserPromptSubmit` re-delivers it.
- **Safety and bounds.** A `path` naming a privacy-sensitive file (`.env`, credentials, secrets,
  `*.pem`/`*.key`) is refused — the validator errors and the runtime treats it as no opinion — because
  the hook would otherwise read that file into model context on every prompt. A file larger than the
  cap (20,000 bytes) is truncated with a visible marker; it is never injected unbounded.

### Workflow activation tiers (`portability.workflowActivation`)

In route mode `ask` the route gate's workflow question is asked only when the route is to start a catalog workflow (direct and custom-simple routes ask nothing) (mode `auto` asks the same question, recommending the full workflow first); use this when the
project wants to change which option that question recommends (or hide a workflow's wrapper skill from
implicit invocation with `manual`), without forking `.claude/workflows.json`. Tier order is `auto` < `confirm` < `manual`.

- `default` — `auto` | `confirm` | `manual`: a floor applied to every workflow. The effective tier is
  the stricter of this and the workflow's framework tier, so `default` only tightens.
- `overrides` — `{ "<workflowId>": "<tier>" }`: pins one workflow's tier; it wins over `default` and
  the framework tier, so it may loosen.
- Omitted object = every workflow keeps its framework tier. An unknown tier is a validation error.
- In `.claude/.ck.local.json` (same nesting), a local `default` replaces the team `default`, while
  `overrides` merge per workflow id: a local entry wins for its id and a team override the local file
  does not name still applies. An explicit user request still runs any tier.

```jsonc
// team (docs/project-config.json) — recommend the full workflow only when nothing leaner fits, except bugfix
{ "portability": { "workflowActivation": { "default": "confirm", "overrides": { "workflow-bugfix": "auto" } } } }
```

**⛔ SCOPE — tracked defaults and runtime overrides.** `CLAUDE.md` and `AGENTS.md` carry no route text. `workflow-route-inject.cjs`
resolves the effective default + team + personal cascade at `UserPromptSubmit` and delivers the route
for the resolved mode (gate + optional `workflowRouteProtocol` in `ask`/`auto`, with the catalog as a
second output from `workflow-catalog-inject.cjs`; a short routing-OFF notice and no catalog in `off`).

**Do NOT tell the user to run `/ai-context-refresh` or `/sync-codex` to apply an override.** The
next prompt resolves it at runtime. There is no option that bakes local routing or the custom
protocol into tracked files.
