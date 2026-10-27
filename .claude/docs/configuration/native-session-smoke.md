# Native session smoke check

Read this guide when changing framework runtime or native skill visibility. Use fresh Claude and
Codex processes: inherited authoring context can conceal a discovery failure. One session per host
is the minimum comparison; a mode or invocation-policy change needs another fresh session.

## Isolation

Prepare separate disposable Git repositories under the workspace `tmp/`, copying the changed branch's
framework source and generated host files. Omit ignored runtime state and credentials. Keep these
fixtures separate from the branch's Git history and any real remote. Use the host's configured model.
For deterministic native-loader probes, use isolated host configuration directories. For authenticated
model probes, use existing host authentication without copying or displaying credentials.

Read `.claude/config/README.md#codex-trust-entries` before a Codex write-capable probe; prefer read-only
probes and capture only task-relevant results. Do not grant hook trust or wider tool permissions merely
to get a green result. Missing authentication, trust or host capabilities is an explicit test limitation.

## Cases and evidence

| Case | Expected evidence |
| --- | --- |
| `quiet` | Context-producing hooks emit nothing; review gate remains active. Native skill profile is unchanged. |
| An ordinary feature request | Manual-only workflow entry is not automatically invoked. Use a harmless canary body in the disposable fixture to observe discovery without starting real delivery. |
| Explicit manual-only skill request | Native loader runs the named canary and returns its marker. |
| `off` via the CLI | Framework skills disappear from Claude's native command/catalog list; Codex `skills/list` reports the framework paths disabled. Built-ins and unrelated skills retain their policy. |
| Restore `quiet` / `on` | Previous manual-only entries and callable review/configuration dependencies return. |
| Requested commit review selection | The real policy helper selects `commit-review`, at most three rounds, for default low and high risk. `risk-based` restores tier selection; PR selection stays independent. |
| Commit/push prompting | Inspect actual tool/permission events in a disposable local-only Git fixture. A policy-helper result alone does not prove absence of a native approval dialog. |

Capture native command lists or loader metadata and JSON tool events, alongside the exact installed
host versions, mode and fixture paths. An absent invocation in one stochastic model response is only
a smoke result; native discovery metadata and regression tests are stronger evidence for the setting.
Never report an unexecuted Git or live-model scenario as passing. Store logs under `tmp/reports/`.

## Activation evals

A smoke result is one stochastic answer. To measure whether skills start when they should, run
`node .claude/scripts/skill-activation-eval.mjs --cases <file.json> --host=claude|codex --runs=3`
(`--min-hit-rate` and `--max-false-rate` turn it into a gate; `--json` for the full report). A case
names a prompt and the skill it should start, or `null` for none; include near-miss prompts that
must stay quiet. A skill counts as started when the host called it or the agent read its SKILL.md.
Copy `.claude/config/skill-activation-evals.example.json` as a starting point and phrase prompts the
way the project's least technical user would. Runs are headless and read-only: Claude runs in plan mode
with only the Skill, Read, Glob and Grep tools (`--tools`, so the CLI must support that flag; Bash, Edit,
Write, MultiEdit and NotebookEdit are also disallowed as a second guard), project and local settings only
and no MCP servers; Codex runs in its read-only sandbox. Because the model sees only those tools, rates are
not comparable with runs made under a wider tool set. Each run gets the adapters' allowlisted environment,
the framework switches its hooks read (`CK_FRAMEWORK_MODE`, `CK_QUIET_PROJECT_RULES`, `CK_QUIET_NATIVE`,
`CK_AUTO_APPLY_NATIVE`, `CK_WORKFLOW_ROUTE_MODE`, `CK_DECISION_SUPPORT_MODE`, `CK_SKILL_AUTO_TRIGGER`, `CK_COMMIT_REVIEW_MODE`,
`CK_PROMPT_LEDGER` and the router kill switches `CK_KNOWLEDGE_ROUTE`, `CK_QUALITY_SKILL_REMINDER`,
`CK_CORE_PRINCIPLES_INJECT`, `CK_AI_FEATURE_ROUTE`, `CK_COMMIT_SKILL_ROUTE`,
`CK_JUDGEMENT_INTEGRITY_ROUTE`) and any names in `SKILL_EVAL_PASS_ENV`; no other `CK_` variable is passed,
because some carry credentials (a remote URL).
Runs spend model tokens. The report's `framework` object records the effective framework mode and its
source, quiet project rules, the skill auto-trigger policy (`skillAutoTrigger: { enabled, source }`) and
the workflow route mode (`workflowRouteMode: { mode, source }`), where the source names the layer that
decided it (`default`, `project-config`, `user-config` for the personal `~/.claude/.ck.json`,
`local-override` or `environment`), and each passed switch with its value (`switches`: trimmed, wrapping
quotes removed and lower-cased; anything other than a short mode word is recorded as `(unrecognized)`).
`switchesPassed` (names only) is kept for one release. The report never records a config path, a
`SKILL_EVAL_PASS_ENV` value or any other `CK_` value. The text summary line includes
`auto-trigger on|off (<source>)`. A run that errors or outlives `--timeout-ms` is reported as unmeasured,
kept out of both rates, and makes the command exit 2. To compare modes or personal policies, run the same
file under each and compare the recorded `framework` objects; `skillAutoTrigger: false` from any layer makes
skills ask before they start, which a headless run cannot answer, so rates under different auto-trigger
policies are not comparable. The recorded state does not include `env` entries from
`.claude/settings*.json`.

## Limits

These switches do not remove ordinary project instructions, personal plugins, host-managed rules or
repository/CI checks. The native off adapter currently targets Claude and Codex. Global reconciliation
covers registered checkouts; new copies need `node .claude/scripts/framework-mode.cjs apply`.

Use fresh sessions, preserve external settings, and distinguish loader evidence from model behavior.
