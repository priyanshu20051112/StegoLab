"""Unit tests for image LSB steganography (pure package, no Flask app)."""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image

from app.errors import CAPACITY_EXCEEDED, INVALID_FILE, NO_PAYLOAD, StegoError, UNSUPPORTED_FILE_TYPE
from app.steganography import image as stego_image

from conftest import make_jpeg, make_png, make_rgba_png


def test_round_trip_hello():
    png = make_png(64, 64)
    stego = stego_image.encode(png, "Hello StegoLab!")
    assert stego_image.decode(stego) == "Hello StegoLab!"


def test_jpeg_input_output_is_png():
    jpg = make_jpeg(64, 64)
    stego = stego_image.encode(jpg, "Hidden in a JPEG")
    # Output must be lossless PNG.
    assert stego[:8] == b"\x89PNG\r\n\x1a\n"
    with Image.open(io.BytesIO(stego)) as img:
        assert img.format == "PNG"
    assert stego_image.decode(stego) == "Hidden in a JPEG"


def test_rgba_alpha_preserved_byte_for_byte():
    rgba = make_rgba_png(64, 64)
    stego = stego_image.encode(rgba, "Alpha stays untouched")
    with Image.open(io.BytesIO(rgba)) as orig_img, Image.open(io.BytesIO(stego)) as stego_img:
        assert stego_img.mode == "RGBA"
        orig_alpha = np.asarray(orig_img)[:, :, 3]
        stego_alpha = np.asarray(stego_img)[:, :, 3]
    assert np.array_equal(orig_alpha, stego_alpha)
    assert stego_image.decode(stego) == "Alpha stays untouched"


def test_grayscale_input_works():
    gray = Image.new("L", (64, 64), color=127)
    buf = io.BytesIO()
    gray.save(buf, format="PNG")
    stego = stego_image.encode(buf.getvalue(), "Grayscale carrier")
    assert stego_image.decode(stego) == "Grayscale carrier"


def test_capacity_exceeded():
    png = make_png(24, 24)
    info = stego_image.analyze(png)
    huge = "x" * (info.capacity_bytes + 1)
    with pytest.raises(StegoError) as exc:
        stego_image.encode(png, huge)
    assert exc.value.code == CAPACITY_EXCEEDED
    assert exc.value.http_status == 422


def test_capacity_formula():
    png = make_png(100, 50)
    info = stego_image.analyze(png)
    assert info.width == 100 and info.height == 50
    assert info.capacity_bytes == (100 * 50 * 3) // 8 - 18


@pytest.mark.parametrize(
    "message",
    ["Hello StegoLab!", "🔐 Secret message 🚀", "नमस्ते 🔐", "こんにちは世界"],
)
def test_unicode_round_trip(message):
    stego = stego_image.encode(make_png(96, 96, seed=11), message)
    assert stego_image.decode(stego) == message


def test_lsb_output_differs_only_in_low_bits():
    png = make_png(64, 64)
    stego = stego_image.encode(png, "Low bits only")
    with Image.open(io.BytesIO(png)) as a_img, Image.open(io.BytesIO(stego)) as b_img:
        a = np.asarray(a_img.convert("RGB"), dtype=np.int16)
        b = np.asarray(b_img.convert("RGB"), dtype=np.int16)
    diff = np.abs(a - b)
    assert (diff <= 1).all(), "LSB embedding must only change the least significant bit"
    assert (diff == 1).any(), "Embedding must actually change some pixels"


def test_decode_without_payload():
    with pytest.raises(StegoError) as exc:
        stego_image.decode(make_png(64, 64))
    assert exc.value.code == NO_PAYLOAD


def test_text_file_rejected_as_image():
    with pytest.raises(StegoError) as exc:
        stego_image.encode(b"This is definitely not an image, just text." * 10, "hi")
    assert exc.value.code == UNSUPPORTED_FILE_TYPE


def test_truncated_png_rejected():
    png = make_png(64, 64)
    with pytest.raises(StegoError) as exc:
        stego_image.encode(png[: len(png) // 2], "hi")
    assert exc.value.code in (UNSUPPORTED_FILE_TYPE, INVALID_FILE)


def test_oversized_dimensions_rejected():
    # 13000 x 10 exceeds the max dimension without being a decompression bomb.
    big = Image.new("RGB", (13_000, 2), color=(1, 2, 3))
    buf = io.BytesIO()
    big.save(buf, format="PNG")
    with pytest.raises(StegoError) as exc:
        stego_image.analyze(buf.getvalue())
    assert exc.value.code == INVALID_FILE
