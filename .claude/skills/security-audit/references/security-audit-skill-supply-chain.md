# Security audit — D3 Dependency & Supply-Chain Security (all package ecosystems)

> Read when D3 is in scope: `deps`, `vet`, `full`, or `changes` with a manifest or lockfile change.

> Modern reality: malicious packages execute AT INSTALL TIME via lifecycle scripts with your full user privileges (`~/.ssh`, `~/.aws`, every env var). Self-propagating npm worms (Shai-Hulud, 2025) steal publish tokens and republish themselves. "It's on npm/GitHub" is NOT trust.

**Install-time execution audit:**

- [ ] List every dependency with lifecycle scripts (`preinstall`, `install`, `postinstall`, `prepare`):

```bash
# npm — inspect before/after install
npm pkg get scripts                                  # current package
grep -rl --include=package.json -E '"(pre|post)?install"|"prepare"' node_modules | head -50
```

- [ ] **Red flag combo:** dependency that is BOTH new to the lockfile AND has an install script → manual review before merge
- [ ] Non-script execution vectors: `binding.gyp` in JS-only packages (node-gyp runs attacker code), `.targets`/`.props` in NuGet, `setup.py` arbitrary code in pip
- [ ] Recommend hardening: `ignore-scripts=true` in `.npmrc` (+ explicit allowlist), release cooldown (`minimum-release-age=7` on npm ≥11.10 — most attacks live in the first days after publish)

**Lockfile & version integrity:**

- [ ] Lockfile committed; CI uses `npm ci` (never bare `npm install`)
- [ ] Lockfile diff review: `resolved` URLs must point to the official registry — off-registry URLs = finding
- [ ] Versions pinned; no `*` / overly-wide ranges on security-sensitive packages
- [ ] After any disclosed incident: check lockfile for known-compromised versions

**Vulnerability & reputation scan:**

- [ ] Read the project's existing scanner result first: the CI or scheduled scan job, or the scanners declared in `docs/project-config.json` → `dependencySecurity.scanners`. Otherwise run, for every ecosystem the repository uses, the scanner rows of `.claude/skills/package-upgrade/references/ecosystems.md` (the one owner of per-ecosystem commands; do not keep a second list here).

- [ ] Typosquatting: new dependency names one edit away from popular packages (`lodahs`, `plain-crypto-js`)
- [ ] Compromise signals: maintainer published many packages within seconds, `latest` dist-tag jumped majors abruptly, package repo link dead or code mismatch with GitHub source
- [ ] Outdated packages with known exploits prioritized by reachability (is the vulnerable API actually called? — grep/read the callers; an optional graph `callers_of` may add hints)
- [ ] Reachability lowers priority only: it never closes or accepts an advisory by itself (`dependency-fix-at-owner`, read `.claude/skills/shared/protocols/dependency-fix-at-owner.md`). Static reachability is weak for dynamic languages.

**Remediation:** this audit reports. When the user asks for the vulnerable packages to be fixed, hand the findings to `/package-upgrade --mode=remediate`, which fixes each advisory at the package that owns it and proves the result with a re-scan.
