"""Meta endpoints: aggregate stats and health."""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify
import sqlalchemy as sa

from ..extensions import db
from ..models import OperationLog

bp = Blueprint("meta", __name__)

_MEDIAS = ("image", "audio", "text")


def _empty_by_medium() -> dict:
    return {m: {"encoded": 0, "decoded": 0} for m in _MEDIAS}


@bp.get("/stats")
def stats():
    by_medium = _empty_by_medium()
    encoded = decoded = failed = 0
    try:
        rows = (
            db.session.query(OperationLog.medium, OperationLog.operation, sa.func.count())
            .filter(OperationLog.status == "success")
            .group_by(OperationLog.medium, OperationLog.operation)
            .all()
        )
        for medium, operation, count in rows:
            medium_key = str(medium.value if hasattr(medium, "value") else medium)
            if medium_key not in by_medium:
                continue
            by_medium[medium_key]["encoded" if operation == "encode" else "decoded"] += count
            if operation == "encode":
                encoded += count
            else:
                decoded += count
        failed = (
            db.session.query(sa.func.count(OperationLog.id))
            .filter(OperationLog.status == "failure")
            .scalar()
            or 0
        )
    except Exception:
        # Best-effort: degrade to zeros if the database is unavailable.
        try:
            db.session.rollback()
        except Exception:  # pragma: no cover
            pass
        current_app.logger.warning("Failed to read operation stats; returning zeros.")

    return jsonify(
        encoded=encoded,
        decoded=decoded,
        failed=failed,
        by_medium=by_medium,
    )


@bp.get("/health")
def health():
    database = "down"
    try:
        db.session.execute(sa.text("SELECT 1"))
        db.session.commit()
        database = "up"
    except Exception:
        try:
            db.session.rollback()
        except Exception:  # pragma: no cover
            pass
    return jsonify(status="ok", database=database)
