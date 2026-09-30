#!/usr/bin/env python3
"""Retired migration guard.

The former sweep rewrote every workflow adjacency from ``plan -> why-review``
to ``plan -> plan-review``. That invariant is intentionally obsolete:
``plan-review`` is now explicit/user-selected and appears as a workflow step
only in ``workflow-big-feature`` and ``workflow-greenfield-init``.

Keep this command as a harmless compatibility entry point so old maintenance
notes cannot reintroduce plan-review into lean workflows.
"""

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Retired: no workflow files are modified.")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.parse_args()
    print(
        "NO-OP: automatic plan-review insertion is retired; "
        "only workflow-big-feature and workflow-greenfield-init own explicit occurrences."
    )


if __name__ == "__main__":
    main()
