# Demo Guide — Output Template & Best Practices

The structure the `demo-guide` skill writes. Fill from real project evidence; keep prose tight. Every
`{placeholder}` is derived, never guessed. Delete sections that genuinely don't apply (state why).

## Best-practice principles (apply while writing)

- **Understand before you script.** Nothing here is written until the skill's Step 1 comprehension bar is
  cleared with `file:line` per answer. A step derived from a screen name instead of the code is a step that
  fails live — in front of the room the guide was written for.
- **Show, then explain the data.** A demo is credible when the presenter shows the behaviour AND can point
  to the stored/changed data that makes it true. Every case pairs an observable step with a domain explanation.
- **Steps are live-runnable.** Write action-level steps a presenter follows in the running app: who acts,
  which screen, what input, what to click. No vague "verify it works". Endpoints, commands, and queries appear
  only inside 🔧 technical appendix cases.
- **Lead with the discriminator.** The expected result should be the value that would be WRONG under the old
  behaviour (the thing worth demoing), not a generic "it succeeds".
- **Drive real paths.** Preconditions are staged through real user actions / valid seeders — never by faking
  state that a user could not reach.
- **Demo it in the UI — the reader is a normal user / QC driving the app.** Every main case is staged and
  observed in the product's front-end (screens, forms, clicks, visible output). A case needing an API client,
  CLI, script, manual job/queue trigger, DB query, log tail, or config edit is a 🔧 **technical case**: same
  four-part rigour, but written into the closing `Appendix — Technical demo (non-UI)` — never among the main
  cases to test. A UI demo whose data can also be checked in the DB/logs stays a UI case; that check goes on
  its own **Deeper confirmation (optional, non-UI)** line — never into a numbered step, and never onto the
  proof chain, which carries only `file:line` links. **No front-end in this project?** State the rung in the
  header and read "front-end" above as the project's primary demo surface (API / CLI / library / background job).
- **Group by user story, order by demo flow.** Within a story, order cases so the demo tells a story
  (happy path first, then variants, edge cases, and legacy/back-compat last).
- **Honesty about proof.** Every case sits on exactly one rung of the proof ladder below, and carries the
  `file:line` proof chain a challenger can walk. Never imply a green run that didn't happen.
- **No secret values, anywhere.** This guide is shared. Name the setting, the file, and the account **role**;
  render credentials, tokens, keys, connection strings, and customer identifiers as `<redacted:…>`.

## The proof ladder (one rung per case — there is no fifth rung)

| Rung                | Means                                                                | Licence                                                            |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `✅ ran`            | The test was **executed this session**                               | The ONLY rung that may claim green. Record the command + pass/fail. |
| `⚠️ trace-verified` | Code read end-to-end, `file:line` chain complete, not executed       | Demo it live; say it was not run.                                   |
| `📄 spec-only`      | Asserted by a spec/TC; the code path was not traced                  | Weakest rung — say so explicitly.                                   |
| `❌ no coverage`    | No test exists for this case                                         | A reported gap. NEVER filled with a plausible ID.                   |

**Proof chain per case:** where the value is **written** → where it is **read** → where the presenter **sees**
it, `file:line` each. A chain with a missing link caps the case at `📄 spec-only`. A case that fits no rung is
a **stated blocker**, never a quiet promotion.

## Document structure

```markdown
# Demo Guide — {Feature name}

**Scope:** {feature} — resolved from {prompt | current working context | user-confirmed}
**Tier / story groups:** {S0–S4} · {n} groups
**Sources:** {spec path(s), test file(s), changed dirs, migration(s)} — {degradation rung landed on, if any}
**Governing spec / rules:** {spec file + rule IDs, if any}
**Investigation:** comprehension bar cleared per group — brief at `{path}` · Delegated: {`$investigate` — Story B mechanics | none}
**Cases:** {n} 🖥️ {main-channel label — `UI`, or the rung's primary surface} · {n} 🔧 technical (appendix) — {`no UI demo path` stories named, if any}
**Demo surface:** {front-end — or `No front-end in this project — primary demo surface is {API / CLI / library / background job}`}
**Deferred / not covered:** {named explicitly, or `none`}
**Audience:** {team / PO / QC / stakeholders}

## Story-group ledger

| Group | Story | Cases (main / technical) | Status |
| ----- | ----- | ----------------------- | ------ |
| G1    | {A}   | {n} / {n}              | written / pending |

---

## Story {A} — {user-facing capability}

> *As a {role}, I want {capability} so that {value}.*

**One-time demo setup:** {roles, configuration, seed data, which app/screen — staged via real paths}
_{`no UI demo path — technical only` — only when this story has no front-end demonstration at all}_

### {A1} — {short case title} · `{REAL-TC-ID(s)}` · 🖥️ {main-channel label}
- **Setup / preconditions:** {exact state to stage first, via real user paths; accounts by role, secrets `<redacted:…>`}
- **Demo steps:**
    1. {actor} {action} on {screen/endpoint} with {input}
    2. {next action}
    3. {observe/where to look}
- **Expected result:** {observable outcome, phrased as the discriminator vs old behaviour}
- **How the domain stores/changes data & solves it:** {what field/column/table/value is
  persisted or changed and by which entity/migration/handler `file:line`; then the rule/method/invariant
  that consumes it to produce the outcome, and why this storage makes the case correct — edge cases,
  legacy fallback, cross-tier parity}. _(If display-only: state "no storage change" and describe the
  computed representation that solves it.)_
- **Proof chain:** written `{file:line}` → read `{file:line}` → seen `{screen + file:line}`
- **Deeper confirmation (optional, non-UI):** {the DB/log/API check that also confirms this case — a runtime
  action, never a numbered demo step and never on the proof chain above. Omit the line when there is none.}
- **Proof:** {✅ ran `id` — `{command}` → {pass/fail} | ⚠️ trace-verified | 📄 spec-only | ❌ no coverage}

### {A2} — ...

---

## Story {B} — ...

[repeat]

---

## How the domain is stored / changed — summary

{One short paragraph per story: the persisted fields/migrations that make the story work, additive/nullable/
backfill status, and — for display-only stories — the canonical representation. This is the "data behind the
demo" the team should walk away understanding.}

## Main test-case quick reference

Main-channel cases only (🖥️) — technical cases are listed inside the appendix, never here.

| Story | Test case | What it proves | Proof rung |
| ----- | --------- | -------------- | ---------- |
| {A}   | {REAL TC-ID} | {one line}  | ✅ ran / ⚠️ trace-verified / 📄 spec-only / ❌ no coverage |

## Appendix — Technical demo (non-UI)

_Supporting evidence, not the demo. Every case here needs a surface a normal user/QC does not have (API client,
CLI, script, manual job trigger, DB query, logs, config). Same four parts and same proof rung as a UI case —
demoted in order and prominence only. Omit the whole section when every case is UI-demoable._

### {T1} — {short case title} · `{REAL-TC-ID(s)}` · 🔧 technical
- **Why non-UI:** {the surface it requires, and the story it supports}
- **Setup / preconditions:** {…, accounts by role, secrets `<redacted:…>`}
- **Demo steps:** {numbered — the tool/surface, the command shape (no secret values), what to observe}
- **Expected result:** {the discriminator}
- **How the domain stores/changes data & solves it:** {`file:line` anchored, same bar as a UI case}
- **Proof chain / Proof:** {written → read → seen} · {rung}
  _(No `Deeper confirmation` line here, deliberately: a technical case is already demoed on the non-UI surface,
  so the confirmation IS the demo. That line exists only to keep a non-UI check out of a UI case's numbered steps.)_

## Test-execution transparency

- **Proven this session:** {suites/cases actually executed + the command + pass/fail counts}.
- **Not executed:** {cases at ⚠️/📄 + why (runner blocker, environment)} — demo these live instead of via a green run.
- **No coverage:** {cases at ❌} — reported gaps, not staged as proven.
- **Blockers:** {cases that fit no rung, or preconditions that could not be staged} — stated, never omitted.

---

_Generated: {DATE} · Scope source: {source} · Evidence: {spec/test/migration paths}_
```

## Filling the "domain storage / solution" block (the distinctive value)

For each case, read the code — do not infer — and capture:

| Question | Where to look |
| -------- | ------------- |
| What field/column is persisted or changed? | entity / value object, DTO mapping, `*EntityConfiguration`, schema/migration file |
| Is the change additive / nullable / backfilled? | the migration `Up`/`Down`, default values, null-handling in readers |
| What value is actually written (anchored/computed)? | the command/handler that sets it; the domain method that computes it |
| Which rule consumes the stored data to solve the case? | the reader/derivation/gate/resolver method + its callers |
| Why is this storage correct (edge cases, legacy, parity)? | fallback branches, cross-tier/mirror logic, invariants pinned by tests |

State it in plain team language, but keep the `file:line` anchors so anyone can verify.

## Scope-resolution candidates (Step 0.1 helper)

When the prompt is empty and you must derive scope, gather candidates from — in order — the active
task/workflow goal, `git status`/`git diff`, branch-vs-main commits, and in-progress plans/specs/release
notes. If still ambiguous, present the top 2-4 as ask the user directly options plus free-text; never auto-pick.

## Translation notes (`--lang`)

Translate prose only. Keep verbatim: code identifiers, file paths, `file:line`, `TC-*` / test IDs, numeric
values (hours, offsets, dates), and command snippets. Put the translated copy alongside the English one
(e.g. `{name}.{lang}.md`) so the team can cross-reference.

## HTML runbook (`--html`)

Only after the markdown is approved, follow the host's Artifact flow to render a self-contained runbook
(inline CSS/JS, theme-aware, favicon). Keep it a faithful render of the markdown — same stories, steps,
expected results, and storage explanations.
