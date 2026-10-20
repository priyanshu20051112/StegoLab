"""Audio steganography endpoints (LSB in PCM WAV samples)."""

from __future__ import annotations

import time
from io import BytesIO

from flask import Blueprint, current_app, jsonify, send_file

from ..extensions import limiter
from ..errors import StegoError
from ..services import logging_service
from ..steganography import audio as stego_audio
from . import get_message_field, get_upload

bp = Blueprint("audio", __name__)


@bp.post("/audio/capacity")
@limiter.limit(lambda: current_app.config.get("CAPACITY_LIMIT", "60/minute"))
def audio_capacity():
    data = get_upload()
    info = stego_audio.analyze(data)
    return jsonify(
        channels=info.channels,
        sample_rate=info.sample_rate,
        bits_per_sample=info.bits_per_sample,
        duration_seconds=round(info.duration_seconds, 6),
        capacity_bytes=info.capacity_bytes,
        size_bytes=len(data),
    )


@bp.post("/audio/encode")
@limiter.limit(lambda: current_app.config.get("AUDIO_ENCODE_LIMIT", "30/minute"))
def audio_encode():
    start = time.perf_counter()
    data = b""
    try:
        data = get_upload()
        message = get_message_field()
        info = stego_audio.analyze(data)
        wav = stego_audio.encode(data, message)
    except StegoError as exc:
        logging_service.log_operation(
            operation="encode",
            medium="audio",
            status="failure",
            input_size_bytes=len(data),
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    message_bytes = len(message.encode("utf-8"))
    logging_service.log_operation(
        operation="encode",
        medium="audio",
        status="success",
        input_size_bytes=len(data),
        output_size_bytes=len(wav),
        message_size_bytes=message_bytes,
        capacity_bytes=info.capacity_bytes,
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    response = send_file(
        BytesIO(wav),
        mimetype="audio/x-wav",
        as_attachment=True,
        download_name="stegolab_encoded.wav",
    )
    response.headers["X-Capacity-Bytes"] = str(info.capacity_bytes)
    response.headers["X-Message-Bytes"] = str(message_bytes)
    return response


@bp.post("/audio/decode")
@limiter.limit(lambda: current_app.config.get("AUDIO_DECODE_LIMIT", "30/minute"))
def audio_decode():
    start = time.perf_counter()
    data = b""
    try:
        data = get_upload()
        message = stego_audio.decode(data)
    except StegoError as exc:
        logging_service.log_operation(
            operation="decode",
            medium="audio",
            status="failure",
            input_size_bytes=len(data),
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    logging_service.log_operation(
        operation="decode",
        medium="audio",
        status="success",
        input_size_bytes=len(data),
        message_size_bytes=len(message.encode("utf-8")),
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    return jsonify(message=message, medium="audio")
