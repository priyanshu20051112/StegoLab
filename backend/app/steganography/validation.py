"""Input validation helpers shared by the API blueprints (no Flask imports)."""

from __future__ import annotations

from ..errors import (
    EMPTY_COVER_TEXT,
    EMPTY_MESSAGE,
    INVALID_FILE,
    INVALID_REQUEST,
    StegoError,
)


def ensure_non_empty_bytes(data: bytes) -> bytes:
    if not data:
        raise StegoError(INVALID_FILE, "The uploaded file is empty.")
    return data


def ensure_message(message) -> str:
    """Validate a secret message field (form field or JSON field)."""
    if message is None or not isinstance(message, str):
        raise StegoError(INVALID_REQUEST, "A text message is required.")
    if not message:
        raise StegoError(EMPTY_MESSAGE, "The message to hide is empty.")
    return message


def ensure_cover_text(cover_text) -> str:
    """Validate a cover text field for the text medium."""
    if cover_text is None or not isinstance(cover_text, str):
        raise StegoError(INVALID_REQUEST, '"cover_text" must be a string.')
    if not cover_text:
        raise StegoError(EMPTY_COVER_TEXT, "The cover text is empty. Provide some text to hide the message in.")
    return cover_text


def ensure_stego_text(stego_text) -> str:
    if stego_text is None or not isinstance(stego_text, str):
        raise StegoError(INVALID_REQUEST, '"stego_text" must be a string.')
    return stego_text
