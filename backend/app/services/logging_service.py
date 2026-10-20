"""Best-effort operation metadata logging.

Persists OperationLog rows containing ONLY metadata (sizes, durations,
status, error codes) -- never message content or request bodies. Every
failure here is swallowed: encode/decode must keep working even with the
database stopped.
"""

from __future__ import annotations

import time
from contextlib import contextmanager

from flask import current_app

from ..extensions import db
from ..models import OperationLog


def log_operation(
    *,
    operation: str,
    medium: str,
    status: str,
    input_size_bytes: int = 0,
    output_size_bytes: int | None = None,
    message_size_bytes: int | None = None,
    capacity_bytes: int | None = None,
    error_code: str | None = None,
    duration_ms: int = 0,
) -> None:
    """Persist one operation log row. Best-effort; never raises."""
    try:
        db.session.add(
            OperationLog(
                operation=operation,
                medium=medium,
                status=status,
                error_code=error_code,
                input_size_bytes=int(input_size_bytes or 0),
                output_size_bytes=output_size_bytes,
                message_size_bytes=message_size_bytes,
                capacity_bytes=capacity_bytes,
                duration_ms=int(duration_ms),
            )
        )
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:  # pragma: no cover - rollback must never mask the original problem
            pass
        # Warning WITHOUT any sensitive data (no message, no request body).
        try:
            current_app.logger.warning(
                "Failed to persist operation log (operation=%s medium=%s status=%s); continuing.",
                operation,
                medium,
                status,
            )
        except Exception:  # pragma: no cover
            pass


@contextmanager
def timed():
    """Context manager yielding a dict with a growing 'duration_ms' key."""
    state = {"duration_ms": 0}
    start = time.perf_counter()
    try:
        yield state
    finally:
        state["duration_ms"] = int((time.perf_counter() - start) * 1000)
