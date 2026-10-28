'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

// The path is data in a child-only environment value, never interpolated into shell code.
const WINDOWS_PRIVATE_ACL = `$ErrorActionPreference='Stop'
$p=$env:CK_BENCH_PRIVATE_DIR
$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=[System.Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true,$false)
$acl.SetOwner($sid)
$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $p -AclObject $acl
$actual=Get-Acl -LiteralPath $p
$rules=@($actual.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))
if(!$actual.AreAccessRulesProtected -or $rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $sid.Value){throw 'Private ACL verification failed'}
Write-Output 'VERIFIED'`;

function protect(directory, { platform = process.platform, runCommand = execFileSync, env = process.env } = {}) {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Private storage requires an owned regular directory');
    if (platform !== 'win32') {
        fs.chmodSync(directory, 0o700);
        if ((fs.statSync(directory).mode & 0o077) !== 0) throw new Error('ENVIRONMENT-BLOCKED: private native storage permissions unavailable');
        return;
    }
    const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => /^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC)$/i.test(key)));
    let verified = false;
    try {
        const output = runCommand('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(WINDOWS_PRIVATE_ACL, 'utf16le').toString('base64')], {
            env: { ...childEnv, CK_BENCH_PRIVATE_DIR: directory }, encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024
        });
        verified = String(output).trim() === 'VERIFIED';
    } catch { /* No credential is written before private storage is established. */ }
    if (!verified) throw new Error('ENVIRONMENT-BLOCKED: native Windows requires verified private profile ACLs');
}

module.exports = { protect, WINDOWS_PRIVATE_ACL };
