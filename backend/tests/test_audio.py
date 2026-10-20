"""Unit tests for audio LSB steganography (WAV, pure package)."""

from __future__ import annotations

import io
import struct
import wave

import pytest

from app.errors import (
    INVALID_FILE,
    NO_PAYLOAD,
    StegoError,
    UNSUPPORTED_FILE_TYPE,
    UNSUPPORTED_WAV_FORMAT,
)
from app.steganography import audio as stego_audio

from conftest import make_wav, make_wav_with_list_chunk


def test_16bit_mono_round_trip():
    wav = make_wav(seconds=0.5, channels=1, sampwidth=2)
    stego = stego_audio.encode(wav, "Secret audio message")
    assert stego_audio.decode(stego) == "Secret audio message"


def test_16bit_stereo_round_trip():
    wav = make_wav(seconds=0.5, channels=2, sampwidth=2)
    stego = stego_audio.encode(wav, "Stereo secret")
    info = stego_audio.analyze(stego)
    assert info.channels == 2
    assert stego_audio.decode(stego) == "Stereo secret"


def test_8bit_round_trip():
    wav = make_wav(seconds=1.0, channels=1, sampwidth=1)
    stego = stego_audio.encode(wav, "Eight bit hidden")
    assert stego_audio.decode(stego) == "Eight bit hidden"


def test_24bit_round_trip():
    wav = make_wav(seconds=0.5, channels=1, sampwidth=3)
    stego = stego_audio.encode(wav, "Twenty-four bit secret")
    assert stego_audio.decode(stego) == "Twenty-four bit secret"


def test_32bit_round_trip():
    wav = make_wav(seconds=0.25, channels=1, sampwidth=4)
    stego = stego_audio.encode(wav, "Thirty-two bit secret")
    assert stego_audio.decode(stego) == "Thirty-two bit secret"


@pytest.mark.parametrize(
    "message", ["नमस्ते 🔐 audio", "こんにちは audio", "🔐🔐🔐"]
)
def test_unicode_round_trip(message):
    wav = make_wav(seconds=0.75, channels=1, sampwidth=2)
    stego = stego_audio.encode(wav, message)
    assert stego_audio.decode(stego) == message


def test_extra_chunks_preserved_byte_identical():
    wav, data_offset, data_size = make_wav_with_list_chunk()
    stego = stego_audio.encode(wav, "Chunks stay put")

    # Everything before the data chunk body: byte-identical (incl. fmt, fact, LIST).
    assert stego[:data_offset] == wav[:data_offset]
    # Everything after the data chunk body: byte-identical (incl. trailing chunks).
    assert stego[data_offset + data_size :] == wav[data_offset + data_size :]
    # Same total size (sample count unchanged).
    assert len(stego) == len(wav)
    # The data chunk differs only in LSBs.
    orig_samples = wav[data_offset : data_offset + data_size]
    new_samples = stego[data_offset : data_offset + data_size]
    for i in range(0, data_size, 2):  # 16-bit samples: LSB lives in byte 0
        assert abs(orig_samples[i] - new_samples[i]) <= 1
        assert orig_samples[i + 1] == new_samples[i + 1]
    assert stego_audio.decode(stego) == "Chunks stay put"


def test_list_chunk_survives_decode_after_download_round_trip():
    # Simulate download + re-upload: bytes pass through untouched.
    wav, _, _ = make_wav_with_list_chunk()
    stego = stego_audio.encode(wav, "Round trip")
    reuploaded = bytes(stego)
    assert stego_audio.decode(reuploaded) == "Round trip"


def test_non_pcm_rejected():
    # Craft a WAV whose fmt chunk declares audio_format = 2 (ADPCM).
    fmt = struct.pack("<HHIIHH", 2, 1, 8000, 8000, 2, 16)
    data = b"\x00\x01" * 800
    out = b"RIFF" + struct.pack("<I", 4 + 8 + len(fmt) + 8 + len(data)) + b"WAVE"
    out += b"fmt " + struct.pack("<I", len(fmt)) + fmt
    out += b"data" + struct.pack("<I", len(data)) + data
    with pytest.raises(StegoError) as exc:
        stego_audio.encode(out, "hello")
    assert exc.value.code == UNSUPPORTED_WAV_FORMAT


def test_float32_wav_rejected():
    # WAVE_FORMAT_IEEE_FLOAT = 3.
    fmt = struct.pack("<HHIIHH", 3, 1, 8000, 32000, 4, 32)
    data = b"\x00" * 3200
    out = b"RIFF" + struct.pack("<I", 4 + 8 + len(fmt) + 8 + len(data)) + b"WAVE"
    out += b"fmt " + struct.pack("<I", len(fmt)) + fmt
    out += b"data" + struct.pack("<I", len(data)) + data
    with pytest.raises(StegoError) as exc:
        stego_audio.analyze(out)
    assert exc.value.code == UNSUPPORTED_WAV_FORMAT


def test_truncated_file_rejected():
    wav = make_wav(seconds=0.5, channels=1, sampwidth=2)
    with pytest.raises(StegoError) as exc:
        stego_audio.encode(wav[: len(wav) // 2], "hello")
    assert exc.value.code == INVALID_FILE


def test_non_wav_rejected():
    with pytest.raises(StegoError) as exc:
        stego_audio.encode(b"ID3\x03\x00\x00\x00mp3-ish bytes" * 20, "hello")
    assert exc.value.code == UNSUPPORTED_FILE_TYPE


def test_empty_data_chunk_rejected():
    fmt = struct.pack("<HHIIHH", 1, 1, 8000, 16000, 2, 16)
    out = b"RIFF" + struct.pack("<I", 4 + 8 + len(fmt) + 8) + b"WAVE"
    out += b"fmt " + struct.pack("<I", len(fmt)) + fmt
    out += b"data" + struct.pack("<I", 0)
    with pytest.raises(StegoError) as exc:
        stego_audio.analyze(out)
    assert exc.value.code == INVALID_FILE


def test_decode_without_payload():
    wav = make_wav(seconds=0.5, channels=1, sampwidth=2)
    with pytest.raises(StegoError) as exc:
        stego_audio.decode(wav)
    assert exc.value.code == NO_PAYLOAD


def test_capacity_exceeded():
    from app.errors import CAPACITY_EXCEEDED

    wav = make_wav(seconds=0.05, channels=1, sampwidth=2)  # ~200 samples = 7 bytes capacity
    with pytest.raises(StegoError) as exc:
        stego_audio.encode(wav, "This message is definitely too long for the carrier")
    assert exc.value.code == CAPACITY_EXCEEDED


def test_wave_module_can_read_stego_output():
    wav = make_wav(seconds=0.5, channels=2, sampwidth=2)
    stego = stego_audio.encode(wav, "Still a valid WAV")
    with wave.open(io.BytesIO(stego), "rb") as w:
        assert w.getnchannels() == 2
        assert w.getsampwidth() == 2
        assert w.getframerate() == 8000
        assert w.getnframes() == 4000
