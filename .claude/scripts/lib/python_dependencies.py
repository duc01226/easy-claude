"""Bounded on-use provisioning for the catalog tools' declared PyYAML dependency."""

import importlib
import os
import re
import subprocess
import sys


INSTALL_TIMEOUT_SECONDS = 30
PACKAGE = 'pyyaml'
WHEELS_ONLY = ('--only-binary=:all:',)
# A newly released interpreter can precede the package's wheels (PyYAML 6.0.3 publishes
# none for CPython 3.15). pip applies format options in order, so ':all:' first keeps every
# build dependency wheel-only and only the declared package itself may build from source.
DECLARED_SOURCE_ONLY = ('--only-binary=:all:', f'--no-binary={PACKAGE}')


def _import_yaml():
    importlib.invalidate_caches()
    try:
        importlib.import_module('yaml')
        return True
    except ModuleNotFoundError as error:
        if error.name != 'yaml':
            raise
        return False


def _import_target(target):
    if not os.path.isdir(target):
        return False
    added = target not in sys.path
    if added:
        sys.path.insert(0, target)
    if _import_yaml():
        return True
    if added:
        sys.path.remove(target)
    return False


def _install(requirement, location, formats=WHEELS_ONLY):
    """Run one bounded pip attempt; return pip's last stderr line ('' on success)."""
    # The running interpreter owns the installation environment and the wheel ABI on every OS.
    # Isolated pip ignores user settings/env; wheels avoid build scripts unless `formats` names
    # the declared package as the single source-built exception.
    argv = [sys.executable, '-m', 'pip', '--isolated', 'install',
            '--disable-pip-version-check', '--no-input', '--retries', '0',
            '--timeout', '10', *formats, *location, requirement]
    try:
        result = subprocess.run(argv, stdin=subprocess.DEVNULL,
                                stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                                encoding='utf-8', errors='replace',
                                timeout=INSTALL_TIMEOUT_SECONDS, check=False)
    except subprocess.TimeoutExpired:
        return f'pip did not finish within {INSTALL_TIMEOUT_SECONDS} seconds'
    except OSError as error:
        return f'pip could not start: {error}'
    if result.returncode == 0:
        return ''
    lines = [line.strip() for line in (result.stderr or '').splitlines() if line.strip()]
    return (lines[-1] if lines else f'pip exited with status {result.returncode}')[:300]


def ensure_pyyaml(requirements):
    """Try interpreter-wide wheels, local-target wheels, then a local source build of only the
    declared package; never fake availability.

    Python -S deliberately disables site dependencies. It and the explicit opt-out
    keep diagnostic/verification probes nonmutating. Missing transitive imports are
    faults in an installed package, not permission to install a guessed package.
    """
    if sys.flags.no_site or os.environ.get('CK_AUTO_INSTALL_DEPENDENCIES', '').lower() in ('0', 'off', 'false'):
        return False
    if _import_yaml():
        return True
    try:
        with open(requirements, encoding='utf-8') as source:
            declarations = [line.strip() for line in source if line.strip() and not line.lstrip().startswith('#')]
    except OSError:
        return False
    # Only the named capability's declared package is installable, never arbitrary
    # requirements-file options, URLs, or names inferred from exception messages.
    declared = [line for line in declarations
                if re.fullmatch(r'pyyaml(?:[<>=!~]+[0-9][0-9.*,<>=!~]*)?', line, re.IGNORECASE)]
    if len(declared) != 1:
        return False
    project = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(requirements))))
    target = os.path.join(project, 'tmp', 'claude-temp', 'python-packages')
    if _import_target(target):
        return True
    sys.stderr.write('[dependencies] PyYAML missing; attempting interpreter-wide installation.\n')
    _install(declared[0], ['--no-user'])
    if _import_yaml():
        return True
    sys.stderr.write('[dependencies] Interpreter-wide installation unavailable; trying an isolated local target.\n')
    _install(declared[0], ['--target', target])
    if _import_target(target):
        return True
    sys.stderr.write('[dependencies] Local wheel installation unavailable; building only the declared PyYAML '
                     'from source into the local target.\n')
    reason = _install(declared[0], ['--target', target], DECLARED_SOURCE_ONLY)
    if _import_target(target):
        return True
    sys.stderr.write('[dependencies] PyYAML remains unavailable; automatic attempts stopped.\n')
    if reason:
        sys.stderr.write(f'[dependencies] Last pip error: {reason}\n')
    return False
