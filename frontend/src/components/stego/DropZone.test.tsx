import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DropZone } from "./DropZone";

function renderDropZone(overrides: Partial<Parameters<typeof DropZone>[0]> = {}) {
  const onFile = vi.fn();
  const onRemove = vi.fn();
  const props = {
    kind: "image" as const,
    file: null as File | null,
    onFile,
    onRemove,
    label: "Upload cover image",
    ...overrides,
  };
  const view = render(<DropZone {...props} />);
  const rerender = (next: Partial<Parameters<typeof DropZone>[0]> = {}) =>
    view.rerender(<DropZone {...props} {...next} />);
  return { onFile, onRemove, rerender };
}

function dropFile(zone: HTMLElement, file: File) {
  fireEvent.drop(zone, {
    dataTransfer: { files: [file], items: [], types: ["Files"] },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DropZone", () => {
  it("rejects an unsupported file type with a friendly error", () => {
    const { onFile } = renderDropZone();
    const zone = screen.getByRole("button", { name: "Upload cover image" });

    dropFile(
      zone,
      new File(["MZ"], "payload.exe", { type: "application/x-msdownload" }),
    );

    expect(
      screen.getByText(/that file type isn't supported/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it("rejects files larger than 10 MB with a friendly error", () => {
    const { onFile } = renderDropZone();
    const zone = screen.getByRole("button", { name: "Upload cover image" });

    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "huge.png",
      { type: "image/png" },
    );
    dropFile(zone, oversized);

    expect(screen.getByText(/too large/i)).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it("accepts a valid PNG image", () => {
    // Mock the capacity API surface the surrounding flow calls after upload.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );
    const { onFile, rerender } = renderDropZone();
    const zone = screen.getByRole("button", { name: "Upload cover image" });

    const png = new File([new Uint8Array([137, 80, 78, 71])], "photo.png", {
      type: "image/png",
    });
    dropFile(zone, png);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(png);
    expect(
      screen.queryByText(/that file type isn't supported|too large/i),
    ).not.toBeInTheDocument();

    // The parent flow accepts the file — the preview with name + size appears.
    rerender({ file: png });
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("4 B")).toBeInTheDocument();
  });

  it("is keyboard operable — Enter opens the file dialog", () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderDropZone();

    const zone = screen.getByRole("button", { name: "Upload cover image" });
    zone.focus();
    fireEvent.keyDown(zone, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
