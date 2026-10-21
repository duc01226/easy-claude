# Project config — §2v Windows native Git/Git Bash capability

> Read when the task declares or changes `hooks.windowsGit`.

### 2v. Windows native Git/Git Bash capability

The optional `hooks.windowsGit{ enabled, autoRepair }` section is consumed by
the same `verify-install.cjs` SessionStart owner. Omitted values default to
`enabled: true` and `autoRepair: true`; `enabled: false` disables integration
and repair, while `autoRepair: false` retains a read-only probe. The hook accepts
only a canonical Git-for-Windows root containing working `git.exe`,
`git-bash.exe`, and `bash.exe`; WSL/System32 or a Windows App Execution Alias
is not native Git Bash. On explicit `startup` only, a missing/broken/incomplete
capability may launch the fixed, detached WinGet `Git.Git` repair worker after
the trusted App Installer boundary is validated. Other SessionStart sources
probe only, and unavailable WinGet/UAC/policy/ACL/process boundaries fail closed
without changing the host; the next startup re-probes.

The capability is published to children through `PATH`, `CK_GIT_EXE`,
`CK_GIT_BASH_EXE`, and `CK_GIT_BASH_PATH`. It cannot mutate the current parent
PowerShell/cmd environment. The repair worker has a private per-user OS-temp
resource lock and is bounded; PortableGit and generic installer fallbacks are
deferred. Keep this policy separate from `startupInstall`: it controls machine
capability repair, not package-manager selection or lifecycle trust.
