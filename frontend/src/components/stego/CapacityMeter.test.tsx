import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CapacityMeter } from "./CapacityMeter";

describe("CapacityMeter", () => {
  it("shows available capacity next to the message size", () => {
    render(<CapacityMeter capacityBytes={1024} messageBytes={512} />);

    expect(screen.getByText(/available capacity/i)).toHaveTextContent(
      "Available capacity: 1.0 KB",
    );
    expect(screen.getByText(/your message/i)).toHaveTextContent(
      "Your message: 512 B",
    );

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.queryByText(/over capacity/i)).not.toBeInTheDocument();
  });

  it("enters a warning state when the message exceeds capacity", () => {
    render(
      <CapacityMeter
        capacityBytes={1024}
        messageBytes={2048}
        contextLabel="this image"
      />,
    );

    expect(screen.getByText(/over capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/will not fit inside this image/i)).toBeInTheDocument();

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    // Warning is not colour-only — the destructive fill + icon/text accompany it.
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-destructive");
  });

  it("handles unknown capacity gracefully", () => {
    render(<CapacityMeter capacityBytes={null} messageBytes={64} />);
    expect(screen.getByText(/available capacity/i)).toHaveTextContent(
      "Available capacity: —",
    );
    expect(
      screen.getByText(/capacity will be verified by the server/i),
    ).toBeInTheDocument();
  });
});
