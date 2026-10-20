"""End-to-end API tests via the Flask test client."""

from __future__ import annotations

import io
import json

import pytest

from app import create_app
from app.config import Config, TestingConfig
from app.extensions import db
from app.models import OperationLog
from app.services import logging_service

from conftest import make_jpeg, make_png, make_rgba_png, make_wav, make_wav_with_list_chunk, upload


# ---------------------------------------------------------------------------
# Image endpoints
# ---------------------------------------------------------------------------

def test_image_capacity(client):
    resp = upload(client, "/api/image/capacity", make_png(64, 64), "carrier.png")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["width"] == 64
    assert body["height"] == 64
    assert body["capacity_bytes"] == (64 * 64 * 3) // 8 - 18
    assert body["size_bytes"] > 0
    assert resp.content_type == "application/json"


def test_image_encode_decode_round_trip(client):
    resp = upload(
        client, "/api/image/encode", make_png(64, 64), "carrier.png", message="Hello StegoLab!"
    )
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "image/png"
    assert "stegolab_encoded.png" in resp.headers["Content-Disposition"]
    assert int(resp.headers["X-Message-Bytes"]) == len("Hello StegoLab!")
    assert int(resp.headers["X-Capacity-Bytes"]) == (64 * 64 * 3) // 8 - 18
    stego = resp.data

    # Download/re-upload round trip: feed the bytes back in.
    resp2 = upload(client, "/api/image/decode", stego, "stegolab_encoded.png")
    assert resp2.status_code == 200
    assert resp2.get_json() == {"message": "Hello StegoLab!", "medium": "image"}


def test_image_encode_unicode(client):
    msg = "🔐 Secret message 🚀 नमस्ते"
    resp = upload(client, "/api/image/encode", make_png(96, 96), "c.png", message=msg)
    assert resp.status_code == 200
    resp2 = upload(client, "/api/image/decode", resp.data, "s.png")
    assert resp2.get_json()["message"] == msg


def test_image_missing_file(client):
    resp = client.post("/api/image/encode", data={"message": "hi"}, content_type="multipart/form-data")
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "MISSING_FILE"


def test_image_text_file_as_image_415(client):
    resp = upload(client, "/api/image/encode", b"just some plain text, not an image at all" * 5, "notes.txt", message="hi")
    assert resp.status_code == 415
    assert resp.get_json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_image_empty_message(client):
    resp = upload(client, "/api/image/encode", make_png(64, 64), "c.png", message="")
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "EMPTY_MESSAGE"


def test_image_missing_message_field(client):
    resp = upload(client, "/api/image/encode", make_png(64, 64), "c.png")
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_image_capacity_exceeded(client):
    small = make_png(24, 24)
    resp = upload(client, "/api/image/encode", small, "c.png", message="x" * 500)
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "CAPACITY_EXCEEDED"


def test_image_decode_no_payload(client):
    resp = upload(client, "/api/image/decode", make_png(64, 64), "c.png")
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "NO_PAYLOAD"


def test_image_jpeg_input(client):
    resp = upload(client, "/api/image/encode", make_jpeg(64, 64), "photo.jpg", message="From a JPEG")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "image/png"
    resp2 = upload(client, "/api/image/decode", resp.data, "s.png")
    assert resp2.get_json()["message"] == "From a JPEG"


# ---------------------------------------------------------------------------
# Audio endpoints
# ---------------------------------------------------------------------------

def test_audio_capacity(client):
    resp = upload(client, "/api/audio/capacity", make_wav(0.5, 8000, 2, 2), "a.wav")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["channels"] == 2
    assert body["sample_rate"] == 8000
    assert body["bits_per_sample"] == 16
    assert abs(body["duration_seconds"] - 0.5) < 0.001
    assert body["capacity_bytes"] == (4000 * 2) // 8 - 18
    assert body["size_bytes"] > 0


def test_audio_encode_decode_round_trip(client):
    wav = make_wav(0.5, 8000, 1, 2)
    resp = upload(client, "/api/audio/encode", wav, "a.wav", message="Secret audio message")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "audio/x-wav"
    assert "stegolab_encoded.wav" in resp.headers["Content-Disposition"]
    assert int(resp.headers["X-Message-Bytes"]) == len("Secret audio message")

    resp2 = upload(client, "/api/audio/decode", resp.data, "stegolab_encoded.wav")
    assert resp2.status_code == 200
    assert resp2.get_json() == {"message": "Secret audio message", "medium": "audio"}


def test_audio_encode_unicode(client):
    msg = "नमस्ते 🔐 ऑडियो"
    resp = upload(client, "/api/audio/encode", make_wav(0.75, 8000, 1, 2), "a.wav", message=msg)
    assert resp.status_code == 200
    resp2 = upload(client, "/api/audio/decode", resp.data, "s.wav")
    assert resp2.get_json()["message"] == msg


def test_audio_missing_file(client):
    resp = client.post("/api/audio/decode", data={}, content_type="multipart/form-data")
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "MISSING_FILE"


def test_audio_non_wav_415(client):
    resp = upload(client, "/api/audio/encode", b"OggS\x00\x00\x00\x00not a wav file" * 10, "song.ogg", message="hi")
    assert resp.status_code == 415
    assert resp.get_json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_audio_non_pcm_415(client):
    import struct as _struct

    fmt = _struct.pack("<HHIIHH", 2, 1, 8000, 8000, 2, 16)
    data = b"\x00\x01" * 800
    out = b"RIFF" + _struct.pack("<I", 4 + 8 + len(fmt) + 8 + len(data)) + b"WAVE"
    out += b"fmt " + _struct.pack("<I", len(fmt)) + fmt
    out += b"data" + _struct.pack("<I", len(data)) + data
    resp = upload(client, "/api/audio/encode", out, "adpcm.wav", message="hi")
    assert resp.status_code == 415
    assert resp.get_json()["error"]["code"] == "UNSUPPORTED_WAV_FORMAT"


def test_audio_empty_message(client):
    resp = upload(client, "/api/audio/encode", make_wav(0.5), "a.wav", message="")
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "EMPTY_MESSAGE"


def test_audio_decode_no_payload(client):
    resp = upload(client, "/api/audio/decode", make_wav(0.5), "a.wav")
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "NO_PAYLOAD"


# ---------------------------------------------------------------------------
# Text endpoints
# ---------------------------------------------------------------------------

def test_text_encode_decode_round_trip(client):
    resp = client.post(
        "/api/text/encode",
        json={"cover_text": "Meet me at the library tomorrow.", "message": "The password is 12345."},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    stego = body["stego_text"]
    assert "invisible characters" in body["capacity_note"]
    assert "18 bytes" in body["capacity_note"]

    resp2 = client.post("/api/text/decode", json={"stego_text": stego})
    assert resp2.status_code == 200
    assert resp2.get_json() == {"message": "The password is 12345.", "medium": "text"}

    # Visible text preserved exactly.
    stripped = "".join(ch for ch in stego if ch not in ("\u200b", "\u200c", "\u200d"))
    assert stripped == "Meet me at the library tomorrow."


def test_text_unicode_round_trip(client):
    msg = "🔐 Secret message 🚀"
    resp = client.post("/api/text/encode", json={"cover_text": "A visible cover.", "message": msg})
    assert resp.status_code == 200
    resp2 = client.post("/api/text/decode", json={"stego_text": resp.get_json()["stego_text"]})
    assert resp2.get_json()["message"] == msg


def test_text_bad_json(client):
    resp = client.post(
        "/api/text/encode",
        data="{not json",
        content_type="application/json",
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_text_missing_fields(client):
    resp = client.post("/api/text/encode", json={"message": "hi"})
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"

    resp = client.post("/api/text/encode", json={"cover_text": "cover"})
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_text_empty_cover(client):
    resp = client.post("/api/text/encode", json={"cover_text": "", "message": "hi"})
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "EMPTY_COVER_TEXT"


def test_text_empty_message(client):
    resp = client.post("/api/text/encode", json={"cover_text": "cover", "message": ""})
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "EMPTY_MESSAGE"


def test_text_decode_no_payload(client):
    resp = client.post("/api/text/decode", json={"stego_text": "Nothing hidden here."})
    assert resp.status_code == 422
    assert resp.get_json()["error"]["code"] == "NO_PAYLOAD"


# ---------------------------------------------------------------------------
# Meta endpoints
# ---------------------------------------------------------------------------

def test_stats_shape(client):
    # Generate one success of each (operation, medium) plus a failure.
    upload(client, "/api/image/encode", make_png(64, 64), "c.png", message="hi")
    upload(client, "/api/image/decode", make_png(64, 64), "c.png")  # fails: NO_PAYLOAD
    wav = make_wav(0.5)
    enc = upload(client, "/api/audio/encode", wav, "a.wav", message="audio hi")
    upload(client, "/api/audio/decode", enc.data, "s.wav")
    client.post("/api/text/encode", json={"cover_text": "cover", "message": "hi"})

    resp = client.get("/api/stats")
    assert resp.status_code == 200
    body = resp.get_json()
    assert set(body) == {"encoded", "decoded", "failed", "by_medium"}
    # image encode, audio encode, text encode all succeeded
    assert body["encoded"] == 3
    assert body["decoded"] == 1  # audio decode
    assert body["failed"] >= 1  # image decode NO_PAYLOAD
    assert body["by_medium"]["image"] == {"encoded": 1, "decoded": 0}
    assert body["by_medium"]["audio"] == {"encoded": 1, "decoded": 1}
    assert body["by_medium"]["text"] == {"encoded": 1, "decoded": 0}


def test_health_shape(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["database"] in ("up", "down")


# ---------------------------------------------------------------------------
# Hardening
# ---------------------------------------------------------------------------

def test_413_when_file_too_large():
    class TinyUploadConfig(TestingConfig):
        MAX_UPLOAD_MB = 1
        MAX_CONTENT_LENGTH = 2048  # tiny, to trigger 413 quickly

    app = create_app(TinyUploadConfig)
    with app.app_context():
        db.create_all()
        client = app.test_client()
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8192
        resp = upload(client, "/api/image/encode", big, "big.png", message="hi")
        assert resp.status_code == 413
        body = resp.get_json()
        assert body["error"]["code"] == "FILE_TOO_LARGE"
        assert "too large" in body["error"]["message"]
        db.session.remove()
        db.drop_all()


def test_429_rate_limited():
    class RateLimitedConfig(TestingConfig):
        RATELIMIT_ENABLED = True
        IMAGE_ENCODE_LIMIT = "2/minute"

    app = create_app(RateLimitedConfig)
    with app.app_context():
        db.create_all()
        client = app.test_client()
        png = make_png(32, 32)
        codes = []
        for _ in range(3):
            resp = upload(client, "/api/image/encode", png, "c.png", message="hello")
            codes.append(resp.status_code)
        assert codes == [200, 200, 429]
        # The 429 response body must follow the standard error shape.
        # (Grab the last response again via a 4th call to inspect headers.)
        resp = upload(client, "/api/image/encode", png, "c.png", message="hello")
        assert resp.status_code == 429
        assert resp.get_json()["error"]["code"] == "RATE_LIMITED"
        assert "Retry-After" in resp.headers
        db.session.remove()
        db.drop_all()


def test_operations_work_when_db_write_fails(monkeypatch, client):
    class FailingSession:
        def add(self, obj):
            pass

        def commit(self):
            raise RuntimeError("database is down")

        def rollback(self):
            pass

    class FakeDB:
        session = FailingSession()

    monkeypatch.setattr(logging_service, "db", FakeDB())

    # Encoding must still succeed even though logging fails.
    png = make_png(64, 64)
    resp = upload(client, "/api/image/encode", png, "c.png", message="DB down secret")
    assert resp.status_code == 200
    resp2 = upload(client, "/api/image/decode", resp.data, "s.png")
    assert resp2.status_code == 200
    assert resp2.get_json()["message"] == "DB down secret"

    # Text and audio too.
    resp = client.post("/api/text/encode", json={"cover_text": "cover", "message": "hi"})
    assert resp.status_code == 200
    resp = upload(client, "/api/audio/encode", make_wav(0.5), "a.wav", message="hi")
    assert resp.status_code == 200


def test_logs_never_contain_message_content(client):
    secret = "TOP-SECRET-CANARY-9f3a2b"
    png = make_png(64, 64)
    resp = upload(client, "/api/image/encode", png, "c.png", message=secret)
    assert resp.status_code == 200
    upload(client, "/api/image/decode", resp.data, "s.png")  # success
    upload(client, "/api/image/decode", png, "c.png")  # NO_PAYLOAD failure

    with client.application.app_context():
        rows = db.session.query(OperationLog).all()
        assert len(rows) >= 3  # encode success, decode success, decode failure
        for row in rows:
            values = [
                str(row.id),
                str(row.operation),
                str(row.medium),
                str(row.status),
                str(row.error_code),
                str(row.input_size_bytes),
                str(row.output_size_bytes),
                str(row.message_size_bytes),
                str(row.capacity_bytes),
                str(row.duration_ms),
            ]
            blob = " ".join(values)
            assert secret not in blob
            assert "stegolab" not in blob.lower().replace("stegolab_encoded", "")
        # Sanity: columns exist and sizes are recorded as metadata only.
        success = [r for r in rows if r.status == "success" and r.operation == "encode"]
        assert all(r.message_size_bytes is not None for r in success)
