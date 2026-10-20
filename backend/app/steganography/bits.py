"""Bit-level helpers shared by all steganography algorithms.

Pure NumPy + stdlib. Bits are represented as ``numpy.ndarray`` of uint8
values in {0, 1} so they can be OR-ed directly into sample/ pixel arrays.
"""

from __future__ import annotations

import numpy as np


def bytes_to_bits(data: bytes) -> np.ndarray:
    """Convert bytes to an array of bits (MSB-first per byte)."""
    if not data:
        return np.zeros(0, dtype=np.uint8)
    return np.unpackbits(np.frombuffer(data, dtype=np.uint8))


def bits_to_bytes(bits) -> bytes:
    """Convert a bit array (MSB-first per byte) back to bytes.

    The number of bits must be a multiple of 8; anything else means the
    extracted block is malformed and we refuse to guess.
    """
    bits = np.asarray(bits, dtype=np.uint8).reshape(-1)
    if bits.size % 8 != 0:
        raise ValueError(f"bit count {bits.size} is not a multiple of 8")
    if bits.size == 0:
        return b""
    return np.packbits(bits).tobytes()
