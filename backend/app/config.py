"""Application configuration for StegoLab."""

from __future__ import annotations

import os


def _normalize_database_url(url: str) -> str:
    """Normalize legacy SQLAlchemy URLs to the psycopg driver."""
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _parse_origins(raw: str) -> list[str]:
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or ["http://localhost:3000", "http://localhost:5173"]


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "10"))
    MAX_CONTENT_LENGTH = MAX_UPLOAD_MB * 1024 * 1024

    _db_url = _normalize_database_url(
        os.environ.get("DATABASE_URL", "sqlite:///stegolab.db")
    )
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = _parse_origins(os.environ.get("CORS_ORIGINS", ""))

    # Rate limits (Flask-Limiter). Capacity endpoints are cheaper, so they
    # get a more generous limit than encode/decode.
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"
    IMAGE_ENCODE_LIMIT = "30/minute"
    IMAGE_DECODE_LIMIT = "30/minute"
    AUDIO_ENCODE_LIMIT = "30/minute"
    AUDIO_DECODE_LIMIT = "30/minute"
    TEXT_ENCODE_LIMIT = "30/minute"
    TEXT_DECODE_LIMIT = "30/minute"
    CAPACITY_LIMIT = "60/minute"

    # Tables are normally created by the Alembic migration; only the SQLite
    # dev fallback (and tests) auto-create them.
    AUTO_CREATE_TABLES = False

    JSON_SORT_KEYS = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    RATELIMIT_ENABLED = False
    AUTO_CREATE_TABLES = True
    MAX_UPLOAD_MB = 10
