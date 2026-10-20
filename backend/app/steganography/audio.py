"""LSB steganography for uncompressed PCM WAV files.

The RIFF container is parsed MANUALLY with ``struct`` so that unknown chunks
(LIST, fact, bext, ...) are preserved byte-for-byte on the way out.

Pure stdlib + NumPy. No Flask.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field

import numpy as np

from ..errors import (
    INVALID_FILE,
    NO_PAYLOAD,
    UNSUPPORTED_FILE_TYPE,
    UNSUPPORTED_WAV_FORMAT,
    StegoError,
    capacity_exceeded,
)
from .bits import bits_to_bytes, bytes_to_bits
from .payload import OVERHEAD_BYTES, build_payload, parse_payload, parse_payload_header

SUPPORTED_BITS = (8, 16, 24, 32)

_NO_PAYLOAD_MSG = "No hidden message was found in this file."
_NOT_WAV_MSG = "The file could not be read as a WAV audio file. Please upload a valid PCM WAV file."
_TRUNCATED_MSG = "The WAV file appears to be truncated or malformed."


@dataclass
class WavInfo:
    audio_format: int
    channels: int
    sample_rate: int
    byte_rate: int
    block_align: int
    bits_per_sample: int
    data_offset: int          # offset of first byte of sample data
    data_size: int            # size of sample data in bytes
    fmt_offset: int = 0
    chunks: list = field(default_factory=list)  # (chunk_id, offset, size) in file order

    @property
    def byte_width(self) -> int:
        return self.bits_per_sample // 8

    @property
    def total_samples(self) -> int:
        return self.data_size // self.byte_width

    @property
    def frames(self) -> int:
        return self.total_samples // self.channels

    @property
    def duration_seconds(self) -> float:
        if not self.sample_rate:
            return 0.0
        return self.frames / self.sample_rate

    @property
    def capacity_bytes(self) -> int:
        return max(0, self.total_samples // 8 - OVERHEAD_BYTES)


def parse_wav(data: bytes) -> WavInfo:
    """Parse a RIFF/WAVE file, walking every chunk properly."""
    if len(data) < 12 or data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise StegoError(UNSUPPORTED_FILE_TYPE, _NOT_WAV_MSG)

    (riff_size,) = struct.unpack_from("<I", data, 4)
    if riff_size + 8 > len(data) + 1:
        # Declared RIFF size runs past the actual bytes -> truncated file.
        raise StegoError(INVALID_FILE, _TRUNCATED_MSG)

    fmt_fields: dict | None = None
    data_offset = -1
    data_size = -1
    fmt_offset = 0
    chunks: list[tuple[bytes, int, int]] = []

    offset = 12
    total = len(data)
    while offset + 8 <= total:
        chunk_id = data[offset : offset + 4]
        (size,) = struct.unpack_from("<I", data, offset + 4)
        body = offset + 8
        if body + size > total:
            raise StegoError(INVALID_FILE, _TRUNCATED_MSG)
        chunks.append((chunk_id, body, size))

        if chunk_id == b"fmt ":
            if size < 16:
                raise StegoError(INVALID_FILE, _TRUNCATED_MSG)
            fmt_offset = body
            fmt_fields = {
                "audio_format": struct.unpack_from("<H", data, body)[0],
                "channels": struct.unpack_from("<H", data, body + 2)[0],
                "sample_rate": struct.unpack_from("<I", data, body + 4)[0],
                "byte_rate": struct.unpack_from("<I", data, body + 8)[0],
                "block_align": struct.unpack_from("<H", data, body + 12)[0],
                "bits_per_sample": struct.unpack_from("<H", data, body + 14)[0],
            }
        elif chunk_id == b"data" and data_offset < 0:
            data_offset = body
            data_size = size

        # Chunks are padded to an even length.
        offset = body + size + (size & 1)

    if fmt_fields is None:
        raise StegoError(INVALID_FILE, "The WAV file has no format (fmt) chunk.")
    if data_offset < 0:
        raise StegoError(INVALID_FILE, "The WAV file has no audio data chunk.")
    if data_size <= 0:
        raise StegoError(INVALID_FILE, "The WAV file contains no audio samples.")

    if fmt_fields["audio_format"] != 1:
        raise StegoError(
            UNSUPPORTED_WAV_FORMAT,
            "Only uncompressed PCM WAV files are supported "
            "(compressed, float and mu-law formats are not).",
        )
    if fmt_fields["channels"] < 1:
        raise StegoError(UNSUPPORTED_WAV_FORMAT, "The WAV file has an invalid channel count.")
    if fmt_fields["bits_per_sample"] not in SUPPORTED_BITS:
        raise StegoError(
            UNSUPPORTED_WAV_FORMAT,
            "Only 8, 16, 24 or 32-bit PCM WAV files are supported.",
        )

    info = WavInfo(
        data_offset=data_offset,
        data_size=data_size,
        fmt_offset=fmt_offset,
        chunks=chunks,
        **fmt_fields,
    )
    expected_align = info.byte_width * info.channels
    if info.block_align != expected_align:
        raise StegoError(INVALID_FILE, "The WAV file has an inconsistent block alignment.")
    if info.data_size % info.byte_width != 0 or info.total_samples < info.channels:
        raise StegoError(INVALID_FILE, _TRUNCATED_MSG)
    return info


def analyze(data: bytes) -> WavInfo:
    return parse_wav(data)


def _embed_into_bytes(sample_bytes: bytearray, byte_width: int, bits: np.ndarray) -> None:
    """Set the LSB of each sample (little-endian: byte 0 of each group)."""
    arr = np.frombuffer(bytes(sample_bytes), dtype=np.uint8).copy()
    lsb_bytes = arr[::byte_width]
    n = min(bits.size, lsb_bytes.size)
    lsb_bytes[:n] = (lsb_bytes[:n] & np.uint8(0xFE)) | bits[:n]
    sample_bytes[:] = arr.tobytes()


def _extract_bytes(sample_bytes: bytes, byte_width: int, nbytes: int) -> bytes:
    arr = np.frombuffer(sample_bytes, dtype=np.uint8)
    lsb_bytes = arr[::byte_width]
    needed = nbytes * 8
    if lsb_bytes.size < needed:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)
    return bits_to_bytes(lsb_bytes[:needed] & np.uint8(0x01))


def encode(wav_bytes: bytes, message: str) -> bytes:
    """Embed a message into a PCM WAV's sample LSBs; returns new WAV bytes."""
    payload = build_payload(message)
    info = parse_wav(wav_bytes)
    if len(payload) > info.capacity_bytes:
        raise capacity_exceeded(info.capacity_bytes)

    samples = bytearray(wav_bytes[info.data_offset : info.data_offset + info.data_size])
    _embed_into_bytes(samples, info.byte_width, bytes_to_bits(payload))

    # Rebuild: bytes before the data chunk body, new samples, then every
    # trailing chunk (plus padding) exactly as it was.
    prefix = wav_bytes[: info.data_offset]
    suffix = wav_bytes[info.data_offset + info.data_size :]
    out = bytearray(prefix)
    out += bytes(samples)
    out += suffix

    # The sample count is unchanged, so the data chunk size stays the same and
    # only the RIFF size field needs refreshing.
    struct.pack_into("<I", out, 4, len(out) - 8)
    return bytes(out)


def decode(wav_bytes: bytes) -> str:
    """Extract and strictly validate a hidden message from a PCM WAV."""
    info = parse_wav(wav_bytes)
    sample_bytes = wav_bytes[info.data_offset : info.data_offset + info.data_size]
    available = info.total_samples // 8
    if available < OVERHEAD_BYTES:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    header = _extract_bytes(sample_bytes, info.byte_width, OVERHEAD_BYTES - 4)
    length = parse_payload_header(header)

    total_needed = OVERHEAD_BYTES + length
    if length == 0 or total_needed > available:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    return parse_payload(_extract_bytes(sample_bytes, info.byte_width, total_needed))
