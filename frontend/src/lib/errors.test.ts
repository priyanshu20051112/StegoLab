import { describe, expect, it } from "vitest";
import { ApiError, isAbortError, mapErrorCode, toFriendlyMessage } from "./errors";

describe("mapErrorCode", () => {
  it("maps every known code to its friendly message", () => {
    expect(mapErrorCode("NETWORK_ERROR")).toBe(
      "Cannot reach the StegoLab server. Please check your connection and try again.",
    );
    expect(mapErrorCode("FILE_TOO_LARGE")).toBe(
      "This file is too large. The maximum supported size is 10 MB per file.",
    );
    expect(mapErrorCode("UNSUPPORTED_FILE_TYPE")).toBe(
      "That file type isn't supported. Please choose a PNG, BMP, JPG, or JPEG image, or a WAV audio file.",
    );
    expect(mapErrorCode("UNSUPPORTED_WAV_FORMAT")).toMatch(
      /unsupported encoding/i,
    );
    expect(mapErrorCode("INVALID_FILE")).toMatch(/couldn't be read/i);
    expect(mapErrorCode("CAPACITY_EXCEEDED")).toMatch(/too large/i);
    expect(mapErrorCode("EMPTY_MESSAGE")).toMatch(/secret message/i);
    expect(mapErrorCode("EMPTY_COVER_TEXT")).toMatch(/cover text/i);
    expect(mapErrorCode("CORRUPT_PAYLOAD")).toMatch(/appears damaged/i);
    expect(mapErrorCode("RATE_LIMITED")).toMatch(/too many requests/i);
    expect(mapErrorCode("INTERNAL_ERROR")).toMatch(/unexpected error/i);
  });

  it("tailors NO_PAYLOAD and UNSUPPORTED_FILE_TYPE to the medium", () => {
    expect(mapErrorCode("NO_PAYLOAD", "image")).toBe(
      "No valid hidden message was detected in this image.",
    );
    expect(mapErrorCode("NO_PAYLOAD", "audio")).toBe(
      "No valid hidden message was detected in this audio file.",
    );
    expect(mapErrorCode("NO_PAYLOAD", "text")).toBe(
      "No valid hidden message was detected in this text.",
    );
    expect(mapErrorCode("UNSUPPORTED_FILE_TYPE", "audio")).toMatch(
      /WAV audio file/,
    );
    expect(mapErrorCode("UNSUPPORTED_FILE_TYPE", "image")).toMatch(
      /PNG, BMP, JPG/,
    );
  });

  it("falls back for unknown codes", () => {
    // Unknown code with a backend message → backend message is the fallback.
    expect(mapErrorCode("MYSTERY_CODE", undefined, "Backend said no.")).toBe(
      "Backend said no.",
    );
    // Unknown code with no message → generic fallback.
    expect(mapErrorCode(undefined)).toBe(
      "Something went wrong while processing your request. Please try again.",
    );
    expect(mapErrorCode(null, "image", "  ")).toBe(
      "Something went wrong while processing your request. Please try again.",
    );
    expect(mapErrorCode("SOMETHING_NEW")).toBe(
      "Something went wrong while processing your request. Please try again.",
    );
  });
});

describe("ApiError", () => {
  it("carries code, message and status", () => {
    const error = new ApiError("CAPACITY_EXCEEDED", "too big", 422);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.code).toBe("CAPACITY_EXCEEDED");
    expect(error.message).toBe("too big");
    expect(error.status).toBe(422);
  });
});

describe("toFriendlyMessage", () => {
  it("prefers the mapped code message", () => {
    expect(
      toFriendlyMessage(new ApiError("RATE_LIMITED", "slow down", 429), "audio"),
    ).toMatch(/too many requests/i);
  });

  it("returns an empty string for aborts and a fallback otherwise", () => {
    const abort = new DOMException("aborted", "AbortError");
    expect(toFriendlyMessage(abort)).toBe("");
    expect(toFriendlyMessage(new Error("boom"))).toMatch(/unexpected error/i);
  });
});

describe("isAbortError", () => {
  it("detects AbortError-shaped values only", () => {
    expect(isAbortError(new DOMException("x", "AbortError"))).toBe(true);
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError(new ApiError("NETWORK_ERROR", "x"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
