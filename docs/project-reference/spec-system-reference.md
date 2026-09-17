# Spec System Reference

> Project-specific extension for local spec routing and ownership. Shared AI-SDD principles live in `shared/sdd-artifact-contract.md`; keep this file focused on local paths, owners, configured spec roots, and generated-artifact rules.

## Quick Summary

Use this file to answer where specs live, which artifact is canonical, where test cases are stored, and which generated spec aids are safe to refresh.

## 1. Configured Spec Roots

Primary config source: `docs/project-config.json`. Resolve every root below from it before assuming a location — the literal named in each line is the default, not a guarantee.

- Business/feature spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
- Derived technical spec root — default `docs/specs-technical/`; a `specRoots.technical.path` entry in `docs/project-config.json` overrides the path
- Feature template: `workflowPatterns.featureDocTemplate`

Each root also declares its SEMANTICS, not just its location, so a consumer can tell an authored tree from a generated one without inspecting the files. Authorship and M1 policy travel WITH the configured path — relocating a root moves its rules with it, it does not reset them:

| Root                  | `authorship` | `m1Policy` | Owner                                                                                                   |
| --------------------- | ------------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| `specRoots.business`  | `authored`   | `enforced` | humans + `/spec` — M1 (no tech leakage in prose) applies                                                |
| `specRoots.technical` | `derived`    | `exempt`   | `/tech-spec` generator only — it is a projection OF code, so naming code in it is the point, not a leak |

**A root is declared whole or not at all.** A partial `specRoots` entry is an ERROR, not a silent per-field default: declaring the path without its companion fields fails validation rather than half-resolving. Declare nothing and every root resolves to the default above, byte-identically to a project that never configured anything.

When this `.claude` folder is copied to a new project, relocate a root by declaring it in `docs/project-config.json` — never by editing the literals in prose or code. The reversal of the former fixed-root rule, what it cost, and the fail-closed validation / fail-soft runtime split are recorded in ADR-0003 (`0003-config-driven-doc-and-spec-roots.md`, under the ADR root declared by `docsRoots.adr.path` in `docs/project-config.json`).

## 2. Canonical Artifact

One capability should have one canonical Feature Spec under the configured business spec root:

```text
<business-spec-root>/{Bucket}/README.{FeatureName}.md
```

`<business-spec-root>` is whatever `specRoots.business.path` resolves to; the bucket-and-README grammar after it is fixed and does not vary by project.

The Feature Spec is the business-facing source of truth. Code is the technical source of truth. **Do not create a parallel authored spec tree.** There is exactly ONE authored spec tree per project, and moving it is a config change, not a second tree — relocating `specRoots.business.path` moves the authored tree, it never adds one.

**The derived technical spec root is not an exception to that rule** — default `docs/specs-technical/`, overridden by a `specRoots.technical.path` entry in `docs/project-config.json`. It is not a parallel _authored_ tree. It is a regenerable **view** projected from annotated tests and source by `/tech-spec`; every file in it carries a `DERIVED` banner and the generator refuses to run if any file there lacks one. Nothing in it is a source of truth, and hand-editing it is the one thing it is designed to prevent. The prohibition above targets a second place where business intent is _authored_; a generated projection creates no second author.

## 3. Test Case Registry

Test cases live in the Feature Spec's Test Specifications section.

Default TC format:

```text
TC-{FEATURE}-{NNN}
```

Keep each TC mapped to the business rule, invariant, or observable outcome it protects.

## 4. Derived Artifacts

Indexes, ERDs, dashboards, reimplementation guides, mirrors, and the whole `specRoots.technical` tree are derived aids. They must be regenerated from canonical Feature Specs or source code through their owning scan/sync command.

Do not hand-maintain derived outputs as a second source of truth. A derived tree never becomes canonical, wherever it is configured to live.

## 5. Required Companion Docs

Read these together when the task touches specs, test cases, or behavior-changing work. Each file below sits in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

- `feature-spec-reference.md` - Feature Spec structure and authoring rules
- `spec-principles.md` - spec quality, evidence, and tech-agnostic prose rules
- `workflow-spec-test-code-cycle-reference.md` - local sequence for keeping specs, tests, code, docs, and generated mirrors synchronized
- `docs-index-reference.md` - project doc router

## 6. Local Extension Rule

Add only project-specific paths, owners, formats, and generated-artifact conventions here. Put reusable AI-SDD rules in `shared/sdd-artifact-contract.md` and sync generated mirrors through the configured sync command.
