# Upgrade actions and notices

Read this when a framework change alters something consumer projects must act on or know about: a
project-config section, a workflow, a hook registration, a scan target or the set of skills. The
consumer side (what an agent does with the entries after `/framework-update`) is in
`.claude/skills/framework-update/references/upgrade-actions.md`.

**Rules first:**

- Every consumer-facing change ships an entry here, or a waiver with a reason. The upstream check
  `node .claude/scripts/upgrade-contract.mjs` fails until it does; it runs in the full test run and in CI.
- An entry tells the consumer's agent what to do; it never runs on its own. Steps that install, change
  project-owned files or pick tools say `(consent: yes)`.
- Never delete an action. A notice may be deleted 180 days after its `added` date; when the snapshot
  records it as the cover of a surface, add a waiver for that `surface@hash` whose reason names the
  retired notice, then run `--refresh`.

## Kinds

| Kind | Use it when | The consumer's agent |
| --- | --- | --- |
| `action` | the project must do something: fill new config, initialize a baseline, offer a setup | runs the steps in order, asks where a step needs consent, then records the outcome |
| `notice` | the user should know something, with nothing to run | tells the user, then records it done |
| waiver | the change needs nothing from anyone (an internal validation detail) | never sees it: a waiver lives only in `contract-snapshot.json` |

## File format

One file per change: `.claude/upgrades/actions/<id>.md`, where `<id>` is the file name in lowercase words
joined by hyphens. The frontmatter holds `key: value` lines and `  - item` lists; a value that opens with
`[`, `{`, `"` or `'` is JSON, with YAML single-quoted strings allowed, so a formatter may rewrap or requote it.
Unknown keys are rejected.

| Field | Kinds | Meaning |
| --- | --- | --- |
| `id` | both | the file name without `.md` |
| `kind` | both | `action` or `notice` |
| `title` | both | one line, shown in the `NEXT` block |
| `added` | both | `YYYY-MM-DD`; orders entries and starts a notice's 180 days |
| `covers` | both | `surface@hash` values this entry answers for (see below) |
| `mergeNotes` | both | `.claude/<path or glob>: <what to keep>`; printed when that file conflicts in a consumer that edited it (`*` is one folder level, `**/` any depth) |
| `level` | action | `required`, `recommended` or `optional` |
| `after` | action | ids this action runs after |
| `applies` | action | argv array starting with `node` or `git`; exit 0 means the action applies and exit 3 means it does not (recorded not applicable); any other result, a crash included, settles nothing |
| `done` | action | argv array starting with `node` or `git`; exit 0 records the action done, so a second run never redoes it |
| `writesState` | action | `true` when the action writes files or config; it then needs a `done` check |

The body says why the entry exists. An action's body has a `## Steps` section of numbered items; each
item names its skill or command in backticks and ends with `(consent: yes)` or `(consent: no)`. A
notice's body is what the agent tells the user.

Checks run in the consumer project once the update is applied and regenerated (and synced, unless `--no-sync`), with a 30-second
limit, and only for an action whose prerequisites are resolved. They must only read: a check runs without
asking, so anything that writes, installs or chooses belongs in a step with `(consent: yes)`. Use `node -e`
or a framework script, so they work the same on Windows, macOS and Linux; the `node`/`git` rule is for
portability, not a sandbox.

## Surfaces and the contract check

`upgrade-contract.mjs` hashes each consumer-facing surface (12 hex characters, prose left out):

| Surface | What changes its hash |
| --- | --- |
| `config:<section>` | a key, type, default or allowed value declared under that top-level project-config section |
| `config:<CONSTANT>` | an allowed-value list the project-config schema module exports beside the schema (activation tiers, route modes, presets) |
| `workflow:<id>` | a step, role, argument, gate or phase of that workflow |
| `hooks:<event>` | a hook registration for that event in `.claude/settings.json` |
| `scan-targets` | a scan target key or the doc it writes |
| `skills` | a framework skill added, renamed or removed |

`contract-snapshot.json` records the accepted hash of each surface and what accepted it. When the check
reports a surface, it prints the exact `surface@hash` to cover:

1. Add it to the `covers` of the action or notice for the change, or, when nobody needs to act, add a
   waiver to the snapshot: `{ "covers": ["<surface@hash>"], "reason": "<why nothing is needed>" }`.
   A removed surface is covered as `<surface>@absent`.
2. Run `node .claude/scripts/upgrade-contract.mjs --refresh`. It records only covered hashes and refuses
   while any change is uncovered, so it cannot turn the check green by itself.

A hash typed into the snapshot by hand fails the check: each recorded hash must come from the baseline,
an entry or a waiver. The baseline is written once by `--init` and never edited; a diff that changes it is
a red flag for review. Keep allowed values in the schema or in an exported constant: a list held only
inside a validator is invisible to the check.

The check runs only in the upstream repository, the one whose `package.json` is named
`easy-claude-tooling`. Consumer projects carry this folder but never run it, including a project that
vendors the framework and points `portability.toolingPackageName` at its own package.
