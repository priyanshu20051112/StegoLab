"""Zero-width steganography for UTF-8 text (pure stdlib, no Flask).

Encoding map::

    U+200B ZERO WIDTH SPACE  -> bit 0
    U+200C ZERO WIDTH NON-JOINER -> bit 1
    U+200D ZERO WIDTH JOINER  -> start/end delimiter around the hidden block
"""

from __future__ import annotations

from ..errors import (
    CORRUPT_PAYLOAD,
    EMPTY_COVER_TEXT,
    EMPTY_MESSAGE,
    NO_PAYLOAD,
    StegoError,
)
from .bits import bits_to_bytes, bytes_to_bits
from .payload import OVERHEAD_BYTES, build_payload, parse_payload, parse_payload_header

ZWSP = "\u200b"
ZWNJ = "\u200c"
ZWJ = "\u200d"
_ZERO_WIDTH = {ZWSP, ZWNJ, ZWJ}

_NO_PAYLOAD_MSG = "No hidden message was found in this text."
_CORRUPT_MSG = "The hidden message appears to be damaged or was modified."


def encode(cover_text: str, message: str) -> str:
    """Hide ``message`` inside ``cover_text`` using zero-width characters.

    The visible characters of the cover are preserved exactly and in order;
    the hidden block is inserted immediately after the first visible
    character (or at position 0 if the cover has none).
    """
    if not cover_text:
        raise StegoError(EMPTY_COVER_TEXT, "The cover text is empty. Provide some text to hide the message in.")
    if not message:
        raise StegoError(EMPTY_MESSAGE, "The message to hide is empty.")

    payload = build_payload(message)
    bits = bytes_to_bits(payload)
    chars = "".join(ZWSP if b == 0 else ZWNJ for b in bits)
    block = ZWJ + chars + ZWJ

    for i, ch in enumerate(cover_text):
        if ch not in _ZERO_WIDTH:
            return cover_text[: i + 1] + block + cover_text[i + 1 :]
    # Cover consists solely of zero-width characters -> insert at the start.
    return block + cover_text


def decode(stego_text: str) -> str:
    """Extract and strictly validate a hidden message from stego text."""
    start = stego_text.find(ZWJ)
    if start == -1:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)
    end = stego_text.find(ZWJ, start + 1)
    if end == -1:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    content = stego_text[start + 1 : end]
    bits: list[int] = []
    for ch in content:
        if ch == ZWSP:
            bits.append(0)
        elif ch == ZWNJ:
            bits.append(1)
        else:
            # Anything else between the delimiters (visible text or a stray
            # zero-width) means the block is damaged.
            raise StegoError(CORRUPT_PAYLOAD, _CORRUPT_MSG)

    if len(bits) % 8 != 0:
        raise StegoError(CORRUPT_PAYLOAD, _CORRUPT_MSG)
    if len(bits) // 8 < OVERHEAD_BYTES:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    header = bits_to_bytes(bits[: (OVERHEAD_BYTES - 4) * 8])
    length = parse_payload_header(header)

    total_bits = (OVERHEAD_BYTES + length) * 8
    if length == 0 or len(bits) < total_bits:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    return parse_payload(bits_to_bytes(bits[:total_bits]))


def hidden_block_char_count(payload_size: int) -> int:
    """Number of invisible characters a payload of ``payload_size`` bytes adds."""
    return payload_size * 8 + 2
