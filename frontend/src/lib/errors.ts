import type { Medium } from "@/types";

/**
 * Error thrown by the API client for any non-success response, including
 * transport-level failures (code NETWORK_ERROR, status 0).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** True when an error originates from an AbortController cancellation. */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (error as { name?: unknown }).name === "AbortError";
}

const FALLBACK =
  "Something went wrong while processing your request. Please try again.";

function noPayloadMessage(medium?: Medium): string {
  switch (medium) {
    case "image":
      return "No valid hidden message was detected in this image.";
    case "audio":
      return "No valid hidden message was detected in this audio file.";
    case "text":
      return "No valid hidden message was detected in this text.";
    default:
      return "No valid hidden message was detected in this file.";
  }
}

function unsupportedTypeMessage(medium?: Medium): string {
  switch (medium) {
    case "image":
      return "That file type isn't supported. Please choose a PNG, BMP, JPG, or JPEG image.";
    case "audio":
      return "That file type isn't supported. Please choose a WAV audio file.";
    default:
      return "That file type isn't supported. Please choose a PNG, BMP, JPG, or JPEG image, or a WAV audio file.";
  }
}

/**
 * Maps a backend error code to the single, friendly message shown in the UI.
 * Backend messages are only used as a fallback for unknown codes.
 */
export function mapErrorCode(
  code?: string | null,
  medium?: Medium,
  backendMessage?: string | null,
): string {
  switch (code) {
    case "NETWORK_ERROR":
      return "Cannot reach the StegoLab server. Please check your connection and try again.";
    case "FILE_TOO_LARGE":
      return "This file is too large. The maximum supported size is 10 MB per file.";
    case "UNSUPPORTED_FILE_TYPE":
      return unsupportedTypeMessage(medium);
    case "UNSUPPORTED_WAV_FORMAT":
      return "This WAV file uses an unsupported encoding. StegoLab only supports uncompressed PCM WAV files — lossy formats like MP3 destroy hidden data.";
    case "INVALID_FILE":
      return "This file couldn't be read. It may be corrupted or not a valid media file.";
    case "CAPACITY_EXCEEDED":
      return "Your message is too large for this file. Please use a larger file or a shorter message.";
    case "EMPTY_MESSAGE":
      return "Please enter the secret message you want to hide.";
    case "EMPTY_COVER_TEXT":
      return "Please enter the cover text that will carry your hidden message.";
    case "NO_PAYLOAD":
      return noPayloadMessage(medium);
    case "CORRUPT_PAYLOAD":
      return "A hidden message was detected but it appears damaged. The media may have been edited, re-encoded, or converted after encoding.";
    case "RATE_LIMITED":
      return "Too many requests — please wait a moment before trying again.";
    case "INTERNAL_ERROR":
      return "The server hit an unexpected error. Please try again in a moment.";
    default: {
      const backend =
        typeof backendMessage === "string" ? backendMessage.trim() : "";
      return backend.length > 0 ? backend : FALLBACK;
    }
  }
}

/** Converts any thrown value into a UI-friendly message. */
export function toFriendlyMessage(
  error: unknown,
  medium?: Medium,
): string {
  if (error instanceof ApiError) {
    return mapErrorCode(error.code, medium, error.message);
  }
  if (isAbortError(error)) return "";
  return mapErrorCode("INTERNAL_ERROR", medium);
}
