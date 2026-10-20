"""SQLAlchemy models for StegoLab.

Only operation *metadata* is ever persisted -- never message content.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .extensions import db

operation_enum = sa.Enum("encode", "decode", name="operation_type")
medium_enum = sa.Enum("image", "audio", "text", name="medium_type")
status_enum = sa.Enum("success", "failure", name="status_type")


class OperationLog(db.Model):
    __tablename__ = "operation_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    operation = mapped_column(operation_enum, nullable=False)
    medium = mapped_column(medium_enum, nullable=False)
    status = mapped_column(status_enum, nullable=False)
    error_code = mapped_column(sa.String(40), nullable=True)
    input_size_bytes = mapped_column(sa.Integer, nullable=False, default=0)
    output_size_bytes = mapped_column(sa.Integer, nullable=True)
    message_size_bytes = mapped_column(sa.Integer, nullable=True)
    capacity_bytes = mapped_column(sa.Integer, nullable=True)
    duration_ms = mapped_column(sa.Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=sa.func.now(),
    )

    __table_args__ = (
        sa.Index("ix_operation_logs_operation_medium", "operation", "medium"),
        sa.Index("ix_operation_logs_created_at", "created_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<OperationLog {self.operation}/{self.medium} {self.status}>"
