'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WINDOWS_ACL_TIMEOUT_MS = 15000;
const DIAGNOSTIC_LIMIT = 300;

// The path is data in a child-only environment value, never interpolated into shell code.
// Only .NET types and methods run here, never a cmdlet (Set-Acl, Get-Acl, Write-Output), so Windows PowerShell
// performs no module discovery or auto-loading in the trimmed child environment. The [System.IO.Directory] ACL
// calls match the native Windows probe in .claude/hooks/lib/startup-install-lock.cjs.
const WINDOWS_PRIVATE_ACL = `$ErrorActionPreference='Stop'
$p=$env:CK_BENCH_PRIVATE_DIR
$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=[System.Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true,$false)
$acl.SetOwner($sid)
$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow)
$acl.AddAccessRule($rule)
[System.IO.Directory]::SetAccessControl($p,$acl)
$actual=[System.IO.Directory]::GetAccessControl($p)
$rules=@($actual.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))
if(!$actual.AreAccessRulesProtected -or $rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $sid.Value){throw 'Private ACL verification failed'}
[Console]::Out.Write('VERIFIED')`;

// One bounded line for the refusal: PowerShell reports -EncodedCommand errors as CLIXML on stderr.
function failureCause(error) {
    if (error?.code === 'ETIMEDOUT') return `PowerShell did not finish within ${WINDOWS_ACL_TIMEOUT_MS} ms`;
    const exited = Number.isInteger(error?.status);
    // An exit reports the script's own stderr; the error message would repeat the encoded command instead.
    const detail = String((exited ? error.stderr : error?.message) || '')
        .replace(/#< CLIXML/g, ' ')
        .replace(/_x000[DA]_/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const status = exited ? `PowerShell exited with status ${error.status}` : 'PowerShell could not run';
    return detail ? `${status}: ${detail.slice(0, DIAGNOSTIC_LIMIT)}` : status;
}

function protect(directory, { platform = process.platform, runCommand = execFileSync, env = process.env } = {}) {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Private storage requires an owned regular directory');
    if (platform !== 'win32') {
        fs.chmodSync(directory, 0o700);
        if ((fs.statSync(directory).mode & 0o077) !== 0) throw new Error('ENVIRONMENT-BLOCKED: private native storage permissions unavailable');
        return;
    }
    const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => /^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC)$/i.test(key)));
    let cause = 'PowerShell did not confirm the private ACL';
    try {
        const output = runCommand(
            'powershell.exe',
            ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(WINDOWS_PRIVATE_ACL, 'utf16le').toString('base64')],
            {
                env: { ...childEnv, CK_BENCH_PRIVATE_DIR: directory },
                encoding: 'utf8',
                windowsHide: true,
                timeout: WINDOWS_ACL_TIMEOUT_MS,
                maxBuffer: 1024 * 1024
            }
        );
        if (String(output).trim() === 'VERIFIED') return;
    } catch (error) {
        cause = failureCause(error); /* No credential is written before private storage is established. */
    }
    throw new Error(`ENVIRONMENT-BLOCKED: native Windows requires verified private profile ACLs (${cause})`);
}

module.exports = { protect, WINDOWS_PRIVATE_ACL };
