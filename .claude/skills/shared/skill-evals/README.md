# Versioned skill behavior corpus

`corpus.v1.json` contains positive, negative and ambiguous activation cases and pressure/repair cases. The corpus version changes whenever prompts, fixtures or rubrics change. These cases are scoped probes, not proof of all skill behavior or a substitute for runtime safety gates. Coverage of the whole catalog is a known, recorded limit (`.claude/docs/framework-review-guide.md` → Known limits). Add cases first for skills whose activation or behavior changed: a case states the intended boundary even before a runner executes it, so write it with the change and take each expectation from the explicit boundary the skill descriptions state. A changed skill without a case is a recorded gap, not a new finding.

Validate its structure without network access or dependencies:

```bash
node .claude/skills/shared/skill-evals/validate.mjs
```

Use an externally supplied model runner to execute a selected case twice in fresh isolated contexts. Keep the exact prompt and fixture, model/version, host/version, model settings/seed, tools and non-skill context identical. Use synthetic throwaway fixtures, simulated search/approval/closure tools and no Git writes or real external messages. Materialize any described source/spec/query fixture deterministically, save it with the result, and hash the exact prompt and fixture bytes. Never treat fixture facts as real research findings. Fixtures must include the evidence required by each assertion, including explicit accepted/rejected closure outcomes and the described query rows or changed-owner mappings.

- `withoutSkill`: provide no target skill descriptions, content, hook-injected protocols, or leaked summaries. Record empty `skillHashes` and `loadedSkills`. Shared non-skill host policies remain identical across arms.
- `withSkill`: make only the case’s named skills discoverable with their current descriptions; allow loading their instructions. Hash each exact delivered skill package (root plus any loaded references/protocols, ordered path + byte content) in `skillHashes`. Record actual selections in `loadedSkills`. Activation cases must not force invocation. Repair cases may start at the supplied lifecycle state rather than repeat unrelated upstream work; document this fixture boundary.
- Record real outputs and tool traces. A reviewer grades every assertion with `passed: true|false` and a precise output/trace location in `evidence`. Activation grade also checks `expectedActivation`; null means none of the candidate skills is appropriate. A valid record may contain failures; never turn schema validation into a PASS verdict.
- Repeat pairs with documented seeds or repeated runs to assess variability. Report paired differences, failure counts, actual latency/tokens/cost where available, and confidence limits. An already-correct baseline is valid and must not be manufactured into a failure. Retest when skill package, model, host or tool runtime changes. Broader coverage needs new cases.

Result envelope:

```json
{
  "schemaVersion": 1,
  "corpusVersion": "1.1.0",
  "pairs": [{
    "caseId": "activation-positive",
    "reviewer": "reviewer identifier",
    "taskHash": "sha256 of exact prompt bytes",
    "fixtureHash": "sha256 of materialized fixture bytes",
    "withoutSkill": {
      "observedAt": "ISO timestamp",
      "runtime": {
        "model": "provider/model",
        "modelVersion": "pinned version",
        "host": "host name",
        "hostVersion": "host version",
        "settingsHash": "sha256",
        "toolsetHash": "sha256",
        "contextHash": "sha256 of identical non-skill context"
      },
      "skillHashes": {},
      "loadedSkills": [],
      "outputArtifact": "path to real output and trace",
      "checks": [{"assertion": "exact corpus assertion", "passed": false, "evidence": "trace location"}],
      "measurements": {"tokens": 0, "latencyMs": 0}
    },
    "withSkill": {
      "observedAt": "ISO timestamp",
      "runtime": "same runtime object as baseline",
      "skillHashes": {"knowledge-synthesis": "sha256 of delivered package"},
      "loadedSkills": ["knowledge-synthesis"],
      "outputArtifact": "path to real output and trace",
      "checks": [{"assertion": "exact corpus assertion", "passed": true, "evidence": "trace location"}]
    }
  }]
}
```

This explanatory envelope uses placeholders and abbreviated checks; it is not a result file. Replace metadata with observed values and include every case assertion in both arms. Measurements are optional; never invent missing cost or time. Validate observed records with:

```bash
node .claude/skills/shared/skill-evals/validate.mjs .claude/skills/shared/skill-evals/corpus.v1.json path/to/results.json
```

## Routing evals

Cases with a `routing` object measure where a prompt is routed, not whether a skill helps: a catalog workflow, a skill, a custom-simple route or a direct answer. `routing.audience` is `novice` (the first prompt of a session) or `mid-session` (`priorPrompts` are earlier turns of the same session); `routing.acceptedRoutes` lists the routes that pass; `routing.fixtureFiles` is the synthetic project the case runs in. Run them on demand, never in the hook suite or CI:

```bash
node .claude/skills/shared/skill-evals/run-routing-evals.mjs                     # dry plan: nothing runs
node .claude/skills/shared/skill-evals/run-routing-evals.mjs --run --max-cases=3  # costs model tokens
```

- **Host:** the logged-in host CLI (`--host=claude|codex`, `SKILL_EVAL_HOST_BIN`, `SKILL_EVAL_MODEL`), started read-only with the argv and allowlisted environment of `.claude/scripts/skill-activation-eval.mjs`. A host whose `--version` fails is reported `ENVIRONMENT-BLOCKED` (exit 3) and nothing runs.
- **Cap:** `--max-cases` (default 3) and at most 12 host runs per invocation (cases × `--runs`).
- **Fixtures:** each case runs in a throwaway project in the OS temporary folder, outside every repository so no ancestor instruction file reaches it: the framework's tracked files (tests excluded) plus the case's synthetic files. No project data, project config or Git history; deleted after the run unless `--keep-fixtures`.
- **Observed route:** a workflow the run started, else the `Route:` line declared in the last turn, else a started skill, else `undeclared`. Mid-session cases replay earlier turns in one session (Claude only; skipped on Codex).
- **Suggest-only:** the report (`tmp/reports/skill-evals/routing-<time>.json`: host version, model, per-case routes, accuracy, tokens and cost when the host reports them) states what happened; a wrong route is a finding for the framework owner, never acted on automatically. Record the first run as the baseline and judge later prompt or routing changes by the delta.

The validator checks provenance and paired record structure only. It does not run a model, verify claims inside traces or claim skill effectiveness. No live result ships with this corpus. Keep observed outputs and reports under the consuming project’s temporary report directory, not inside the shipped corpus.
