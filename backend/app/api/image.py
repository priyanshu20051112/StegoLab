"""Image steganography endpoints (LSB in RGB channels, lossless PNG out)."""

from __future__ import annotations

import time
from io import BytesIO

from flask import Blueprint, current_app, jsonify, send_file

from ..errors import StegoError
from ..services import logging_service
from ..steganography import image as stego_image
from ..steganography.payload import OVERHEAD_BYTES
from ..extensions import limiter
from . import get_message_field, get_upload

bp = Blueprint("image", __name__)


def _capacity(width: int, height: int) -> int:
    return max(0, (width * height * 3) // 8 - OVERHEAD_BYTES)


@bp.post("/image/capacity")
@limiter.limit(lambda: current_app.config.get("CAPACITY_LIMIT", "60/minute"))
def image_capacity():
    data = get_upload()
    info = stego_image.analyze(data)
    return jsonify(
        width=info.width,
        height=info.height,
        capacity_bytes=info.capacity_bytes,
        size_bytes=info.size_bytes,
    )


@bp.post("/image/encode")
@limiter.limit(lambda: current_app.config.get("IMAGE_ENCODE_LIMIT", "30/minute"))
def image_encode():
    start = time.perf_counter()
    data = b""
    try:
        data = get_upload()
        message = get_message_field()
        info = stego_image.analyze(data)
        png = stego_image.encode(data, message)
    except StegoError as exc:
        logging_service.log_operation(
            operation="encode",
            medium="image",
            status="failure",
            input_size_bytes=len(data),
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    message_bytes = len(message.encode("utf-8"))
    capacity = info.capacity_bytes
    logging_service.log_operation(
        operation="encode",
        medium="image",
        status="success",
        input_size_bytes=len(data),
        output_size_bytes=len(png),
        message_size_bytes=message_bytes,
        capacity_bytes=capacity,
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    response = send_file(
        BytesIO(png),
        mimetype="image/png",
        as_attachment=True,
        download_name="stegolab_encoded.png",
    )
    response.headers["X-Capacity-Bytes"] = str(capacity)
    response.headers["X-Message-Bytes"] = str(message_bytes)
    return response


@bp.post("/image/decode")
@limiter.limit(lambda: current_app.config.get("IMAGE_DECODE_LIMIT", "30/minute"))
def image_decode():
    start = time.perf_counter()
    data = b""
    try:
        data = get_upload()
        message = stego_image.decode(data)
    except StegoError as exc:
        logging_service.log_operation(
            operation="decode",
            medium="image",
            status="failure",
            input_size_bytes=len(data),
            error_code=exc.code,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
        raise

    logging_service.log_operation(
        operation="decode",
        medium="image",
        status="success",
        input_size_bytes=len(data),
        message_size_bytes=len(message.encode("utf-8")),
        duration_ms=int((time.perf_counter() - start) * 1000),
    )
    return jsonify(message=message, medium="image")
