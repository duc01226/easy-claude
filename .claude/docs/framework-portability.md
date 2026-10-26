# Agent-Folder Portability Protocol

The agent folders are copied verbatim into other repositories. A change is portable when an adopting
project can take them as-is and have them work, with nothing of this repository left in them.

> **Rule:** every AI-agent folder — `.claude/`, `.codex/`, `.agents/`, `.opencode/`, and any other
> agent surface added later — must be portable, copyable and configurable into any project, with no
> project-specific leaks. Project specifics live in `docs/project-config.json` and the
> project-reference docs, never in an agent folder.

`.claude/` is the SOURCE. `.codex/`, `.agents/` and `.opencode/` are GENERATED mirrors of it: never
hand-edit them — fix the `.claude/**` source and regenerate, or the next sync silently reverts you.
A leak in a mirror means the leak is in the source.

## Contents

- [What counts as a leak](#what-counts-as-a-leak)
- [Form (b) — the sanctioned way to state a default](#form-b--the-sanctioned-way-to-state-a-default)
- [Gates](#gates)
- [Concise guidance evidence](#concise-guidance-evidence)
- [Updating an installed framework](#updating-an-installed-framework)
- [Local artifacts are not leaks](#local-artifacts-are-not-leaks)
- [Missing dependency recovery](#missing-dependency-recovery)


## What counts as a leak

| Leak | Instead |
| --- | --- |
| A consumer project, product or company name | Say nothing, or name the role (`the consuming project`) |
| An absolute path (`D:\...`, `/Users/...`, `/home/...`) | A repo-relative path |
| A root literal (`docs/specs`, `plans/`, `team-artifacts/`) stated as fact | Form (b): the config value with the default as fallback, naming `docs/project-config.json` |
| A consumer's base classes, packages or module names as load-bearing rules | Frame as a marked example, or route through a reference doc |
| A test asserting this repository's own corpus, prose or file tree | Build the fixture in a temp dir, or gate on that corpus being present |
| A generated mirror edited by hand | Edit the `.claude/**` source, then regenerate |

## Form (b) — the sanctioned way to state a default

A default is fine when the same line says it is a default and where the override lives:

```js
const specRoot = (config.specRoots?.business?.path) || 'docs/specs'; // docs/project-config.json overrides
```

```md
the business spec root (default `docs/specs`; `specRoots.business.path` in
`docs/project-config.json` overrides it)
```

Naming `docs/project-config.json` on the line is what clears the root-literal gate.

## Gates

| Gate | Catches |
| --- | --- |
| `verify-no-project-residue.mjs` | Consumer project names and this codebase's framework symbols |
| `verify-configurable-root-literals.mjs` | Root literals not written as form (b) |
| `portable-paths.test.mjs` | Bare `scripts/` and other non-portable path references |
| `verify-sync-divergence.mjs` | A mirror that drifted from its source |

Run them together with `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.

A gate passing is not proof of portability — it proves only what the gate checks. The residue gate
listed just two consumer names for a long time, so another project's spec paths, package names and
design-doc pointers sat inside a scanned directory and passed. **When a leak gets through, fix the
leak and the gate that missed it**, or the next one lands the same way.

## Concise guidance evidence

Keep `contextDelivery.profile` compatible until deterministic, frozen behavioral
and native platform/host evidence all pass. Candidate concise settings are for
evaluation; they never waive adopter rules, required gates or host permission.
Read [configuration](configuration/README.md#context-delivery-profile) for the
profile and reversible checkout override, and [hook delivery](hooks/README.md#context-delivery-profiles)
for lifecycle and fallback.

Portable commands require Node only unless tokenization is explicitly requested:

- `node .claude/hooks/tests/run-all-tests.cjs --filter=context-delivery` runs the
  shared intent assertions without an adopter package manifest or spec format.
- `node .claude/scripts/context-delivery-audit.cjs render` emits public synthetic
  renderings of both profiles and later discovery text; compare identical scope.
- `node .claude/scripts/context-delivery-evaluate.cjs` prepares the job list for 20
  frozen worlds, three paired trials each (120 isolated jobs), under project `tmp/`,
  and builds no world. Preparation is not model execution or behavioral PASS. A run
  builds each world just before its job and removes it after grading unless
  `--keep-worlds` is given.
- `node .claude/scripts/context-delivery-evaluate.cjs --adapter <adapter.json>`
  runs a user-selected, authorized isolated host adapter. JSON declares a literal
  `executable`, string `args`, and `isolationVerified: true`; an optional
  `jobTimeoutMs` (30,000 to 1,800,000, default 180,000) gives a slower model or
  host a longer per-job limit. Each job arrives on
  stdin with `cwd`, policy, prompt and source identities, plus `jobTimeoutMs` (the
  evaluator stops the adapter at that limit, so the adapter fits its host runs and
  cleanup inside it) and `scratchDir` (a temporary folder for the adapter's private
  files, such as a copied sign-in file; the evaluator removes it after the job, even
  when it had to stop the adapter). Return actual host
  ordered `toolEvents` (`action`, `command`, `readPaths`, `changedPaths`, `output`,
  `exitCode`), model/settings hash, host,
  input/output token usage and `attempts` (host runs the job took) as JSON. A job
  that fails blocks the run: the evaluator never retries a job and never keeps a
  favorable subset. An adapter may retry a host or transport failure (the host could
  not start, crashed, or reported a dropped connection, server error, overload or rate
  limit) once, from the job's starting world and inside the job's limit; a completed
  turn, a timeout or a failed turn the model caused is a result and is never retried.
  Each record keeps the reported `attempts` (`null` when an adapter reports none). The adapter must enforce native permissions,
  prevent ancestor guidance contamination, retain equal settings across profiles,
  make framework discovery files read-only, record filesystem changes around each
  tool event, and use no new provider/spending without authorization. `action` is
  `read`, `local-write`, `local-exec`, `publication`, `network` or `check-bypass`; paths are confined
  forward-slash job-relative paths. The host observer supplies this metadata,
  never the model. Complete prerequisite reads may span successful events before
  task-state mutation. Raw outputs concatenate in observed order. For framed,
  overlapping or out-of-order reads, the observer may add `readChunks` entries
  `{path, offset, text}`: zero-based UTF-8 byte offsets, exact returned text also
  present in the event output, and paths declared in that event's `readPaths`.
  Ranges must match original bytes and cover the whole file. Per required file,
  collected output plus chunk text is limited to 4 MiB and 4,096 chunks; each
  event also has at most 4,096 chunks. Failed, late or unrelated reads cannot fill
  gaps. Malformed ranges or exceeded budgets make observation incomplete.
  Unknown or incomplete observations block evidence. A reference Claude Code adapter
  ships at `.claude/scripts/context-evaluation-adapters/claude-code.mjs`: a
  PostToolUse observer hook records each tool call's changed files, reads carry raw
  file text, user settings/hooks/MCP servers are excluded and web tools are disabled
  (`CTX_EVAL_MODEL` picks the model; run the same file per model to compare a frontier
  and a smaller model). Containment, because the run is an agent with a shell and some
  cases tempt it to publish: shell commands run in Claude Code's OS sandbox (writes only
  in the world and the per-user temp directory, no network, no unsandboxed fallback, and
  the run refuses to start without the sandbox), permission mode `acceptEdits` denies
  anything that would need approval, the child receives an allowlisted environment
  (`CTX_EVAL_PASS_ENV` adds a provider's variables) whose model credentials and passed
  names are unset for sandboxed commands, and the adapter refuses a world that has an
  ancestor `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md` or `.git`, so pass
  `--output` outside any project. macOS runs as is; Linux and WSL2 need the sandbox's
  optional seccomp filter, which blocks Unix sockets such as a Docker socket or WSL's
  Windows-launch socket (`npm install -g @anthropic-ai/sandbox-runtime`, then
  `CTX_EVAL_LINUX_SANDBOX_VERIFIED=1`); native Windows is refused. Reads are not
  confined, so run it as a user without secrets you would not show the model.
  The policy text reaches the run through `--append-system-prompt`, the same
  channel for both profiles but not the production hook channel.
  A reference Codex adapter ships beside it (`codex.mjs`) for a hosted model or an
  open-weight model served locally (`CTX_EVAL_CODEX_OSS=1`, Ollama or LM Studio
  through `codex --oss`): events come from `codex exec --json` and a world snapshot
  after each item; Codex's `workspace-write` sandbox runs with network off and the
  temp directories excluded, a private temporary `CODEX_HOME` holds only a copy of the
  sign-in file, the policy goes in as developer instructions, and the adapter refuses
  a world under an ancestor `AGENTS.md`, `CLAUDE.md` or `.git` and on native Windows.
  It is the reference adapter that retries: one retry of a host or transport failure,
  only when at least 30 s of the job's limit remain, reported as `attempts: 2`; a run
  past its limit gets SIGTERM and, after a short grace, SIGKILL for its process group,
  and a SIGTERM or SIGINT to the adapter stops the Codex run and removes the private
  home and world backup before it exits. The Claude Code adapter never retries.
  A command the sandbox refuses before it starts may not appear as an event.
  Both adapters share `adapter-common.mjs`: a shell statement that only reads (for
  example `cat a b` inside `ls; cat a b`) credits its files, an empty host scratch
  folder such as Claude Code's `.claude/.cc-writes` is removed before grading (a
  non-empty one stays), and the environment allowlist and ancestor check are one rule. It does
  not make discovery files read-only; the grader still flags any change to them. One
  host/platform lane is evidence for that lane, never the cross-lane adoption verdict.
  The adapter declaration records a prerequisite and does not establish isolation
  proof by itself. Optional
  `saveRedactedTrajectories` requires the adapter to redact its output first; default diagnostics contain identities only.
- `node .claude/scripts/context-delivery-audit.cjs assess <evidence.json>` checks
  complete paired records, fixture/policy identities, mandatory outcomes,
  consequential violations, per-class success, median session cost/latency and
  diagnosed outliers. The CLI derives current policy/source/bundle hashes itself;
  evidence cannot choose its expected candidate identity. Supply
  `options.deterministicPassed`, outlier diagnoses where needed (trimmed nonblank strings, at most 4,096 characters), and `nativeEvidence` for all supported platform/host
  combinations, each with matching source hash. This verifies collector receipts;
  model self-reports and synthetic validator positive controls are not receipts.

World oracles inspect filesystem outcomes and captured host tool results; they
never execute agent-written code in the maintainer process. These small synthetic
worlds establish only their declared behavior, model and settings. The held-out
variants change state/filenames within each class; they do not establish broad
out-of-distribution generalization. Keep fixture/world hashes frozen before
evaluating; a changed world invalidates previous comparison. Native OS/host checks
cannot be replaced by path simulation on one machine. Missing runtime, isolation,
usage or native proof blocks promotion. No tool automatically changes the default.
Read [context delivery tools](../scripts/README.md#context-delivery-tools) when
preparing renderer, tokenizer, catalog or evidence inputs.

Preparation copies the same public framework text bundle to each job: registered
skills, shared protocols, hook libraries, framework docs and the discovery/catalog
helper closure. It excludes adopter configuration, home files, secrets, binaries
and symlinks; limits are 5,000 files, 1 MiB per file and 32 MiB total per job.
Bytes are normalized for LF identity across platforms. The grader protects bundle
bytes and inventories unexpected files. Adapter confinement and read-only access
must be proved separately; a copied directory is no sandbox. Required observed
reads precede task-state edits. Observed evidence bookkeeping may precede those
reads only under `tmp/reports/` or `tmp/analysis/`: at most 64 regular files,
256 KiB each and 2 MiB total. Protected assertion mutations and unrelated changes
remain consequential failures. Inventory stops at 10,000 entries or depth 32;
an exceeded inventory or artifact budget makes observation incomplete. Task-file
reads require contained regular files up to 1 MiB, verify opened identity and
replacement, and close descriptors on every path. Unsupported types, oversized
or replaced files fail closed. Frozen v4 includes real investigation-depth
discovery and a custom-route selection/definition-loading probe; that probe does
not measure completed audit quality. Earlier v1/v2/v3 have no live evidence to
migrate. Read-only custom routing retains skill descriptions, registered skill
loading and rationale-review discovery; see
the published `concise-workflow-route.md` policy under `.claude/skills/shared/protocols/`.

## Updating an installed framework

`export-claude.mjs` installs a first copy. Every later version is **merged**, never copied, so a project keeps the framework changes it made (its own skills, fixes, settings entries and toggles) and still receives every upstream improvement. Ask the agent to update the framework (`/framework-update`, `$framework-update` on Codex): the skill runs the commands below, settles conflicts with `references/merge-guide.md` and asks only what needs a decision. Without an agent:

```text
node .claude/skills/framework-update/scripts/update-from-upstream.mjs --dry-run
node .claude/skills/framework-update/scripts/update-from-upstream.mjs
```

- **Where from.** The default upstream is the `main` branch of `https://github.com/duc01226/easy-claude.git`; the lock records the address, so later runs need no arguments. `--ref=<branch|tag|commit>` and `--upstream=<url|folder>` pick another version or source (a local checkout works offline). The script keeps a blobless clone in `tmp/framework-update/upstream.git` and downloads the needed file contents in batches, then runs the merge engine (`.claude/scripts/framework-update.mjs`) from the upstream version being taken, so the newest merge rules apply. `--project=<dir>` updates another project, which is how a project without the skill takes its first update.
- **Ownership.** A file under `.claude/` in the upstream tree is framework-owned; anything else (project skills, ledgers, `docs/`, `CLAUDE.md`, `docs/project-config.json`) is never read or written. Per-person files (`settings.local.json`, `.ck.local.json`) are never taken.
- **Merge.** `.claude/framework-lock.json` records the upstream commit and the file hashes the project last took. An unchanged project file takes upstream; a project-only change stays; a change on both sides goes through `git merge-file`, and an overlap keeps conflict markers in the file (exit code 2). A deletion upstream removes only an unchanged file. A file added on both sides, or one with no base text, keeps the project's copy and puts upstream's in `tmp/framework-update/`.
- **No noise.** `<!-- COUNT:… -->` values never conflict (merged as 0, then recomputed), and `SKILLS.yaml` / `skills_data.yaml` are regenerated from the project's own skills instead of merged. The tool ends with the `/sync-codex` pipeline unless `--no-sync` or a conflict stops it.
- **Which version.** The default is the upstream `HEAD` commit (`--ref=<rev>` picks another). `--working-tree` takes uncommitted upstream files; the lock then records hashes only. The project's `.claude/` must be committed first, so the update is one reviewable diff.
- **First run.** A project without a lock needs the upstream commit it copied. The script passes `--base=auto`: the commit whose `.claude/` files match the most project files by content (a tie goes to the older commit), reported with its match count so a weak match can be confirmed; `--base=<commit>` names it instead. A project synced by hand can record where it now stands with `--record-only --ref=<rev>` (no file changes).
- **Mirrors.** The closing sync rebuilds `.agents/skills/` from `.claude/skills/`. An entry there with no `.claude/skills/` source (a skill written for Codex only, or installed there by another tool) would be deleted, so the engine lists it as mirror-only and skips the sync until it is moved into `.claude/skills/` or let go. Text is compared with CRLF read as LF, so a Windows checkout does not look changed, and a folder a deletion emptied is removed.
- **Make it a setting, not an edit.** Before changing a framework file for a project, look for a setting (`node .claude/scripts/ck-config-help.cjs`); an edit is kept by the merge but conflicts whenever upstream changes the same lines. A behavior that other projects could use belongs upstream as a setting that is off by default.

## Local artifacts are not leaks

`.venv/`, `node_modules/` and `__pycache__/` under `.claude/` are gitignored build output. They carry
machine-specific absolute paths but never ship, so they are not bundle leaks — and they are untracked,
so deleting them destroys the only copy. Leave them alone.

## Missing dependency recovery

When a capability needs a missing framework package or tool, follow the universal
`workflow-step-advancement` dependency rule: verify the declared package/version, make a
bounded noninteractive global attempt, then use an isolated/local runtime or an
equivalent tool on failure. Re-probe the actual consumer. Skip optional capability
only; an unavailable required check remains reported as unavailable.

Read `.claude/scripts/README.md` when using catalog tooling's automatic PyYAML
recovery. Keep installer scope with its existing owner: local adopter libraries,
active graph dependencies and Windows Git have their own policies. Preserve them
while adding on-use tooling recovery; never install arbitrary names inferred from
an import error or relax platform/trust guards to force an installation.
