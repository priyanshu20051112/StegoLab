import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatSampleRate,
  utf8ByteLength,
} from "./format";

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(8400)).toBe("8.2 KB");
    expect(formatBytes(25088)).toBe("24.5 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5.4)).toBe("0:05");
    expect(formatDuration(83.4)).toBe("1:23");
    expect(formatDuration(-1)).toBe("0:00");
  });
});

describe("utf8ByteLength", () => {
  it("counts UTF-8 bytes, not characters", () => {
    expect(utf8ByteLength("")).toBe(0);
    expect(utf8ByteLength("hello")).toBe(5);
    expect(utf8ByteLength("héllo")).toBe(6);
    expect(utf8ByteLength("🔐")).toBe(4);
  });
});

describe("formatSampleRate", () => {
  it("formats hertz as kHz", () => {
    expect(formatSampleRate(44100)).toBe("44.1 kHz");
    expect(formatSampleRate(48000)).toBe("48 kHz");
    expect(formatSampleRate(0)).toBe("—");
  });
});
