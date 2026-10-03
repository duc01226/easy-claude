## Mode: Review (seed-data convention audit)

> **Invoke with `--mode=review`.** READ-ONLY audit of a seeder target against EVERY [Universal Seed Data Rule](../SKILL.md#universal-seed-data-rules) AND the project-specific seeder conventions. Produces a per-principle PASS/FAIL with `file:line` evidence. This mode makes **NO code changes** — it reports findings and routes confirmed defects back to Generate mode for the fix.

### R0 — Resolve the review target

Determine WHAT to review, in priority order:

1. **Explicit target in the user prompt** — a named seeder file / class / feature area → review exactly that.
2. **Else → current changes** — `git diff --name-only` plus staged (`git diff --cached --name-only`) and untracked, filtered to seeder files using the discovered seeder naming (Step 1 / reference doc). Review every changed or added seeder.
3. **Else → current work-context result** — the seeder(s) created or edited earlier in THIS session / work context.

If none resolve → ask the user which seeder to review. NEVER assume a target.

### R1 — Read the conventions BEFORE reviewing (BLOCKING)

MUST ATTENTION read, in full, before forming ANY verdict:

- `seed-test-data-reference.md` (project-reference docs root — default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) — project seeder locations, base class, env-gate key, count config key, DI/UoW scope strategy, Required Patterns, Verification Checklist.
- `docs/project-config.json` → `Data Seeders` context group — configured source roots, naming conventions, run commands.
- The [Universal Seed Data Rules](../SKILL.md#universal-seed-data-rules) (1–8) in this skill — the principles being graded.
- The target seeder file(s) themselves — re-read in full; NEVER review from memory.
- Step 1 discovery: confirm the project's ACTUAL seeder base class, env-gate key, and count key with `file:line` — the review grades against THESE, not generic defaults.

> If the reference doc is still a skeleton (`TODO` placeholders), say so explicitly, grade against discovered `file:line` conventions instead, and raise the missing/incomplete project reference as its own finding.

### R2 — Review checklist (grade EVERY item: `file:line` evidence or FAIL)

**Universal rules:**

- [ ] **Environment gate is the FIRST check** — dev/enabled-config only, NEVER production.
- [ ] **Command-based** — domain entities created ONLY via application-layer commands; ZERO direct repo/DB writes.
- [ ] **No duplicated logic** — seeder feeds realistic inputs; commands own validation / domain / event side-effects.
- [ ] **Idempotency** — count-before-seed gate present; running N times converges to target (no duplicates).
- [ ] **Count-configurable** — count read from the discovered config key; NEVER hardcoded (zero → no-op).
- [ ] **Restart-safe loop** — loop starts at `existing_count`, NEVER 0.
- [ ] **Scoped DI per iteration** — fresh scope per loop iteration; no shared DbContext/session.
- [ ] **Real-world reachable state** — every seeded entity is a state the application itself could produce; any direct store write fabricating an otherwise-unreachable state carries a comment justifying WHY it is legitimate; seeded entities carry plausible relative timing, not one shared instant.
- [ ] **Spec-consistency** — every seeded scenario satisfies the §5 invariants; any encoded domain rule (precondition / status / default) is reflected in the spec (and tests where testable), not seeder-only.
- [ ] **Run identity and public-path setup** — every run has a unique reusable identity, keyed synthetic values, and supported application-path arrangement.
- [ ] **Accumulation and integrity** — `target` vs explicit `additive` mode is declared; additive runs preserve prior data and prove before/created/after counts, unique keys, command success, and invariant/reference integrity.
- [ ] **Redacted evidence** — reports/logs expose only safe identifiers and exact counts/status; credentials, tokens, headers, connection strings, PII, and full payloads are redacted.

**Project-specific conventions (from the reference doc):**

- [ ] Seeder lives in the configured folder and extends the project's discovered base class / interface.
- [ ] Registered via the project's documented DI / registration mechanism.
- [ ] Env-gate key + count key match the documented keys AND exist in dev config.
- [ ] Seeder marker (email/name prefix, created-by, dedicated flag) is deterministic across restarts.
- [ ] Conforms to the reference doc's Required Patterns + Verification Checklist.

### R3 — Verdict

Per item: **PASS / FAIL / N/A** with `file:line` evidence and confidence (>80% required to assert a FAIL; <60% → "insufficient evidence", verify before grading). Overall verdict is **PASS only if ZERO universal-rule FAILs**.

- **PASS** → report the evidence table; if idempotency/count tests are absent, suggest `$integration-test`.
- **FAIL** → list each violation with the responsible `file:line` and the correct pattern (from the [Anti-Patterns](../SKILL.md#anti-patterns) table / reference doc). Route the fix back through **Generate mode** (Phase 0 → "Fix broken"); after the fix lands, RE-RUN `--mode=review` over the changed code. NEVER edit the seeder inside review mode.

### Review-mode task plan (task tracking — required)

1. Resolve the review target (prompt → current changes → work-context).
2. Read `seed-test-data-reference.md` + project-config `Data Seeders` group + Universal Rules + the target file(s).
3. Discover/confirm base class, env-gate key, count key with `file:line` evidence.
4. Grade every universal + project-specific checklist item (R2).
5. Produce the PASS/FAIL verdict with per-item `file:line` evidence (R3).
6. If FAIL → hand confirmed defects to Generate mode and re-review after the fix; else report PASS + next-step suggestion.
7. Analyze AI mistakes & lessons learned.

---

