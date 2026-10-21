# Learn — invocation examples

> Read when the user asks how to use `$learn` or you need an example invocation; the subcommand behaviour itself is defined under Behavior in `SKILL.md`.

## Usage

### Add a lesson

```
$learn always use the validation framework fluent API instead of throwing ValidationException
$learn never call external APIs in command handlers - use Entity Event Handlers
$learn prefer async/await over .then() chains
```

### Add a skill-specific lesson (routes to a `$project-skill-protocol` overlay)

```
$learn when reviewing changes, always check that migration scripts are idempotent
$learn $plan should always include a rollback step
```

### Add a project-wide rule or context note (routes to the root `CLAUDE.md` when it qualifies)

```
$learn in this repo every new module needs an entry in the module registry before any other change
$learn the term "tenant" always means the billing account here, never a user group
```

### List lessons

```
$learn list
```

### Remove a lesson

```
$learn remove 3
```

### Clear all lessons

```
$learn clear
```
