# Researcher Agent Memory

## project-config.json Architecture
- Location: `docs/project-config.json`
- Loader: `.claude/hooks/lib/project-config-loader.cjs` — exports `loadProjectConfig()`, `buildRegexMap()`, `buildPatternList()`
- Loader returns `{}` on failure (fail-open) — no hook crashes, but hooks silently no-op
- 7 consumer hooks: backend-csharp-context, frontend-typescript-context, design-system-context, scss-styling-context, search-before-code, code-patterns-injector, subagent-init
- **4 CRITICAL fields** (no fallback — removal silently disables hook): `backendServices.patterns`, `frontendApps.patterns`, `designSystem.appMappings`, `scss.patterns`
- **Safe to rename** (have hardcoded fallbacks): `framework.backendPatternsDoc`, `framework.frontendPatternsDoc`, `framework.searchPatternKeywords`, `designSystem.docsPath`, `frontendApps.frontendRegex`
- Full dependency map: `plans/260302-1250-project-config-v2-universal-schema/research/researcher-01-hook-dependencies.md`
