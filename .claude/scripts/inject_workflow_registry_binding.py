"""Inject SYNC:workflow-registry-binding into every workflow-* orchestrator skill.

Establishes the two-way binding between a workflow's machine registry entry
(`.claude/workflows.json` -> `workflows.<id>`) and its authored `SKILL.md`:
the registry owns step identity/order/applicability, the SKILL.md owns how each
step executes, and a contradiction between them is drift to surface, not a choice.

The reverse half of the binding lives in `.claude/workflows.json` as
`preActions.readFiles` naming each workflow's own SKILL.md.

Idempotent: refreshes an existing block in place, inserts when absent.
Mirrors the insertion contract of inject_nested_task_creation.py — TOP block
immediately BEFORE the SYNC region start (per sync_blocks.find_sync_region_start).

Usage:
    py -3 .claude/scripts/inject_workflow_registry_binding.py [--check | --dry-run]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"
REGISTRY = PROJECT_ROOT / ".claude" / "workflows.json"

TAG = "SYNC:workflow-registry-binding"
TOP_OPEN = f"<!-- {TAG} -->"
TOP_BLOCK = load_wrapped_sync_block(TAG)
TOP_BLOCK_RE = re.compile(rf"<!-- {re.escape(TAG)} -->.*?<!-- /{re.escape(TAG)} -->", re.DOTALL)


def workflow_ids() -> list[str]:
    """Every workflow in the registry that ships an orchestrator skill of the same name."""
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    return sorted(data["workflows"].keys())


def find_skill_path(name: str) -> Path | None:
    for fname in ("SKILL.md", "skill.md"):
        p = SKILLS_DIR / name / fname
        if p.exists():
            return p
    return None


def inject(text: str) -> tuple[str, str]:
    if TOP_OPEN in text:
        m = TOP_BLOCK_RE.search(text)
        if not m:
            return text, "MALFORMED"
        if m.group(0).strip() == TOP_BLOCK.strip():
            return text, "ALREADY-PRESENT"
        return text[: m.start()] + TOP_BLOCK.strip() + text[m.end():], "REFRESHED"

    insert_at = find_sync_region_start(text)
    head = text[:insert_at].rstrip() + "\n\n"
    tail = "\n" + text[insert_at:].lstrip("\n")
    return head + TOP_BLOCK + tail, "INSERTED"


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    unknown = [a for a in sys.argv[1:] if a not in {"--dry-run", "--check"}]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str]] = []
    for name in workflow_ids():
        path = find_skill_path(name)
        if path is None:
            results.append((name, "NO-SKILL"))
            continue
        original = path.read_text(encoding="utf-8")
        new_text, status = inject(original)
        if status == "MALFORMED":
            results.append((name, "MALFORMED"))
            continue
        if new_text == original:
            results.append((name, status))
            continue
        if check or dry_run:
            results.append((name, "WOULD-UPDATE" if check else "DRY-RUN"))
            continue
        path.write_text(new_text, encoding="utf-8")
        results.append((name, status))

    print(f"{'WORKFLOW':<38} STATUS")
    print("-" * 60)
    for name, status in results:
        print(f"{name:<38} {status}")

    if any(s == "MALFORMED" for _, s in results):
        return 1
    if check and any(s == "WOULD-UPDATE" for _, s in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
