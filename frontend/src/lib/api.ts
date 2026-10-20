import { ApiError, isAbortError } from "@/lib/errors";
import type {
  AudioCapacity,
  BinaryEncodeResult,
  DecodeResult,
  HealthResult,
  ImageCapacity,
  StatsResult,
  TextEncodeResult,
} from "@/types";

const RAW_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const API_BASE = `${RAW_BASE}/api`;

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function statusFallbackCode(status: number): string {
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "INVALID_FILE";
}

async function raiseForResponse(response: Response): Promise<never> {
  let code = statusFallbackCode(response.status);
  let message = `Request failed with status ${response.status}.`;
  try {
    const data: unknown = await response.json();
    const error = (data as { error?: { code?: unknown; message?: unknown } })
      ?.error;
    if (error && typeof error === "object") {
      if (typeof error.code === "string" && error.code.length > 0) {
        code = error.code;
      }
      if (typeof error.message === "string" && error.message.length > 0) {
        message = error.message;
      }
    }
  } catch {
    /* body was not JSON — keep status-based defaults */
  }
  throw new ApiError(code, message, response.status);
}

async function request(
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "Failed to reach the StegoLab server.",
      0,
    );
  }
  if (!response.ok) {
    await raiseForResponse(response);
  }
  return response;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await request(path, init, signal);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      "INTERNAL_ERROR",
      "The server returned an unexpected response.",
      response.status,
    );
  }
}

function postForm(form: FormData): RequestInit {
  return { method: "POST", body: form };
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function headerNumber(response: Response, header: string): number | null {
  const raw = response.headers.get(header);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function filenameFrom(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition");
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]).trim() || fallback;
      } catch {
        return match[1].trim() || fallback;
      }
    }
  }
  return fallback;
}

function decodePayload(
  data: { message?: unknown; medium?: unknown },
  medium: "image" | "audio" | "text",
): DecodeResult {
  if (typeof data?.message !== "string" || data.message.length === 0) {
    throw new ApiError(
      "NO_PAYLOAD",
      "The response did not contain a hidden message.",
      200,
    );
  }
  return { message: data.message, medium };
}

/* ---------------------------------- Image --------------------------------- */

export async function getImageCapacity(
  file: File,
  signal?: AbortSignal,
): Promise<ImageCapacity> {
  const form = new FormData();
  form.append("file", file);
  return requestJson<ImageCapacity>(
    "/image/capacity",
    postForm(form),
    signal,
  );
}

export async function encodeImage(
  file: File,
  message: string,
  signal?: AbortSignal,
): Promise<BinaryEncodeResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("message", message);
  const response = await request(
    "/image/encode",
    postForm(form),
    signal,
  );
  const blob = await response.blob();
  return {
    blob,
    filename: filenameFrom(response, "stegolab_encoded.png"),
    capacityBytes: headerNumber(response, "X-Capacity-Bytes"),
    messageBytes: headerNumber(response, "X-Message-Bytes"),
  };
}

export async function decodeImage(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const form = new FormData();
  form.append("file", file);
  const data = await requestJson<{ message?: unknown; medium?: unknown }>(
    "/image/decode",
    postForm(form),
    signal,
  );
  return decodePayload(data, "image");
}

/* ---------------------------------- Audio --------------------------------- */

export async function getAudioCapacity(
  file: File,
  signal?: AbortSignal,
): Promise<AudioCapacity> {
  const form = new FormData();
  form.append("file", file);
  return requestJson<AudioCapacity>(
    "/audio/capacity",
    postForm(form),
    signal,
  );
}

export async function encodeAudio(
  file: File,
  message: string,
  signal?: AbortSignal,
): Promise<BinaryEncodeResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("message", message);
  const response = await request(
    "/audio/encode",
    postForm(form),
    signal,
  );
  const blob = await response.blob();
  return {
    blob,
    filename: filenameFrom(response, "stegolab_encoded.wav"),
    capacityBytes: headerNumber(response, "X-Capacity-Bytes"),
    messageBytes: headerNumber(response, "X-Message-Bytes"),
  };
}

export async function decodeAudio(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const form = new FormData();
  form.append("file", file);
  const data = await requestJson<{ message?: unknown; medium?: unknown }>(
    "/audio/decode",
    postForm(form),
    signal,
  );
  return decodePayload(data, "audio");
}

/* ----------------------------------- Text --------------------------------- */

export async function encodeText(
  coverText: string,
  message: string,
  signal?: AbortSignal,
): Promise<TextEncodeResult> {
  return requestJson<TextEncodeResult>(
    "/text/encode",
    postJson({ cover_text: coverText, message }),
    signal,
  );
}

export async function decodeText(
  stegoText: string,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const data = await requestJson<{ message?: unknown; medium?: unknown }>(
    "/text/decode",
    postJson({ stego_text: stegoText }),
    signal,
  );
  return decodePayload(data, "text");
}

/* ----------------------------------- Misc --------------------------------- */

export async function getStats(signal?: AbortSignal): Promise<StatsResult> {
  return requestJson<StatsResult>("/stats", { method: "GET" }, signal);
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResult> {
  return requestJson<HealthResult>("/health", { method: "GET" }, signal);
}
