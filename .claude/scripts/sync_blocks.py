"""Helpers for loading canonical SYNC blocks from shared markdown."""
from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SYNC_SOURCE = PROJECT_ROOT / ".claude" / "skills" / "shared" / "sync-inline-versions.md"

# End-boundary markers for `find_sync_region_start` — priority order.
_REMINDER_OPEN_RE = re.compile(r"^<!-- SYNC:[^\n]*?:reminder -->\s*$", re.MULTILINE)
_STEP_TASK_CLOSING_RE = re.compile(r"^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->\s*$", re.MULTILINE)
_CLOSING_REMINDERS_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def load_sync_body(tag: str) -> str:
    text = SYNC_SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(rf"^## {re.escape(tag)}\s*\n(?P<body>.*?)(?=^---\s*$)", re.MULTILINE | re.DOTALL)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"SYNC block not found: {tag}")
    return match.group("body").strip()


def load_wrapped_sync_block(tag: str) -> str:
    body = load_sync_body(tag)
    return f"<!-- {tag} -->\n\n{body}\n\n<!-- /{tag} -->\n"


def find_sync_region_start(text: str, search_from: int = 0) -> int:
    """Char offset of the first end-boundary marker that opens the SYNC region.

    The SYNC region sits between the main authored content and `## Closing Reminders`.
    Inject scripts insert TOP blocks BEFORE this offset; the migration script uses
    the same offset to determine where main content ends.

    Priority (canonical layout contract):
      1. `<!-- SYNC:*:reminder -->`
      2. `<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->`
      3. `## Closing Reminders`
      4. EOF (returns len(text))

    `search_from` lets callers skip matches that precede the main-content cursor.
    """
    for pattern in (_REMINDER_OPEN_RE, _STEP_TASK_CLOSING_RE, _CLOSING_REMINDERS_RE):
        m = pattern.search(text, pos=search_from)
        if m:
            return m.start()
    return len(text)


# ─── Guide carriers ─────────────────────────────────────────────────────────
# A converted skill carries a protocol as ONE guide line inside its PROTOCOL-GUIDES block
# instead of the full `<!-- SYNC:tag -->` body; hooks deliver the full text, and the line
# is the fallback pointer. `sync-update-blocks.py --mode=guide` writes the lines with
# `format_guide_line`; every sensor and injector asks `has_guide_entry`. This module and
# its twin `.claude/scripts/lib/protocol-guide-carrier.cjs` are the ONLY owners of the
# format: never copy the regex elsewhere. The twin-parity test in
# `.claude/scripts/tests/sync-update-blocks-guide.test.cjs` fails if the two disagree.
#
# Line format:  - `tag` — summary; when → path
# `summary` holds no `;`, neither text holds `→` or a line break (enforced where the text
# is authored, `.claude/skills/shared/protocol-groups.json`), and the path must end in
# `<tag>.md`, so a line cannot name one protocol while pointing at another's file.

GUIDE_BLOCK_START = "<!-- PROTOCOL-GUIDES:START -->"
GUIDE_BLOCK_END = "<!-- PROTOCOL-GUIDES:END -->"

_GUIDE_BLOCK_RE = re.compile(
    r"^[ \t]*<!-- PROTOCOL-GUIDES:START -->[ \t]*$(?P<body>.*?)^[ \t]*<!-- PROTOCOL-GUIDES:END -->[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
_GUIDE_LINE_RE = re.compile(
    r"^- `(?P<tag>[a-z0-9][a-z0-9-]*)` — (?P<summary>[^;\n→]+?); (?P<when>[^\n→]+?) → (?P<path>\S+)[ \t]*$",
    re.MULTILINE,
)


def format_guide_line(tag: str, summary: str, when: str, path: str) -> str:
    """The one guide line for `tag`. Raises ValueError unless the recognizer reads back exactly
    the fields given (a `;` in the summary, for example, would silently shift into `when`)."""
    line = f"- `{tag}` — {summary}; {when} → {path}"
    parsed = _parse_guide_lines(line)
    if len(parsed) != 1 or parsed[0] != (tag, line, summary, when, path):
        raise ValueError(f"guide line for {tag!r} does not match the guide format: {line!r}")
    return line


def _parse_guide_lines(block_body: str) -> list:
    """Well-formed guide lines as (tag, line, summary, when, path) tuples."""
    out = []
    for m in _GUIDE_LINE_RE.finditer(block_body):
        tag, path = m.group("tag"), m.group("path")
        # The path must name this tag's own file (`<tag>.md`, any directory spelling, so a
        # host mirror's path rewrite still counts).
        if path.replace("\\", "/").rsplit("/", 1)[-1] == f"{tag}.md":
            out.append((tag, m.group(0), m.group("summary"), m.group("when"), path))
    return out


def guide_entries(text: str) -> dict:
    """{tag: guide line} for every well-formed guide line inside a PROTOCOL-GUIDES block."""
    normalized = str(text).replace("\r\n", "\n").replace("\r", "\n")
    entries = {}
    for block in _GUIDE_BLOCK_RE.finditer(normalized):
        for tag, line, _summary, _when, _path in _parse_guide_lines(block.group("body")):
            entries.setdefault(tag, line)
    return entries


def guide_tags(text: str) -> list:
    """Tags the text carries as guide entries, in first-seen order."""
    return list(guide_entries(text).keys())


def has_guide_entry(text: str, tag: str) -> bool:
    """True when the text carries `tag` as a guide entry (the shared carrier recognizer)."""
    return tag in guide_entries(text)
