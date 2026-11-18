# Antigravity workspace support

Antigravity uses the shared `.agents/skills/` mirror and a named `easy-claude` group in
`.agents/hooks.json`. The original hook registry and handlers under `.claude/` stay authoritative.

## Set up a workspace

1. Copy or update the `.claude/` bundle, then run the normal mirror sync:
   `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.
   This produces the skill mirror, the root project instructions and the Antigravity hook group.
2. Make Node.js 18+ available on the **Antigravity process's PATH**. The same relative launcher
   works on macOS, Linux and Windows. A Node version manager loaded only by your interactive
   terminal may be invisible to a desktop app; start it from an environment with Node on PATH,
   or use a system installation. Hook commands start in `.agents/`, not the workspace root.
3. Open or reload the workspace. Check for `easy-claude` in App Customizations → Hooks,
   IDE agent Customizations → Hooks, or CLI `/hooks`. Use [Google's hook reference](https://antigravity.google/docs/hooks)
   for the native settings and supported tool list.

To refresh only the named group, run `node .claude/scripts/antigravity/sync-hooks.mjs`.
Add `--check` to verify it without writing. Sync preserves other groups and the managed
group's `enabled` flag. Set that flag to `false` to disable the group across syncs. Put custom
handlers in a separate group. The bridge does not install or change global hook settings.

## What runs

| Antigravity event | easy-claude behavior |
| --- | --- |
| `SessionStart` | Run the canonical startup handlers; inject their startup context. |
| `PreInvocation` | Deliver pending tool context, run prompt hooks for a new user prompt, and recognize a leading `/skill` or `$skill` for expansion hooks. |
| `PreToolUse` | Check mapped commands and file operations against the canonical gates; deny on an explicit block or bridge evaluation failure. Normal `allow` leaves Antigravity's own confirmation and access policy in effect. |
| `PostToolUse` | Run success or failure handlers based on the reported error. Queue guidance for the next model call, including guidance from reading a projected skill definition. |
| `Stop` | Run completion hooks and reset prompt detection when the host has finished. The bridge never instructs the model loop to continue. |

The bridge recognizes native shell, read, write, edit and question tools. It accepts canonical
Node hook commands under `.claude/hooks/` and the registered `Read(<glob>)` condition. Arbitrary
Claude shell commands, other handler types and unsupported conditions are not translated.
The bridge leaves the host's native tool arguments in place except for supported rewrites
that pass the gates again. Keep local diagnostics under your normal framework and Antigravity
log settings; queued tool context is disposable workspace state under `tmp/antigravity-hooks/`.

Antigravity does not expose equivalents for dedicated subagent startup, session-end cleanup,
permission-request/notification, explicit compaction/clear, or native task-list hooks.
It also does not report whether a conversation is a subagent in the Stop payload, and a tool
event does not carry its full response body. The bridge does not infer those missing fields
or events. A prompt repeated after a completed Stop is treated as a new turn; when the host
omits Stop and does not reset its invocation counter, identical prompt text cannot identify
distinct turns. Context fixtures verify the documented payload and command contract; for a
live smoke test, open a fresh conversation, confirm prompt-time context, then have it read a
skill that declares a review protocol and check that the next invocation receives that protocol.

Read [the hook catalog](hooks/README.md) when changing an existing canonical handler, and read
[the sync skill](../skills/sync-codex/SKILL.md) when changing the generated compatibility surfaces.
