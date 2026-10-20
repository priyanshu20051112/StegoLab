"""Unit tests for the shared payload container format."""

from __future__ import annotations

import struct
import zlib

import pytest

from app.errors import CORRUPT_PAYLOAD, EMPTY_MESSAGE, NO_PAYLOAD, StegoError
from app.steganography.payload import (
    MAGIC,
    OVERHEAD_BYTES,
    VERSION,
    build_payload,
    parse_payload,
)

MESSAGES = [
    "Hello World!",
    "Meet me at 8 PM.",
    "こんにちは",
    "नमस्ते",
    "🔐 Secret message 🚀",
]


@pytest.mark.parametrize("message", MESSAGES)
def test_round_trip(message):
    payload = build_payload(message)
    assert parse_payload(payload) == message


def test_overhead_and_layout():
    message = "abc"
    payload = build_payload(message)
    assert len(payload) == OVERHEAD_BYTES + len(message.encode("utf-8"))
    assert payload[:8] == MAGIC
    assert payload[8] == VERSION
    assert payload[9] == 0x01
    assert struct.unpack(">I", payload[10:14])[0] == 3
    assert payload[14:17] == b"abc"
    assert struct.unpack(">I", payload[17:21])[0] == zlib.crc32(b"abc") & 0xFFFFFFFF


def test_empty_message_rejected():
    with pytest.raises(StegoError) as exc:
        build_payload("")
    assert exc.value.code == EMPTY_MESSAGE


def test_bad_magic_no_payload():
    payload = bytearray(build_payload("hello"))
    payload[0:8] = b"NOTSTEGO"
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == NO_PAYLOAD


def test_bad_version_no_payload():
    payload = bytearray(build_payload("hello"))
    payload[8] = VERSION + 1
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == NO_PAYLOAD


def test_bad_type_no_payload():
    payload = bytearray(build_payload("hello"))
    payload[9] = 0x99
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == NO_PAYLOAD


def test_bad_crc_corrupt_payload():
    payload = bytearray(build_payload("hello world"))
    payload[-1] ^= 0xFF
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == CORRUPT_PAYLOAD


def test_crc_over_message_is_checked():
    # Tamper with the message itself; CRC must catch it.
    payload = bytearray(build_payload("hello world"))
    payload[14] ^= 0x01
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == CORRUPT_PAYLOAD


def test_truncated_data_no_payload():
    payload = build_payload("hello world")
    for cut in (0, 5, 13, 17, len(payload) - 1):
        with pytest.raises(StegoError) as exc:
            parse_payload(payload[:cut])
        assert exc.value.code in (NO_PAYLOAD, CORRUPT_PAYLOAD), cut


def test_nonsensical_length_no_payload():
    payload = bytearray(build_payload("hello"))
    # Claim a huge message length that exceeds the available bytes.
    struct.pack_into(">I", payload, 10, 10_000)
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == NO_PAYLOAD


def test_invalid_utf8_corrupt_payload():
    payload = bytearray(build_payload("hello"))
    payload[14] = 0xFF  # invalid UTF-8 start byte; CRC recomputed so only UTF-8 fails
    message_bytes = bytes(payload[14:19])
    struct.pack_into(">I", payload, 19, zlib.crc32(message_bytes) & 0xFFFFFFFF)
    with pytest.raises(StegoError) as exc:
        parse_payload(bytes(payload))
    assert exc.value.code == CORRUPT_PAYLOAD
