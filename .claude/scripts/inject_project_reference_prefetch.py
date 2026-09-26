"""Inject SYNC:project-reference-docs-guide block (TOP + reminder BOTTOM) into
implementation/planning/review/investigation skills.

Idempotent — a file that already carries the protocol (the SYNC tag, or a guide
entry from a skill converted to guide lines: sync_project_reference_block.carries)
is only refreshed in place (delegated to sync_project_reference_block.refresh, the
single refresh owner), so no run puts a converted body back.
Block content is GENERIC (project-agnostic) — works for any project that uses
the canonical .claude harness with hook-initialized docs/project-reference/.

TOP placement:    immediately BEFORE the SYNC region start (per
                  sync_blocks.find_sync_region_start) — co-locates TOP with
                  reminders below the main authored content.
BOTTOM placement: a SYNC:...:reminder block immediately BEFORE `## Closing Reminders`
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from line_endings import read_text, write_text
from sync_blocks import find_sync_region_start, load_wrapped_sync_block
from sync_project_reference_block import carries
from sync_project_reference_block import refresh as refresh_existing

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

SKILL_NAMES = [
    # Plan family
    "plan",
    "plan-review", "plan-validate",
    # Cook family
    "feature-implement",
    # Code family
    "plan-execute",
    # Fix family (ci/issue/logs/test/ui folded into /fix --target=*)
    "fix",
    # Investigate family
    "investigate", "debug-investigate",
    # Spec authoring quality family (idea → spec gates)
    "spec-discovery", "spec-clarify",
    # Refactor / migration / scaffold
    "db-migrate", "scaffold",
    # Review family
    "security-review", "code-review", "integration-test-review",
    "knowledge-review", "architecture-review",
    "artifact-review", "changes-review", "domain-entities-review",
    "production-readiness-review", "architecture-review-full",
    "why-review", "workflow-review-changes",
    # Workflow step skills
    # NOTE: `spec` (merged feature-spec router) is intentionally NOT a target —
    # it reads docs/project-reference/spec-principles.md via an explicit
    # [BLOCKING] gate; injecting the generic prefetch here would duplicate it.
    "integration-test", "integration-test-verify",
    "docs-update", "watzup", "workflow-write-integration-test",
    # Workflow step skills that read, write, test, or review project artifacts
    # (code, tests, specs, PBIs, designs) — each needs the phase routing table.
    "architecture-design", "architecture-scalability-review", "tech-stack-research",
    "domain-analysis", "scenario", "code-simplifier", "performance-review",
    "experience-review", "test", "e2e-test", "e2e-test-verify", "workflow-e2e",
    "seed-test-data", "spec-index", "harness-setup", "linter-setup",
    "brainstorm", "idea", "refine", "story", "prioritize", "dor-gate",
    "pbi-challenge", "pbi-mockup", "design-spec", "demo-guide",
    "feature-presentation", "excalidraw-diagram", "ui-review", "workflow-end",
    # Non-workflow skills that edit or explain project code/UI
    "design", "understand", "tech-spec", "package-upgrade",
    "git-conflict-resolve", "web-design-guidelines",
]

# Workflow step skills deliberately WITHOUT the block. Every step skill named in
# .claude/workflows.json must be in SKILL_NAMES or here (enforced by
# tests/suites/project-reference-gate-coverage.test.cjs). Reason required.
EXEMPT_WORKFLOW_STEPS = {
    "spec": "own [BLOCKING] read gate for project-config, docs index, lessons and the spec doc set",
    "scan": "generator of the reference docs; validates project-config itself before scanning",
    "web-research": "external-source research; no project target files",
    "deep-research": "external-source research; no project target files",
    "knowledge-synthesis": "synthesizes external research into a report; no project target files",
    "market-analysis": "external market research; no project target files",
    "business-evaluation": "business viability report; no project target files",
    "strategy-builder": "marketing strategy report; no project target files",
    "course-builder": "course material from research; no project target files",
    "html-export": "renders a given HTML file to PNG, PDF or video; reads no project reference context",
}

TAG = "SYNC:project-reference-docs-guide"
REMINDER_TAG = "SYNC:project-reference-docs-guide:reminder"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def find_skill_path(name: str) -> Path | None:
    base = SKILLS_DIR / name
    for fname in ("SKILL.md", "skill.md"):
        p = base / fname
        if p.exists():
            return p
    return None


def inject(text: str, top_block: str | None = None, bottom_block: str | None = None) -> tuple[str, dict]:
    """Insert the blocks into a skill that lacks them, or refresh carried copies.

    `top_block` / `bottom_block` default to canonical; tests pass other wrapped
    blocks to simulate a canonical edit.
    """
    top_block = TOP_BLOCK if top_block is None else top_block
    bottom_block = BOTTOM_BLOCK if bottom_block is None else bottom_block
    status = {"top": "skipped", "bottom": "skipped", "already_present": False}

    if carries(text):
        # Refresh has ONE owner (sync_project_reference_block.refresh), which
        # replaces blocks whitespace-stripped so repeated canonical edits never
        # accumulate blank lines around the markers.
        status["already_present"] = True
        text, refreshed = refresh_existing(text, top_block, bottom_block)
        if refreshed["top_refreshed"]:
            status["top"] = "refreshed"
        if refreshed["bottom_refreshed"]:
            status["bottom"] = "refreshed"
        elif refreshed["bottom_added"]:
            status["bottom"] = "added"
        return text, status

    # --- TOP insert: BEFORE the SYNC region start (co-located with reminders) ---
    insert_at = find_sync_region_start(text)
    head = text[:insert_at].rstrip() + "\n\n"
    tail = "\n" + text[insert_at:].lstrip("\n")
    text = head + top_block + tail
    status["top"] = "before-sync-region-start"

    # --- BOTTOM insert: before `## Closing Reminders` heading ---
    m = CLOSING_RE.search(text)
    if m:
        insert_at = m.start()
        text = text[:insert_at] + bottom_block + "\n" + text[insert_at:]
        status["bottom"] = "before-closing-reminders"
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += "\n" + bottom_block
        status["bottom"] = "appended-eof"

    return text, status


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    unknown_args = [arg for arg in sys.argv[1:] if arg not in {"--dry-run", "--check"}]
    if unknown_args:
        print(f"Unknown argument(s): {', '.join(unknown_args)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str, dict]] = []
    for name in SKILL_NAMES:
        path = find_skill_path(name)
        if path is None:
            results.append((name, "MISSING", {}))
            continue
        original, newline = read_text(path)
        new_text, status = inject(original)
        if status["already_present"] and new_text == original:
            results.append((name, "ALREADY-PRESENT", status))
            continue
        if new_text == original:
            results.append((name, "NO-CHANGE", status))
            continue
        if check or dry_run:
            results.append((name, "WOULD-UPDATE" if check else "DRY-RUN", status))
            continue
        write_text(path, new_text, newline)
        results.append((name, "UPDATED", status))

    print(f"{'SKILL':<30} {'STATUS':<18} TOP / BOTTOM")
    print("-" * 90)
    for name, kind, status in results:
        top = status.get("top", "-")
        bot = status.get("bottom", "-")
        print(f"{name:<30} {kind:<18} {top} / {bot}")

    updated = sum(1 for _, k, _ in results if k == "UPDATED")
    already = sum(1 for _, k, _ in results if k == "ALREADY-PRESENT")
    missing = sum(1 for _, k, _ in results if k == "MISSING")
    print(f"\nTotal: {len(results)} | Updated: {updated} | Already-present: {already} | Missing: {missing}")
    return 1 if check and any(k == "WOULD-UPDATE" for _, k, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())
