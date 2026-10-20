const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Formats a byte count for humans, e.g. 25088 -> "24.5 KB". */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : value >= 100 ? 0 : decimals;
  return `${value.toFixed(digits)} ${BYTE_UNITS[unitIndex]}`;
}

/** Formats a duration in seconds as m:ss, e.g. 83.4 -> "1:23". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** UTF-8 byte length of a string (multi-byte characters counted properly). */
export function utf8ByteLength(text: string): number {
  if (!text) return 0;
  return new TextEncoder().encode(text).byteLength;
}

/** Human-friendly sample rate, e.g. 44100 -> "44.1 kHz". */
export function formatSampleRate(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return "—";
  const khz = hz / 1000;
  return `${khz % 1 === 0 ? khz.toFixed(0) : khz.toFixed(1)} kHz`;
}
