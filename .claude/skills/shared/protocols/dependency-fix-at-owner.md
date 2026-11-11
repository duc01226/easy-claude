> **Dependency Fix at Owner** — Fix a vulnerable or outdated dependency where its version is decided, research every version the change moves, and prove the result with the project's own scanner.
>
> 1. **Trace the owner chain** — for each advisory, find the path from a declared package to the vulnerable one with the package manager's own "why" command (per-ecosystem commands: `.claude/skills/package-upgrade/references/ecosystems.md`). The owning parent is the nearest package whose declared range or release decides the version; a declared package owns itself.
> 2. **Try the routes in order** — (a) refresh the lock within the ranges already declared; (b) upgrade the owning parent to a release that brings the fix; (c) force the indirect version temporarily, resolve, then remove the force; (d) only when no route delivers the fixed version, accept the advisory. Record why each earlier route could not.
> 3. **Forces are temporary; accepted entries expire** — a force the resolved tree still needs, and every accepted advisory, gets a reason, an owner and an expiry in the scanner's own suppression file, or beside it in the project's own record when the scanner has no such field. An entry missing any of the three is not accepted.
> 4. **Reachability lowers priority only** — evidence that vulnerable code is not reached changes the ranking; it never closes or accepts an advisory by itself. Call analysis is weak or absent for dynamic languages.
> 5. **Research every moved package** — derive the moved list from the difference between the lock before and after, not from the declared packages. Cite a release note or changelog and give a verdict for each before approval. A breaking change that reaches the project gets a code fix and a test that fails without it.
> 6. **Done means a clean re-scan** — run the project's scanner on the changed tree; only accepted entries may remain. Anything else returns to step 1 for that advisory. No runnable scanner means blocked, never done.
>
> **BLOCKED until:** `- [ ]` Owner chain per advisory `- [ ]` Route chosen with the reason earlier routes failed `- [ ]` Forces removed, or accepted with reason, owner and expiry `- [ ]` Every moved package researched with a cited source `- [ ]` Clean re-scan
>
> **Anti-patterns (REJECT these):**
>
> - "Pin the leaf" while a parent route exists — nobody updates the pin, and it can later become the vulnerable version itself.
> - "Unreachable, so ignore it" — weak evidence in dynamic languages; it lowers priority only.
> - "Only a patch bump, so it is safe" — version numbers are a promise, not proof; read the release notes of every moved package.
> - "Suppress until further notice" — an entry with no expiry is permanent.
