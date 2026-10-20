"""Shared hidden-payload container format.

Layout (overhead = 18 bytes)::

    MAGIC     8 bytes   ASCII "STEGOLAB"
    VERSION   1 byte    0x01
    TYPE      1 byte    0x01 = UTF-8 text message
    LENGTH    4 bytes   unsigned big-endian, length of MESSAGE
    MESSAGE   N bytes   UTF-8 bytes
    CRC32     4 bytes   unsigned big-endian, CRC32 of MESSAGE

Pure stdlib -- no Flask, no NumPy.
"""

from __future__ import annotations

import struct
import zlib

from ..errors import (
    CORRUPT_PAYLOAD,
    EMPTY_MESSAGE,
    NO_PAYLOAD,
    StegoError,
)

MAGIC = b"STEGOLAB"
VERSION = 0x01
TYPE_TEXT = 0x01
HEADER_SIZE = 18  # 8 + 1 + 1 + 4 + 4 (CRC counted separately; see below)
# Header on the wire: MAGIC(8) + VERSION(1) + TYPE(1) + LENGTH(4) = 14 bytes.
# Full overhead incl. trailing CRC32 = 18 bytes.
HEADER_WIRE_SIZE = 14
OVERHEAD_BYTES = 18


def build_payload(message: str) -> bytes:
    """Build the full payload container for a UTF-8 text message."""
    if not message:
        raise StegoError(EMPTY_MESSAGE, "The message to hide is empty.")
    message_bytes = message.encode("utf-8")
    crc = zlib.crc32(message_bytes) & 0xFFFFFFFF
    return (
        MAGIC
        + bytes([VERSION])
        + bytes([TYPE_TEXT])
        + struct.pack(">I", len(message_bytes))
        + message_bytes
        + struct.pack(">I", crc)
    )


def parse_payload_header(header: bytes) -> int:
    """Validate the 14-byte wire header and return the message LENGTH.

    Raises NO_PAYLOAD for any magic/version/type mismatch so callers can
    safely extract exactly LENGTH + 4 more bytes.
    """
    if len(header) < HEADER_WIRE_SIZE:
        raise StegoError(NO_PAYLOAD, "No hidden message was found in this file.")
    if header[:8] != MAGIC:
        raise StegoError(NO_PAYLOAD, "No hidden message was found in this file.")
    if header[8] != VERSION:
        raise StegoError(NO_PAYLOAD, "The hidden message uses an unsupported format version.")
    if header[9] != TYPE_TEXT:
        raise StegoError(NO_PAYLOAD, "The hidden message uses an unsupported payload type.")
    (length,) = struct.unpack(">I", header[10:14])
    return length


def parse_payload(data: bytes) -> str:
    """Strictly parse a full payload container and return the message."""
    if len(data) < HEADER_WIRE_SIZE:
        raise StegoError(NO_PAYLOAD, "No hidden message was found in this file.")
    if data[:8] != MAGIC:
        raise StegoError(NO_PAYLOAD, "No hidden message was found in this file.")
    length = parse_payload_header(data[:HEADER_WIRE_SIZE])
    total_needed = HEADER_WIRE_SIZE + length + 4
    if length == 0 or total_needed > len(data):
        # LENGTH does not match the bytes actually present (truncated or
        # nonsensical) -- refuse to hand back arbitrary bits.
        raise StegoError(NO_PAYLOAD, "No hidden message was found in this file.")
    message_bytes = data[HEADER_WIRE_SIZE : HEADER_WIRE_SIZE + length]
    (stored_crc,) = struct.unpack(
        ">I", data[HEADER_WIRE_SIZE + length : HEADER_WIRE_SIZE + length + 4]
    )
    if zlib.crc32(message_bytes) & 0xFFFFFFFF != stored_crc:
        raise StegoError(
            CORRUPT_PAYLOAD,
            "The hidden message appears to be damaged or was modified.",
        )
    try:
        return message_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise StegoError(
            CORRUPT_PAYLOAD,
            "The hidden message appears to be damaged or was modified.",
        ) from None
