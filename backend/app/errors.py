"""Custom exceptions and JSON error handlers for StegoLab.

This module is deliberately framework-light: StegoError itself is a plain
exception (usable from the pure-Python steganography package), while
``register_error_handlers`` wires Flask handlers and is the only part that
imports Flask.
"""

from __future__ import annotations

import traceback

# ---------------------------------------------------------------------------
# Error codes
# ---------------------------------------------------------------------------

MISSING_FILE = "MISSING_FILE"
INVALID_REQUEST = "INVALID_REQUEST"
INVALID_FILE = "INVALID_FILE"
UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
UNSUPPORTED_WAV_FORMAT = "UNSUPPORTED_WAV_FORMAT"
FILE_TOO_LARGE = "FILE_TOO_LARGE"
CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
EMPTY_MESSAGE = "EMPTY_MESSAGE"
EMPTY_COVER_TEXT = "EMPTY_COVER_TEXT"
NO_PAYLOAD = "NO_PAYLOAD"
CORRUPT_PAYLOAD = "CORRUPT_PAYLOAD"
RATE_LIMITED = "RATE_LIMITED"
INTERNAL_ERROR = "INTERNAL_ERROR"

DEFAULT_STATUS = {
    MISSING_FILE: 400,
    INVALID_REQUEST: 400,
    INVALID_FILE: 400,
    UNSUPPORTED_FILE_TYPE: 415,
    UNSUPPORTED_WAV_FORMAT: 415,
    FILE_TOO_LARGE: 413,
    CAPACITY_EXCEEDED: 422,
    EMPTY_MESSAGE: 422,
    EMPTY_COVER_TEXT: 422,
    NO_PAYLOAD: 422,
    CORRUPT_PAYLOAD: 422,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
}


class StegoError(Exception):
    """A domain error carrying a machine-readable code, a friendly message
    and an HTTP status."""

    def __init__(self, code: str, message: str, http_status: int | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status if http_status is not None else DEFAULT_STATUS.get(code, 400)

    def to_dict(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"StegoError(code={self.code!r}, http_status={self.http_status})"


# Convenience constructors for the most common errors ------------------------

def invalid_file(message: str = "The uploaded file could not be read. Please upload a valid file.") -> StegoError:
    return StegoError(INVALID_FILE, message)


def unsupported_file_type(message: str = "This file type is not supported for this operation.") -> StegoError:
    return StegoError(UNSUPPORTED_FILE_TYPE, message)


def capacity_exceeded(capacity_bytes: int) -> StegoError:
    return StegoError(
        CAPACITY_EXCEEDED,
        f"The message is too large for this file. Maximum hidden message size is {capacity_bytes} bytes.",
    )


# ---------------------------------------------------------------------------
# Flask error handlers
# ---------------------------------------------------------------------------


def register_error_handlers(app) -> None:
    """Register JSON error handlers on a Flask app."""
    from flask import jsonify
    from flask_limiter import RateLimitExceeded
    from werkzeug.exceptions import BadRequest, HTTPException, RequestEntityTooLarge

    def _json_error(code: str, message: str, status: int, headers: dict | None = None):
        response = jsonify({"error": {"code": code, "message": message}})
        response.status_code = status
        response.headers["Content-Type"] = "application/json"
        if headers:
            for key, value in headers.items():
                response.headers[key] = value
        return response

    @app.errorhandler(StegoError)
    def _handle_stego_error(error: StegoError):
        return _json_error(error.code, error.message, error.http_status)

    @app.errorhandler(RequestEntityTooLarge)
    def _handle_too_large(_error):
        limit_mb = app.config.get("MAX_UPLOAD_MB", 10)
        return _json_error(
            FILE_TOO_LARGE,
            f"The uploaded file is too large. Maximum allowed size is {limit_mb} MB.",
            413,
        )

    @app.errorhandler(RateLimitExceeded)
    def _handle_rate_limited(error: RateLimitExceeded):
        import time as _time

        retry_after = getattr(error, "retry_after", None)
        if retry_after is None:
            try:
                item = error.limit.limit  # limits.RateLimitItem
                retry_after = max(1, int(item.get_expiry() - _time.time()))
            except Exception:
                retry_after = 60
        return _json_error(
            RATE_LIMITED,
            "Too many requests. Please wait a moment and try again.",
            429,
            headers={"Retry-After": str(int(retry_after))},
        )

    @app.errorhandler(BadRequest)
    def _handle_bad_request(_error):
        return _json_error(INVALID_REQUEST, "The request could not be understood.", 400)

    @app.errorhandler(HTTPException)
    def _handle_http_error(error: HTTPException):
        return _json_error(
            error.name.replace(" ", "_").upper() if error.code else INTERNAL_ERROR,
            error.description or "Request failed.",
            error.code or 500,
        )

    @app.errorhandler(Exception)
    def _handle_unexpected(error: Exception):
        # Log the traceback server-side only; never echo it to the client and
        # never log request data.
        app.logger.error("Unhandled exception: %s\n%s", error, traceback.format_exc(limit=20))
        return _json_error(INTERNAL_ERROR, "Something went wrong on our end. Please try again later.", 500)
