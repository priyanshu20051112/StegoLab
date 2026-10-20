"""API blueprints package + shared request-parsing helpers."""

from __future__ import annotations

from flask import request

from ..errors import INVALID_FILE, INVALID_REQUEST, MISSING_FILE, StegoError
from ..steganography import validation


def get_upload(field: str = "file") -> bytes:
    """Fetch a non-empty uploaded file from the request (in memory only)."""
    if field not in request.files:
        raise StegoError(MISSING_FILE, 'No file was uploaded. Attach a file in the "file" field.')
    upload = request.files[field]
    if not upload.filename:
        raise StegoError(MISSING_FILE, "No file was attached. Please choose a file and try again.")
    data = upload.read()
    if not data:
        raise StegoError(INVALID_FILE, "The uploaded file is empty.")
    return data


def get_message_field() -> str:
    """Fetch the secret message from the multipart form."""
    if "message" not in request.form:
        raise StegoError(INVALID_REQUEST, 'Missing form field "message".')
    return validation.ensure_message(request.form.get("message"))


def get_json_object() -> dict:
    """Fetch the JSON request body as an object."""
    payload = request.get_json(silent=True)
    if payload is None or not isinstance(payload, dict):
        raise StegoError(INVALID_REQUEST, "The request body must be a JSON object.")
    return payload
