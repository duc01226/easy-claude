# Seed Test Data Reference

<!-- Last scanned: 2026-08-04 -->

> **Goal:** State the verified seed-data capability of this repository without inventing application or database conventions.

> **Context:** easy-claude ships framework skills, hooks, agents, and workflows. Its configured modules are framework libraries, and database, messaging, API, and infrastructure maps are empty (`docs/project-config.json:23-73`, `docs/project-config.json:149-152`).

## Quick Summary

- Application/dev-data seeding is **N/A** in this repository.
- Hook-test fixtures are committed test inputs, not persistent seed data.
- Re-scan this reference if an application database or executable seeder is added.

## Workflow

1. Read the `contextGroups`, `databases`, and `infrastructure` maps in `docs/project-config.json`.
2. Search executable source for seeder declarations, gates, count loops, scope helpers, registration, and polling.
3. Document a pattern only after an executable seeder and its consumers are verified.

## Key Rules

- **NEVER** treat workflow skills or test fixtures as application data seeders.
- **NEVER** copy the generic seeder template into this reference without project source evidence.
- **MUST** rerun `/scan --target=seed-test-data` after introducing a database-backed application or seeder.

## Seeder Base Class / Interface

**N/A.** No `Data Seeders` context group is configured; the only context groups cover hooks, skills, and agents (`docs/project-config.json:74-105`).

## Environment Gate

**N/A.** No seeder enable flag, environment guard, or target-count key is configured (`docs/project-config.json:74-152`).

## Idempotency Pattern

**N/A.** There is no persistent application store or executable seeder loop to make restart-safe (`docs/project-config.json:149-152`, `package.json:2-18`).

## DI Scope Pattern

**N/A.** No dependency-injection container, unit-of-work layer, database, or application service is configured (`docs/project-config.json:23-73`, `docs/project-config.json:149-152`).

## Registration

**N/A.** Project context registration covers hooks, skills, and agents only; it contains no seeder registration (`docs/project-config.json:74-105`).

## Cross-Service Wait

**N/A.** No service, message bus, or external-consistency seeding flow is configured (`docs/project-config.json:149-152`).

## Anti-Patterns

No source-backed seeding violation exists because no executable seeder exists. Do not invent a warning from a generic stack assumption.

## Closing Reminders

- **MUST** cite the real seeder entry point and registration before documenting future conventions.
- **MUST** verify environment gating, idempotency, and scope behavior from executable source.
- **NEVER** convert an evidence-backed **N/A** into generic seeder boilerplate.

> **Goal:** State the verified seed-data capability of this repository without inventing application or database conventions.
