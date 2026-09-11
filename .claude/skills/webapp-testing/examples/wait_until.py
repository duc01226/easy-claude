"""Small reusable wait-until helper for the Playwright examples.

The caller supplies the condition and, for browser polling, the page's
wait function. This keeps synchronization reusable without coupling the
helper to a particular page, selector, or business domain.
"""

from collections.abc import Callable
from time import monotonic, sleep


def wait_until(
    condition: Callable[[], bool],
    *,
    timeout_ms: int = 10_000,
    poll_interval_ms: int = 100,
    description: str = "condition",
    wait: Callable[[int], object] | None = None,
) -> None:
    """Wait until a positive or negative predicate succeeds.

    ``wait`` is injectable so Playwright examples can use
    ``page.wait_for_timeout`` while non-browser callers can use the standard
    clock. A timeout is an actionable test failure with the last condition
    error, when available.
    """

    deadline = monotonic() + timeout_ms / 1000
    last_error: Exception | None = None

    while True:
        try:
            if condition():
                return
        except Exception as error:  # Keep polling transient DOM state.
            last_error = error

        if monotonic() >= deadline:
            detail = f"; last error: {last_error}" if last_error else ""
            raise AssertionError(
                f"Timed out after {timeout_ms}ms waiting for {description}{detail}"
            )

        if wait is None:
            sleep(poll_interval_ms / 1000)
        else:
            wait(poll_interval_ms)
