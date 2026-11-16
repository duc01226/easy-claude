# Project config — §2w architecture rules

### 2w. Architecture Rules — Fill `architectureRules` From Evidence

`architectureRules` records which layers of the code must not import from which others. Reviewers check changed files against it, and `$linter-setup` turns it into a tool rule that fails in lint and CI.

**Rules first:**

- **Never invent a boundary.** Every layer and every `cannotImportFrom` entry cites evidence. Folder names alone (`domain`, `infra`) are not evidence.
- **Preview, then merge on the user's yes,** then validate. A boundary binds every future change, so the team decides it.
- **A rule only reviewers read is advice.** Offer `$linter-setup` to enforce it with a real tool and record `enforcedBy`.

**Evidence, strongest first:**

1. **An existing boundary tool config** (dependency rules, import contracts, architecture tests). Translate its rules; when it already runs in lint or CI, record it as `enforcedBy` too.
2. **Accepted decisions and architecture docs** (ADRs, a dependency-rules doc) that state an allowed direction.
3. **The import graph.** Folders that act as layers and whose imports already go one way. Count both directions: a direction with no reverse import is a candidate; one with a few reverse imports is a candidate only on the user's yes, and those imports go into the tool's baseline, never silently allowed.

**Steps:**

1. Gather candidates from the sources above, each with its evidence (`path:line`, or the import counts in each direction).
2. Map them onto the schema (`node .claude/hooks/lib/project-config-schema.cjs --describe` for exact names): `layer` is a name that appears in import paths; `paths` are glob patterns; `cannotImportFrom` lists layer names; `excludePatterns` covers generated or framework code.
3. Show the candidate block with its evidence and reverse-import counts, and ask in plain words, for example: "These folders already depend on each other in one direction. Record that as a rule, so a change that breaks it is flagged?" Merge only what the user accepts, then validate.
4. Offer `$linter-setup` (Architecture Fitness), recommended first when no tool enforces the rules yet: it generates the tool config from `layerBoundaries`, baselines today's violations and records `architectureRules.enforcedBy` (`tool`, `config`, optional `command`).
5. No layers with a dependency direction → omit `architectureRules` and record `N/A — no layers with a dependency direction found`.

`layerBoundaries` stays the one place to change a rule: edit it here, then regenerate the tool config through `$linter-setup`.

```json
{
  "architectureRules": {
    "layerBoundaries": [
      {
        "layer": "domain",
        "paths": ["src/domain/**"],
        "cannotImportFrom": ["infrastructure", "api"]
      }
    ],
    "excludePatterns": ["**/generated/**"],
    "enforcedBy": {
      "tool": "<chosen boundary tool>",
      "config": "<generated tool config path>",
      "command": "<boundary check command>"
    }
  }
}
```
