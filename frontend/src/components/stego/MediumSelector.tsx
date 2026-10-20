import { AudioWaveform, Check, FileText, Image } from "lucide-react";
import type { Medium } from "@/types";
import { cn } from "@/lib/utils";

interface Option {
  id: Medium;
  title: string;
  description: string;
  formats: string;
  icon: typeof Image;
  gradient: string;
}

const OPTIONS: Option[] = [
  {
    id: "image",
    title: "Image",
    description: "Hide a message inside an image.",
    formats: "PNG, BMP, JPG/JPEG — stego output re-exported as PNG",
    icon: Image,
    gradient: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
  },
  {
    id: "audio",
    title: "Audio",
    description: "Hide a message inside an audio file.",
    formats: "WAV (PCM) only — lossy MP3 destroys hidden data",
    icon: AudioWaveform,
    gradient: "from-cyan-500/15 to-cyan-500/5 text-cyan-500",
  },
  {
    id: "text",
    title: "Text",
    description: "Hide a message inside ordinary text.",
    formats: "Invisible zero-width Unicode characters",
    icon: FileText,
    gradient: "from-violet-500/15 to-violet-500/5 text-violet-500",
  },
];

export interface MediumSelectorProps {
  value: Medium | null;
  onChange: (medium: Medium) => void;
  disabled?: boolean;
}

export function MediumSelector({
  value,
  onChange,
  disabled = false,
}: MediumSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Steganography medium"
      className="grid gap-4 sm:grid-cols-3"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-primary bg-primary/5 shadow-glow"
                : "border-border/70 bg-card/60 hover:border-primary/40 hover:bg-card",
            )}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br transition-transform duration-200 group-hover:scale-105",
                  option.gradient,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {selected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Selected
                </span>
              )}
            </span>
            <span className="space-y-1">
              <span className="block text-base font-semibold">
                {option.title}
              </span>
              <span className="block text-sm leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </span>
            <span className="font-mono text-[11px] leading-relaxed text-muted-foreground/80">
              {option.formats}
            </span>
          </button>
        );
      })}
    </div>
  );
}
