> **Translation Sync Check** — Verify multilingual UI changes include translation updates.
>
> 1. Determine multilingual mode from project config: `localization.enabled === true` and `supportedLocales.length > 1`
> 2. Detect UI-facing file changes via extensions/path patterns (`.ts`, `.tsx`, `.html`, `.css`, `.scss` plus `localization.uiPathPatterns` when configured)
> 3. For multilingual UI changes, verify translation resource diffs exist (`localization.translationFilePatterns` when configured)
> 4. If translation updates are missing → **MANDATORY**: use `AskUserQuestion`: "UI text changed in a multilingual project, but translation updates were not detected. Run translation sync now or proceed with explicit risk acceptance?" Options: "Run translation sync first" (Recommended) | "Proceed with explicit risk acceptance"
> 5. Severity: **HIGH** — no silent pass for multilingual UI text changes without explicit translation-sync decision
>
> **Do NOT silently skip. Multilingual UI text changes require explicit translation-sync confirmation.**
