"""LSB steganography for images (pure Pillow + NumPy, no Flask)."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image

from ..errors import (
    INVALID_FILE,
    NO_PAYLOAD,
    UNSUPPORTED_FILE_TYPE,
    StegoError,
    capacity_exceeded,
)
from .bits import bits_to_bytes, bytes_to_bits
from .payload import OVERHEAD_BYTES, build_payload, parse_payload, parse_payload_header

# Hard limits to defend against decompression bombs.
Image.MAX_IMAGE_PIXELS = 40_000_000
MAX_PIXELS = 40_000_000
MAX_DIMENSION = 12_000

_NO_PAYLOAD_MSG = "No hidden message was found in this file."
_UNREADABLE_MSG = (
    "The file could not be read as an image. "
    "Please upload a valid PNG, JPEG, BMP, GIF or TIFF image."
)
_TOO_LARGE_MSG = "This image is too large to process safely. Please upload a smaller image."


@dataclass(frozen=True)
class ImageInfo:
    width: int
    height: int
    mode: str
    has_alpha: bool
    capacity_bytes: int
    size_bytes: int


def _open_image(data: bytes) -> Image.Image:
    """Open upload bytes by CONTENT (never by extension/MIME)."""
    try:
        img = Image.open(BytesIO(data))
    except Image.DecompressionBombError:
        raise StegoError(INVALID_FILE, _TOO_LARGE_MSG) from None
    except Exception:
        raise StegoError(UNSUPPORTED_FILE_TYPE, _UNREADABLE_MSG) from None

    if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
        raise StegoError(
            INVALID_FILE,
            f"This image is too large to process safely (max dimension {MAX_DIMENSION}px).",
        )
    if img.width * img.height > MAX_PIXELS:
        raise StegoError(INVALID_FILE, _TOO_LARGE_MSG)
    try:
        img.load()
    except Image.DecompressionBombError:
        raise StegoError(INVALID_FILE, _TOO_LARGE_MSG) from None
    except Exception:
        raise StegoError(UNSUPPORTED_FILE_TYPE, _UNREADABLE_MSG) from None
    return img


def _prepare(img: Image.Image) -> Image.Image:
    """Normalize to RGB or RGBA, preserving alpha byte-for-byte when present.

    Alpha is NEVER used for embedding -- only R, G and B carry payload bits.
    """
    if img.mode == "P":
        # Palette images: keep transparency as alpha if present.
        img = img.convert("RGBA" if "transparency" in img.info else "RGB")
    elif img.mode == "RGBA":
        pass
    elif img.mode == "LA":
        img = img.convert("RGBA")
    elif img.mode != "RGB":
        # Grayscale, CMYK, YCbCr, I, F, ... -> RGB
        img = img.convert("RGB")
    return img


def _split_rgb(img: Image.Image) -> tuple[np.ndarray, np.ndarray | None]:
    """Return a C-contiguous (h, w, 3) uint8 array plus a copy of alpha (or None)."""
    arr = np.array(img)  # copy: Pillow-backed arrays are read-only
    if arr.ndim != 3 or arr.shape[2] not in (3, 4):
        arr = np.array(img.convert("RGB"))
    if arr.shape[2] == 4:
        return np.ascontiguousarray(arr[:, :, :3]), arr[:, :, 3].copy()
    return np.ascontiguousarray(arr), None


def _capacity_bytes(width: int, height: int) -> int:
    return max(0, (width * height * 3) // 8 - OVERHEAD_BYTES)


def analyze(data: bytes) -> ImageInfo:
    """Validate an image and report its embedding capacity."""
    img = _prepare(_open_image(data))
    return ImageInfo(
        width=img.width,
        height=img.height,
        mode=img.mode,
        has_alpha=img.mode == "RGBA",
        capacity_bytes=_capacity_bytes(img.width, img.height),
        size_bytes=len(data),
    )


def encode(image_bytes: bytes, message: str) -> bytes:
    """Embed ``message`` into the image's RGB LSBs; returns lossless PNG bytes."""
    payload = build_payload(message)
    img = _prepare(_open_image(image_bytes))
    capacity = _capacity_bytes(img.width, img.height)
    if len(payload) > capacity:
        raise capacity_exceeded(capacity)

    rgb, alpha = _split_rgb(img)
    flat = rgb.reshape(-1)  # rgb is C-contiguous -> this is a view
    bits = bytes_to_bits(payload)
    flat[: bits.size] = (flat[: bits.size] & np.uint8(0xFE)) | bits

    if alpha is not None:
        out = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")
    else:
        out = Image.fromarray(rgb, "RGB")

    buffer = BytesIO()
    out.save(buffer, format="PNG")
    return buffer.getvalue()


def decode(image_bytes: bytes) -> str:
    """Extract and strictly validate a hidden message from an image."""
    img = _prepare(_open_image(image_bytes))
    rgb, _ = _split_rgb(img)
    flat = rgb.reshape(-1)

    available_bytes = int(flat.size) // 8
    if available_bytes < OVERHEAD_BYTES:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    # First 14 bytes = wire header; validate before trusting LENGTH.
    header = bits_to_bytes(flat[: (OVERHEAD_BYTES - 4) * 8] & np.uint8(0x01))
    length = parse_payload_header(header)

    total_needed = OVERHEAD_BYTES + length
    if length == 0 or total_needed > available_bytes:
        raise StegoError(NO_PAYLOAD, _NO_PAYLOAD_MSG)

    all_bits = flat[: total_needed * 8] & np.uint8(0x01)
    return parse_payload(bits_to_bytes(all_bits))
