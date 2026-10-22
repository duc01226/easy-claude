# Brainstorm — Multi-Opportunity Discovery Mode

> Read when Phase 0.1 selects the Multi-opportunity discovery scenario. It replaces Phase 6's single recommendation with a ranked, multi-selected opportunity map.

## Multi-Opportunity Discovery Mode

**When to use:** a broad vision, problem statement, or "explore this whole area" brief expects several distinct, independently shippable opportunities, each becoming its own downstream task. This is the mode driven by `workflow-planned-work`'s **MULTI-OPPORTUNITY DISCOVERY MODE**.

**How convergence differs:** the default flow produces ONE opinionated recommendation (Phase 6); this mode does NOT. Use the SAME Phase 4 techniques (RICE / Kano / 2×2) to **RANK and present 3–8 distinct opportunities**, not a single winner. The user then multi-selects opportunities to develop; choosing one would discard downstream tasks.

**Technique flow:** run Phases 1–4 normally (problem framing → opportunity framing → ideation → convergence). In Phase 2, use JTBD / Opportunity Solution Tree to surface the FULL landscape, not one focus; in Phase 4, use RICE / Kano / 2×2 to SCORE and RANK every distinct opportunity instead of collapsing to one recommendation.

**Output contract (must match what `workflow-planned-work` consumes):**

- An **opportunity map of 3–8 distinct, RICE-scored opportunities**, ranked descending by RICE.
- Documented in **`plans/{plan-dir}/brainstorm-opportunity-map.md`** (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
- Each opportunity carries: a one-line problem/value framing, RICE components (Reach × Impact × Confidence / Effort) + RICE score, and (where known) a Kano class — so each can seed a downstream task.

```markdown
# Opportunity Map: [Vision/Problem]

| Rank | Opportunity | Problem/Value (1 line) | Reach | Impact | Confidence | Effort | RICE | Kano |
| ---- | ----------- | ---------------------- | ----- | ------ | ---------- | ------ | ---- | ---- |
| 1    | ...         | ...                    | 1000  | 2      | 0.8        | 5      | 320  | Delighter |
| 2    | ...         | ...                    | ...   | ...    | ...        | ...    | ...  | ...  |
```

**Multi-select handoff:** present the ranked map with `ask user question tool` and `multiSelect: true`: "Which opportunities should we develop into tasks?". Selected opportunities feed `workflow-planned-work`'s **per-opportunity task loop** (initiative → work-item --mode=refine → task review → challenge → work-item --mode=story → DoR, then cross-task prioritization and the UI block in the main session). Do NOT author tasks, specs, or plans here; the deliverable is only the scored, multi-selected map.
