# Workflow Spec Test Code Cycle Reference

> Project-Specific Workflow Extension for the local workflow sequence that keeps specs, tests, code, docs, and generated mirrors aligned.

Read `.claude/skills/shared/sdd-artifact-contract.md` when resolving reusable spec and artifact rules. This file records only local workflow ordering, local commands, and local closure gates. It is read alongside `AGENTS.md` when Codex needs project-specific workflow context.

## 1. Local Workflow Sequence

Use this local workflow sequence when behavior, public contracts, specs, tests, docs, or generated prompt surfaces can change:

1. Identify the intended behavior and unchanged behavior to preserve.
2. Update the local spec or feature artifact through its configured owner.
3. Update test specifications or test fixtures that guard the behavior.
4. Implement code or documentation changes at the responsible layer.
5. Refresh required generated mirrors and indexes through their owning sync or scan command.
6. Complete the static review and fix loop over the settled changeset before verification.
7. Run the configured full affected suite on the final tree. Read `SYNC:verify-last-order` in `.claude/skills/shared/sync-inline-versions.md` for mutation proof, failure classification, bounded fix/reverify/re-review, and the refactor-baseline and standalone-review exceptions. An edit after a green run invalidates that result.

## 2. Local Artifact Owners

- Project config: `docs/project-config.json`
- Project docs index: `docs-index-reference.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path
- Root instruction mirror: `AGENTS.md`
- Shared reusable contract: `.claude/skills/shared/sdd-artifact-contract.md`

## 3. Local Closure Gates

Before closing a workflow:

- Required project-reference docs exist through the standard initialization path.
- Generated docs indexes and prompt mirrors are refreshed through scan or sync commands.
- Test fixtures used by committed tests are present in the repository.
- Applicable final-tree verification commands have observable output, and no later edit invalidates the result.

## 4. Local Extension Rule

Do not copy reusable workflow rules into this file. Add only local sequence details, configured commands, artifact ownership, and project-specific closure gates.
