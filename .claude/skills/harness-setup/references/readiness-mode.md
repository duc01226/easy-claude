# Readiness mode — the task-start harness check

Read this when `/harness-setup --mode=readiness` runs: as the optional first step of `workflow-feature`, `workflow-bugfix` and `workflow-implement-spec`, from `/integration-test` when it finds no test project, or when the user asks whether the project is ready for changes. This mode replaces the Activation Guards and Phases A–F for the call; it ends in one of three outcomes and hands back to the task.

**Rules first:**

- **The check decides, not a guess.** Run `node .claude/scripts/harness-readiness.cjs --json` (the same command on Windows, macOS and Linux). It reads only the project config, the two committed proof records (the harness inventory and the verify baseline) and the manifests; it runs no tool, uses no network and writes nothing. Act on its `verdict`, `gaps`, `ownership`, `workspace` and `runtime` fields.
- **One plain-language consent.** Ask once for the whole setup, recommended option first. Each gap's `why` from the check says what goes wrong without it, in words a novice understands. Tool choices stay per tool inside `/linter-setup` (one question per tool, recommended first); this mode never picks a tool.
- **A team-owned repository gets a proposal, never a change.** When `ownership.teamOwned` is true (a code-owners file, a CI pipeline, or a lint or format config package the team publishes itself), write nothing to the project: present the proposal in the conversation, record it with `--record=proposed`, and continue the task. One person's yes never changes checks the team owns.
- **A no is recorded, not argued.** Record it with `--record=declined`; ask again only when the user asks, when the record expires, or when a gap it does not name appears.
- **Never block the task.** Every outcome — proven, proposed or declined — continues the original task. This is not a prompt gate: it runs only as a workflow step or on request, so the first-prompt rule for projects without a config stays as it is.

## Steps

1. **Detect.** Run the check. When `offer` is `false`, report the verdict and its `summary` in one line and return: `ready` (every check proven, declined in the inventory or not applicable), or a `declined` / `proposed` decision that still covers every gap. When `stacks` is empty, no manifest was recognised: the setup researches the stack first (`/linter-setup` Stack Detection).
2. **Team-owned → propose.** When `action` is `propose`, list each gap with its `why`, the tool you would suggest for the stack and placement (`workspace.placement`), the baseline that keeps today's code green, and the commands to record. Write no file in the project. Then run `node .claude/scripts/harness-readiness.cjs --record=proposed --reason "<who should decide>"` and return `proposed`.
3. **Otherwise ask once** with `ask user question tool`: name the missing or unproven checks in plain words, one `why` line each, and offer **"Set them up now (Recommended)"** or **"Not now"**. Mention the `runtime` row only as information: it never makes the offer.
4. **On yes — set up, then prove each gap:**
    - Formatter, linter or type check `missing` → `/linter-setup --mode=brownfield` for only those categories; its placement rules and baseline keep the existing tree green.
    - Tests `missing` → pick the stack's standard runner, the built-in one first (`node --test`, Python `unittest` or pytest, `go test`, `cargo test`, the build tool's JUnit task, `dotnet test`); ask before installing anything; add one smoke test that runs real project code; record the command in `testing.commands` through `/project-config` on the user's yes.
    - Any check `configured` but unproven → run its command once. A pass, or failures only on baselined entries, is proven; a new failure is reported with the tool's diagnostic and offered a brownfield baseline — never record a failing check as proven. A check declared in `testing.commands` (`lint`, `typecheck`, `affected`) is proven through the verify runner: `node .claude/hooks/lib/verify-receipt.cjs run`, then, on the user's yes, `node .claude/hooks/lib/verify-receipt.cjs baseline-init`, which records the command's hash in `.verify-baseline.json`.
    - Write each result to the inventory Summary (path and format: `references/harness-inventory.md`): status `proven` with the command and its result as evidence. The check reads that table at the next task start, so a proven project pays only for the check.
    - Run the check again and report what remains, honestly.
5. **On no** → run `node .claude/scripts/harness-readiness.cjs --record=declined --reason "<the user's words>"` and tell the user how to reopen it: ask for harness setup, or remove `tmp/claude-temp/.harness-readiness-decision`. The record lives on this machine only and lasts 7 days; a team decision to never adopt a check belongs in the committed inventory as `declined`, written by its owner.
6. **Return** one line: the outcome (`proven`, `proposed` or `declined`), the checks it covered and the evidence, so the workflow's next step starts with the harness state known.

## What the check reads

| Input | Where | Why it is enough |
| --- | --- | --- |
| Project config | `testing.commands`, `formatting`, `experienceVerification`, `docsRoots` | declared commands count as configured; relocated roots are honoured |
| Harness inventory | the Summary table of `harness-inventory.md` under the project-reference root | a durable proof record: `proven`, `declined` and `n/a` settle a check |
| Verify baseline | `.verify-baseline.json` at the repository root | a durable proof record: a `lint`, `typecheck` or `affected` command whose current hash is recorded is proven; a command set to `none` is not applicable |
| Manifests and tool configs | root names, workspace package folders one level deep (at most 50) | a sub-second answer that does not grow with the size of the code |
| Ownership signals | code-owners file, CI files, shared config packages | decides propose versus set up |
| Decision record | `tmp/claude-temp/.harness-readiness-decision` | local and untracked, so recording it writes nothing the team owns |

Routes that start no catalog workflow (a direct answer, a single skill, a custom-simple route, a mid-session follow-up) get no readiness offer; that is a recorded gap, not an oversight.
