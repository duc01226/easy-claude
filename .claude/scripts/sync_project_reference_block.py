"""Refresh existing SYNC:project-reference-docs-guide block content in skills
AND agents that already carry the block, so they pick up the current canonical
body (sourced from .claude/skills/shared/sync-inline-versions.md).

Refreshes BOTH variants:
  - the TOP block content, and
  - the :reminder bottom block content (replaced in place when present,
    or inserted before `## Closing Reminders` when missing).

A skill converted to guide lines (`sync_blocks.has_guide_entry`) also carries the
protocol: its reminder is refreshed, and no TOP block is ever created (refresh only
replaces a TOP block that is already there).

Idempotent — only writes when content actually changes. Files keep their own
line-ending style.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from line_endings import read_text, write_text
from sync_blocks import has_guide_entry, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"

TAG = "SYNC:project-reference-docs-guide"
REMINDER_TAG = "SYNC:project-reference-docs-guide:reminder"
GUIDE_TAG = TAG.removeprefix("SYNC:")

NEW_TOP_BODY = load_wrapped_sync_block(TAG).rstrip()
NEW_BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

# Match the full TOP block including delimiters but NOT the :reminder variant.
# The open/close literals end in ` -->`, so they never match the `:reminder` tags
# (whose tokens read `...guide:reminder -->`); the lazy `.*?` stops at the TOP close.
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide -->.*?<!-- /SYNC:project-reference-docs-guide -->",
    re.DOTALL,
)
# Match the full :reminder block including delimiters.
REMINDER_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide:reminder -->.*?<!-- /SYNC:project-reference-docs-guide:reminder -->",
    re.DOTALL,
)
CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def carries(text: str) -> bool:
    """The file carries the protocol: any SYNC fence for it (body or kept reminder), or a
    guide entry. The injector asks the same question before it would insert a TOP block."""
    return TAG in text or has_guide_entry(text, GUIDE_TAG)


def refresh(text: str, top_block: str | None = None, bottom_block: str | None = None) -> tuple[str, dict]:
    """Replace the carried blocks with canonical. The single refresh owner — the
    injector delegates here. The regexes end at the close marker, so the in-place
    replacement is whitespace-stripped: the blank lines around a block are never
    touched, however many times the canonical body changes.

    `top_block` / `bottom_block` default to the canonical wrapped blocks; tests pass
    other bodies to simulate a canonical edit.
    """
    new_top = (NEW_TOP_BODY if top_block is None else top_block).strip()
    new_bottom = NEW_BOTTOM_BLOCK if bottom_block is None else bottom_block
    status = {"top_refreshed": False, "bottom_refreshed": False, "bottom_added": False}

    # Refresh TOP block content
    m = TOP_BLOCK_RE.search(text)
    if m and m.group(0).strip() != new_top:
        text = text[: m.start()] + new_top + text[m.end():]
        status["top_refreshed"] = True

    # Refresh the :reminder block in place when present, else insert it before
    # `## Closing Reminders` (EOF fallback).
    rm = REMINDER_BLOCK_RE.search(text)
    if rm:
        new_reminder = new_bottom.strip()
        if rm.group(0).strip() != new_reminder:
            text = text[: rm.start()] + new_reminder + text[rm.end():]
            status["bottom_refreshed"] = True
    else:
        wrapped = new_bottom.strip() + "\n"
        m = CLOSING_RE.search(text)
        if m:
            insert_at = m.start()
            text = text[:insert_at] + wrapped + "\n" + text[insert_at:]
        else:
            if not text.endswith("\n"):
                text += "\n"
            text += "\n" + wrapped
        status["bottom_added"] = True

    return text, status


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    unknown_args = [arg for arg in sys.argv[1:] if arg not in {"--dry-run", "--check"}]
    if unknown_args:
        print(f"Unknown argument(s): {', '.join(unknown_args)}", file=sys.stderr)
        return 2

    # Find every skill AND agent file currently carrying the TAG
    targets: list[Path] = []
    seen: set[str] = set()  # case-insensitive dedupe (Windows)
    globs = [
        SKILLS_DIR.glob("**/SKILL.md"),
        SKILLS_DIR.glob("**/skill.md"),
        AGENTS_DIR.glob("*.md"),
    ]
    for it in globs:
        for p in it:
            key = str(p).lower()
            if key in seen:
                continue
            if carries(read_text(p)[0]):
                targets.append(p)
                seen.add(key)

    def label(path: Path) -> str:
        # Agents live directly under .claude/agents (basename is meaningful);
        # skills live in <name>/SKILL.md (parent dir name is meaningful).
        return f"agent:{path.stem}" if path.parent == AGENTS_DIR else path.parent.name

    print(f"{'TARGET':<38} {'TOP':<12} {'BOTTOM':<12}")
    print("-" * 64)
    refreshed = 0
    for path in sorted(targets):
        original, newline = read_text(path)
        new_text, status = refresh(original)
        if new_text != original:
            if not (dry_run or check):
                write_text(path, new_text, newline)
            refreshed += 1
        top = "REFRESHED" if status["top_refreshed"] else "ok"
        if status["bottom_added"]:
            bot = "ADDED"
        elif status["bottom_refreshed"]:
            bot = "REFRESHED"
        else:
            bot = "ok"
        print(f"{label(path):<38} {top:<12} {bot:<12}")

    print(f"\nTotal scanned: {len(targets)} | Files modified: {refreshed}")
    return 1 if check and refreshed else 0


if __name__ == "__main__":
    sys.exit(main())
