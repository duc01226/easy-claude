# Project config — §2r convention classes

> Read when useful context groups or opt-in convention injection are selected.

### 2r. Convention Classes — Detect & Merge (NEVER clobber)

Per-file convention classes tell the AI which rules, skill protocols and reference docs apply when it reads or edits a file (hook `file-convention-inject.cjs`; CLAUDE.md "Automatic Skill Activation" table + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` for a shell read). Run this optional detector only when useful context groups or opt-in convention injection are selected. If run, do so after the selected config areas so it sees their final evidence-backed values. (`docsRoots` is deliberately NOT a detection input: no context group is keyed off a `docsRoots` value.)

```bash
node .claude/hooks/lib/convention-merge.cjs --detect --merge            # dry run: added / refreshed / kept
node .claude/hooks/lib/convention-merge.cjs --detect --merge --write --enable   # apply + conventionInjection.enabled=true
node .claude/hooks/lib/file-conventions.cjs --lookup <sample-path>      # verify what a file would receive
```

- Detection is stack-agnostic: it derives classes (`feature-spec`, `integration-test`, `e2e-test`, `test`, `backend`, `frontend`, `styling`, `general-code`) only from existing config keys and keeps only docs/skills that exist on disk.
- Merge is additive: a new class is ADDED with `origin: "detected"` + `detectedFingerprint`; a maintainer class (no/other origin) or an edited detected class (fingerprint no longer matches) is KEPT byte-identical; only an unedited detected class is REFRESHED. Nothing is ever removed.
- `--write` replaces the config atomically (temp + rename) and re-serializes it as 2-space JSON, so formatting may change even when no class did; content is unchanged unless the summary reports `added`, `refreshed` or a switch flip. Precedence: `priority` ascending (100 specific · 500 default · 900 general), ties by declaration order; earlier section wins on conflict.
- Opt-in only: `--enable` belongs to this explicit setup run; upgrades and hooks never flip it (in an existing config, absent `conventionInjection` ⇒ disabled, silent; only a project with NO config file gets the built-in `ui-ux-gate` and `ai-feature-gate` fallback), and it never overrides a maintainer's explicit `enabled: false` (reported as `enableSkipped`).
