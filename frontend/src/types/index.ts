export type Medium = "image" | "audio" | "text";

export interface ImageCapacity {
  width: number;
  height: number;
  capacity_bytes: number;
  size_bytes: number;
}

export interface AudioCapacity {
  channels: number;
  sample_rate: number;
  bits_per_sample: number;
  duration_seconds: number;
  capacity_bytes: number;
  size_bytes: number;
}

export type Capacity = ImageCapacity | AudioCapacity;

export interface DecodeResult {
  message: string;
  medium: Medium;
}

export interface TextEncodeResult {
  stego_text: string;
  capacity_note?: string | null;
}

export interface BinaryEncodeResult {
  blob: Blob;
  filename: string;
  capacityBytes: number | null;
  messageBytes: number | null;
}

export interface MediumStats {
  encoded: number;
  decoded: number;
}

export interface StatsResult {
  encoded: number;
  decoded: number;
  failed: number;
  by_medium: Record<Medium, MediumStats>;
}

export interface HealthResult {
  status: string;
  database: string;
}

export type Status = "idle" | "loading" | "error" | "success";

/** Successful encode outcome, normalized across all three media. */
export interface EncodeSuccess {
  medium: Medium;
  /** Download filename, e.g. stegolab_encoded.png */
  filename: string;
  /** Result blob (always present — text is wrapped into a text/plain blob). */
  blob: Blob;
  /** Object URL for the stego blob (image/audio only, null for text). */
  url: string | null;
  /** Object URL for the original input (image/audio only, null for text). */
  originalUrl: string | null;
  /** Steganographic text payload (text medium only). */
  text: string | null;
  /** Server-provided note about capacity (text medium only). */
  capacityNote: string | null;
  capacityBytes: number | null;
  messageBytes: number | null;
  originalSize: number | null;
}
