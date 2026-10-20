"""Text steganography endpoints (zero-width characters)."""

from __future__ import annotations

import time

from flask import Blueprint, current_app, jsonify

from ..extensions import limiter
from ..errors import StegoError
from ..services import logging_service
from ..steganography import text as stego_text
from ..steganography import validation
from ..steganography.payload import OVERHEAD_BYTES, build_payload
from . import get_json_object

bp = Blueprint("text", __name__)


@bp.post("/text/encode")
@limiter.limit(lambda: current_app.config.get("TEXT_ENCODE_LIMIT", "30/minute"))
def text_encode():
    start = time.perf_counter()
    input_size = 0
    try:
        payload = get_json_object()
        cover_text = validation.ensure_cover_text(payload.get("cover_text"))
        message = validation.ensure_message(payload.get("message"))
        input_size = len(cover_text.encode("utf-8"))
        stego = stego_text.encode(cover_text, message)
    except StegoError as exc:
        logging_service.log_operation(
            operation="encode",
            medium="text",
            status="failure",
            input_size_bytes=input_size,
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    hidden_chars = stego_text.hidden_block_char_count(len(build_payload(message)))
    note = (
        f"Hidden block: {hidden_chars} invisible characters. "
        f"Payload overhead: {OVERHEAD_BYTES} bytes."
    )
    logging_service.log_operation(
        operation="encode",
        medium="text",
        status="success",
        input_size_bytes=input_size,
        output_size_bytes=len(stego.encode("utf-8")),
        message_size_bytes=len(message.encode("utf-8")),
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    return jsonify(stego_text=stego, capacity_note=note)


@bp.post("/text/decode")
@limiter.limit(lambda: current_app.config.get("TEXT_DECODE_LIMIT", "30/minute"))
def text_decode():
    start = time.perf_counter()
    input_size = 0
    try:
        payload = get_json_object()
        stego = validation.ensure_stego_text(payload.get("stego_text"))
        input_size = len(stego.encode("utf-8"))
        message = stego_text.decode(stego)
    except StegoError as exc:
        logging_service.log_operation(
            operation="decode",
            medium="text",
            status="failure",
            input_size_bytes=input_size,
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    logging_service.log_operation(
        operation="decode",
        medium="text",
        status="success",
        input_size_bytes=input_size,
        message_size_bytes=len(message.encode("utf-8")),
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    return jsonify(message=message, medium="text")
