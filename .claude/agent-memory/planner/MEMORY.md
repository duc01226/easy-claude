# Planner Agent Memory

## Copilot Instructions Architecture
- `.github/copilot-instructions.md` is the auto-loaded filename (not `common.copilot-instructions.md`)
- `.github/instructions/*.instructions.md` files use `applyTo` YAML frontmatter for path-specific loading
- `workspace.copilot-instructions.md` was referenced in settings but never existed
- Sync script: `.claude/scripts/sync-copilot-workflows.cjs` manages auto-generated sections
- `codeGeneration.instructions` VS Code setting is deprecated in favor of instructions/ folder

## Plan Structure Patterns
- Plan dir naming: `plans/YYMMDD-HHMM-{slug}/`
- plan.md must be <80 lines with YAML frontmatter
- Phase files need: Context, Overview, Key Insights, Requirements, Alternatives (min 2), Design Rationale, Implementation Steps, Todo list, Success Criteria, Risk Assessment
