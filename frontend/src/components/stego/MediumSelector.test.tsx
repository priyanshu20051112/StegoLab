import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediumSelector } from "./MediumSelector";

describe("MediumSelector", () => {
  it("renders three medium options", () => {
    render(<MediumSelector value={null} onChange={() => undefined} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(
      screen.getByRole("radio", { name: /hide a message inside an image/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /hide a message inside an audio file/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /hide a message inside ordinary text/i }),
    ).toBeInTheDocument();
  });

  it("reports selection changes through onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MediumSelector value={null} onChange={onChange} />);

    await user.click(
      screen.getByRole("radio", { name: /hide a message inside an audio file/i }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("audio");
  });

  it("updates aria-pressed and selected styles for the active medium", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MediumSelector value="image" onChange={onChange} />,
    );

    const image = screen.getByRole("radio", {
      name: /hide a message inside an image/i,
    });
    const audio = screen.getByRole("radio", {
      name: /hide a message inside an audio file/i,
    });

    expect(image).toHaveAttribute("aria-pressed", "true");
    expect(image).toHaveAttribute("aria-checked", "true");
    expect(image.className).toContain("border-primary");
    expect(image.className).toContain("shadow-glow");
    // Not colour-only: a visible "Selected" badge marks the active option.
    expect(screen.getByText("Selected")).toBeInTheDocument();

    expect(audio).toHaveAttribute("aria-pressed", "false");
    expect(audio).toHaveAttribute("aria-checked", "false");
    expect(audio.className).toContain("border-border/70");

    rerender(<MediumSelector value="text" onChange={onChange} />);
    expect(
      screen.getByRole("radio", { name: /hide a message inside ordinary text/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("radio", { name: /hide a message inside an image/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
