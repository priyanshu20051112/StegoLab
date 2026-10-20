"""Unit tests for zero-width text steganography (pure package)."""

from __future__ import annotations

import pytest

from app.errors import (
    CORRUPT_PAYLOAD,
    EMPTY_COVER_TEXT,
    EMPTY_MESSAGE,
    NO_PAYLOAD,
    StegoError,
)
from app.steganography import text as stego_text
from app.steganography.payload import build_payload


def strip_zero_width(text: str) -> str:
    return "".join(ch for ch in text if ch not in ("\u200b", "\u200c", "\u200d"))


def test_round_trip():
    cover = "Meet me at the library tomorrow."
    secret = "The password is 12345."
    stego = stego_text.encode(cover, secret)
    assert stego_text.decode(stego) == secret


def test_visible_text_unchanged():
    cover = "Meet me at the library tomorrow."
    stego = stego_text.encode(cover, "The password is 12345.")
    assert strip_zero_width(stego) == cover


def test_block_placed_after_first_visible_char():
    cover = "AB"
    stego = stego_text.encode(cover, "hi")
    visible_positions = [i for i, ch in enumerate(stego) if ch in ("A", "B")]
    assert visible_positions[0] < visible_positions[1]
    # First visible char is immediately followed by the block start (ZWJ).
    assert stego[visible_positions[0] + 1] == "\u200d"


def test_malformed_block_odd_bits():
    cover = "Meet me at the library tomorrow."
    stego = stego_text.encode(cover, "The password is 12345.")
    start = stego.find("\u200d")
    end = stego.find("\u200d", start + 1)
    # Remove one zero-width char to make the bit count non-multiple-of-8.
    damaged = stego[: end - 1] + stego[end:]
    with pytest.raises(StegoError) as exc:
        stego_text.decode(damaged)
    assert exc.value.code == CORRUPT_PAYLOAD


def test_malformed_block_flipped_char_is_corrupt():
    cover = "Meet me at the library tomorrow."
    stego = stego_text.encode(cover, "The password is 12345.")
    start = stego.find("\u200d")
    # Replace a bit char with a visible letter -> damaged block.
    idx = start + 1
    damaged = stego[:idx] + "X" + stego[idx + 1 :]
    with pytest.raises(StegoError) as exc:
        stego_text.decode(damaged)
    assert exc.value.code == CORRUPT_PAYLOAD


def test_no_block_no_payload():
    with pytest.raises(StegoError) as exc:
        stego_text.decode("Just an ordinary sentence with no secrets.")
    assert exc.value.code == NO_PAYLOAD


def test_stripped_bit_corruption_detected():
    # Flipping a bit inside the message bytes must trip the CRC.
    cover = "Meet me at the library tomorrow."
    stego = stego_text.encode(cover, "The password is 12345.")
    start = stego.find("\u200d")
    end = stego.find("\u200d", start + 1)
    block = stego[start + 1 : end]
    # Skip the 14-byte header; flip a bit within the message region.
    offset = 14 * 8
    if "\u200b" in block[offset:]:
        idx = block.index("\u200b", offset)
        flipped = "\u200c"
    else:
        idx = block.index("\u200c", offset)
        flipped = "\u200b"
    tampered_block = block[:idx] + flipped + block[idx + 1 :]
    tampered = stego[: start + 1] + tampered_block + stego[end:]
    with pytest.raises(StegoError) as exc:
        stego_text.decode(tampered)
    assert exc.value.code == CORRUPT_PAYLOAD


def test_stray_zero_width_outside_block_ignored():
    cover = "Meet me at the library tomorrow."
    stego = stego_text.encode(cover, "Secret.")
    noisy = "\u200b\u200c" + stego + "\u200b\u200c"
    assert stego_text.decode(noisy) == "Secret."
    assert strip_zero_width(noisy) == cover


def test_empty_cover_rejected():
    with pytest.raises(StegoError) as exc:
        stego_text.encode("", "secret")
    assert exc.value.code == EMPTY_COVER_TEXT


def test_empty_message_rejected():
    with pytest.raises(StegoError) as exc:
        stego_text.encode("cover text", "")
    assert exc.value.code == EMPTY_MESSAGE


@pytest.mark.parametrize(
    "secret",
    ["Hello World!", "Meet me at 8 PM.", "こんにちは", "नमस्ते", "🔐 Secret message 🚀"],
)
def test_unicode_round_trip(secret):
    cover = "A short but visible cover text."
    stego = stego_text.encode(cover, secret)
    assert stego_text.decode(stego) == secret
    assert strip_zero_width(stego) == cover


def test_cover_with_existing_zero_width_preserved():
    cover = "we\u200bird spacing"
    stego = stego_text.encode(cover, "hidden")
    # Stray zero-width chars from the cover are preserved in order.
    assert strip_zero_width(stego) == "weird spacing"
    assert stego_text.decode(stego) == "hidden"


def test_hidden_block_char_count_matches_output():
    cover = "Meet me at the library tomorrow."
    secret = "The password is 12345."
    stego = stego_text.encode(cover, secret)
    payload_size = len(build_payload(secret))
    assert len(stego) - len(cover) == stego_text.hidden_block_char_count(payload_size)
