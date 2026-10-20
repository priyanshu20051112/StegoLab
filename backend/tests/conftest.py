"""Shared pytest fixtures and media builders for StegoLab tests."""

from __future__ import annotations

import io
import struct
import wave

import numpy as np
import pytest
from PIL import Image

from app import create_app
from app.config import TestingConfig
from app.extensions import db


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# Image builders (all in memory)
# ---------------------------------------------------------------------------

def make_png(width: int = 64, height: int = 64, seed: int = 1) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="PNG")
    return buf.getvalue()


def make_jpeg(width: int = 64, height: int = 64, seed: int = 2) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def make_rgba_png(width: int = 64, height: int = 64, seed: int = 3) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(height, width, 4), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGBA").save(buf, format="PNG")
    return buf.getvalue()


def make_wav(
    seconds: float = 1.0,
    sample_rate: int = 8000,
    channels: int = 1,
    sampwidth: int = 2,
    seed: int = 4,
) -> bytes:
    """Build a PCM WAV with the stdlib wave module."""
    frames = int(seconds * sample_rate)
    rng = np.random.default_rng(seed)
    if sampwidth == 1:
        samples = rng.integers(0, 256, size=(frames, channels), dtype=np.uint8)
    elif sampwidth == 2:
        samples = rng.integers(-32768, 32768, size=(frames, channels), dtype=np.int16)
    elif sampwidth == 3:
        samples = rng.integers(-(2**23), 2**23, size=(frames, channels), dtype=np.int32)
        raw = samples.astype("<i4").tobytes()
        arr = np.frombuffer(raw, dtype=np.uint8).reshape(frames * channels, 4)[:, :3]
        data = arr.tobytes()
        return _finish_wav_manually(frames, sample_rate, channels, sampwidth, data)
    elif sampwidth == 4:
        samples = rng.integers(-(2**31), 2**31, size=(frames, channels), dtype=np.int32)
    else:
        raise ValueError(sampwidth)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(sampwidth)
        w.setframerate(sample_rate)
        w.writeframes(samples.astype(f"<i{sampwidth}").tobytes())
    return buf.getvalue()


def _finish_wav_manually(
    frames: int, sample_rate: int, channels: int, sampwidth: int, data: bytes
) -> bytes:
    block_align = channels * sampwidth
    byte_rate = sample_rate * block_align
    fmt = struct.pack(
        "<HHIIHH", 1, channels, sample_rate, byte_rate, block_align, sampwidth * 8
    )
    out = b"RIFF" + struct.pack("<I", 4 + 8 + len(fmt) + 8 + len(data)) + b"WAVE"
    out += b"fmt " + struct.pack("<I", len(fmt)) + fmt
    out += b"data" + struct.pack("<I", len(data)) + data
    return out


def make_wav_with_list_chunk(message: str = "Secret audio message") -> tuple[bytes, int, int]:
    """Craft a WAV containing fmt + LIST + data + trailing custom chunk.

    Returns (wav_bytes, data_chunk_body_offset, data_chunk_size) so tests can
    assert byte-identical preservation of headers and non-data chunks.
    """
    sample_rate = 8000
    channels = 1
    sampwidth = 2
    frames = 1600  # 0.2 s
    rng = np.random.default_rng(7)
    samples = rng.integers(-32768, 32768, size=(frames * channels,), dtype=np.int16)
    data = samples.astype("<i2").tobytes()

    block_align = channels * sampwidth
    byte_rate = sample_rate * block_align
    fmt = struct.pack(
        "<HHIIHH", 1, channels, sample_rate, byte_rate, block_align, sampwidth * 8
    )
    list_body = b"INFO" + b"INAM" + struct.pack("<I", 12) + b"StegoTest\x00\x00\x00"
    if len(list_body) & 1:
        list_body += b"\x00"
    fact_body = struct.pack("<I", frames)
    custom_id = b"cust"
    custom_body = b"keep-me!"
    if len(custom_body) & 1:
        custom_body += b"\x00"

    out = bytearray(b"RIFF")
    out += struct.pack("<I", 0)  # placeholder for RIFF size
    out += b"WAVE"
    out += b"fmt " + struct.pack("<I", len(fmt)) + fmt
    out += b"fact" + struct.pack("<I", len(fact_body)) + fact_body
    out += b"LIST" + struct.pack("<I", len(list_body)) + list_body
    data_offset = len(out) + 8
    out += b"data" + struct.pack("<I", len(data)) + data
    out += custom_id + struct.pack("<I", len(custom_body)) + custom_body
    struct.pack_into("<I", out, 4, len(out) - 8)
    return bytes(out), data_offset, len(data)


def upload(client, url: str, data: bytes, filename: str, content_type: str = "application/octet-stream", message: str | None = None):
    """POST a multipart body to the test client."""
    payload = {"file": (io.BytesIO(data), filename, content_type)}
    if message is not None:
        payload["message"] = message
    return client.post(url, data=payload, content_type="multipart/form-data")
