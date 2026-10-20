import { useId, useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import type { Medium } from "@/types";
import { cn } from "@/lib/utils";

interface Content {
  title: string;
  body: string;
  bullets: string[];
}

const CONTENT: Record<Medium, Content> = {
  image: {
    title: "LSB Image Steganography",
    body: "Every pixel in a color image stores its red, green, and blue channels as 8-bit numbers (0–255). StegoLab rewrites only the least significant bit — the faintest bit — of each color value to carry your message. Changing a value by at most 1 out of 256 is imperceptible to the human eye, so the picture looks completely ordinary.",
    bullets: [
      "Bits are packed into the LSB of each R, G, B color channel.",
      "A hidden header tells the decoder exactly where the message ends.",
      "Output is exported as PNG: a lossless format that preserves every bit.",
    ],
  },
  audio: {
    title: "LSB PCM Audio Steganography",
    body: "Uncompressed WAV (PCM) audio stores each sample as a number. StegoLab replaces the least significant bit of successive samples with the bits of your message. Dropping a sample's value by 1 of thousands of levels is below the noise floor — you will not hear the difference.",
    bullets: [
      "Each PCM sample contributes its least significant bit to the payload.",
      "Works on uncompressed PCM WAV only — re-encoding to MP3 destroys it.",
      "A header marks the payload boundary so decoding stops cleanly.",
    ],
  },
  text: {
    title: "Zero-Width Unicode Steganography",
    body: "Certain Unicode characters are completely invisible in any font: U+200B (zero-width space) and U+200C (zero-width non-joiner) represent the bits 0 and 1. StegoLab encodes your message as a chain of these invisible characters sandwiched between U+200D delimiters, embedded inside ordinary-looking cover text.",
    bullets: [
      "U+200B = bit 0, U+200C = bit 1, U+200D = payload delimiters.",
      "The visible text reads exactly the same before and after encoding.",
      "Avoid editing the text afterwards — spellcheckers may strip the characters.",
    ],
  },
};

export interface HowItWorksProps {
  medium: Medium;
  className?: string;
}

export function HowItWorks({ medium, className }: HowItWorksProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const content = CONTENT[medium];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
          <Lightbulb className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          How does this work?
          <span className="hidden font-mono text-xs font-normal text-muted-foreground sm:inline">
            {content.title}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id={contentId}
        hidden={!open}
        className="border-t border-border/60 px-5 py-5 animate-fade-in"
      >
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            {content.title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.body}
          </p>
          <ul className="space-y-1.5">
            {content.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
