import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  AudioWaveform,
  Binary,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Image,
  KeyRound,
  Lock,
  Radio,
} from "lucide-react";
import * as api from "@/lib/api";
import { isAbortError } from "@/lib/errors";
import { StatsStrip } from "@/components/stego/StatsStrip";
import type { StatsResult } from "@/types";
import { cn } from "@/lib/utils";

const BINARY_LINES = [
  "01001000 01101001 01100100 01100100 01100101 01101110",
  "00110010 00110000 00110000 01011011 01011101 01011111",
  "01110011 01110100 01100101 01100111 01101111 01101100",
  "01100001 01100010 00101111 01101100 01110011 01100010",
  "00110001 00110100 00110000 00110000 00101111 01110000",
  "01101110 01100111 00101110 01110000 01101110 01100111",
];

const MEDIUM_CARDS = [
  {
    icon: Image,
    title: "Images",
    text: "Bits hidden in pixel color channels.",
    tone: "text-emerald-500 bg-emerald-500/10",
  },
  {
    icon: AudioWaveform,
    title: "Audio",
    text: "Bits hidden in PCM samples.",
    tone: "text-cyan-500 bg-cyan-500/10",
  },
  {
    icon: FileText,
    title: "Text",
    text: "Bits hidden in invisible Unicode.",
    tone: "text-violet-500 bg-violet-500/10",
  },
];

function FlowBox({
  icon: Icon,
  title,
  subtitle,
  highlight = false,
}: {
  icon: typeof Lock;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-2xl border px-5 py-6 text-center backdrop-blur transition-all duration-200",
        highlight
          ? "border-primary/50 bg-primary/5 shadow-glow"
          : "border-border/70 bg-card/60",
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl",
          highlight
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <>
      <ArrowRight
        aria-hidden="true"
        className="hidden h-5 w-5 shrink-0 text-muted-foreground md:block"
      />
      <ArrowDown
        aria-hidden="true"
        className="mx-auto h-5 w-5 shrink-0 text-muted-foreground md:hidden"
      />
    </>
  );
}

export default function Home() {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStats(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setStats(value);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setFailed(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="hero-motif absolute inset-0" />
        <div
          aria-hidden="true"
          className="binary-rain absolute inset-x-0 top-0 hidden select-none space-y-3 overflow-hidden px-8 pt-16 opacity-[0.18] md:block"
        >
          {BINARY_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <Lock
          aria-hidden="true"
          className="absolute right-[8%] top-24 hidden h-16 w-16 rotate-12 text-emerald-500/10 lg:block"
        />
        <Eye
          aria-hidden="true"
          className="absolute left-[6%] top-40 hidden h-14 w-14 -rotate-6 text-cyan-500/10 lg:block"
        />
        <Binary
          aria-hidden="true"
          className="absolute bottom-24 right-[18%] hidden h-12 w-12 rotate-6 text-violet-500/10 lg:block"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 lg:pb-24 lg:pt-24">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur">
            <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Multi-media steganography lab
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Hide in <span className="text-gradient">Plain Sight.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
            Securely encode and decode secret messages using images, audio, and
            text.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/encode"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] sm:w-auto"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              Start Encoding
            </Link>
            <Link
              to="/decode"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-7 text-base font-medium transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] sm:w-auto"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Start Decoding
            </Link>
          </div>
        </div>
      </section>

      {/* Sender / Receiver cards */}
      <section
        aria-labelledby="choose-role"
        className="mx-auto -mt-6 max-w-6xl px-4 pb-16 sm:px-6"
      >
        <h2 id="choose-role" className="sr-only">
          Choose your role
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <article className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform duration-200 group-hover:scale-105">
              <EyeOff className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="section-label">Sender</p>
            <h3 className="text-xl font-semibold tracking-tight">
              Sender: Encode a secret message.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hide your message inside an image, audio file, or text.
            </p>
            <Link
              to="/encode"
              className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] sm:w-auto"
            >
              Start Encoding
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_0_0_1px_hsl(var(--cyanx)/0.2),0_12px_40px_-12px_hsl(var(--cyanx)/0.35)]">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-cyan-500/10 text-cyan-500 transition-transform duration-200 group-hover:scale-105">
              <Eye className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="section-label">Receiver</p>
            <h3 className="text-xl font-semibold tracking-tight">
              Receiver: Decode a hidden message.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Extract a secret message from steganographic media.
            </p>
            <Link
              to="/decode"
              className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] sm:w-auto"
            >
              Start Decoding
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      {/* What is steganography */}
      <section
        aria-labelledby="what-is-stego"
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      >
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="space-y-4">
            <span className="section-label">The basics</span>
            <h2
              id="what-is-stego"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              What is Steganography?
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Steganography is the art of{" "}
              <span className="text-foreground">
                hiding information inside an ordinary-looking medium
              </span>{" "}
              so that its existence isn&apos;t obvious. Where encryption scrambles a
              message so it cannot be read, steganography conceals the fact
              that a message exists at all — a photograph looks like a
              photograph, a WAV file sounds like a song, and a paragraph reads
              like ordinary prose.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              StegoLab lets you experiment with all three: least-significant-bit
              embedding for images and audio, and zero-width Unicode characters
              for text.
            </p>
          </div>
          <ul className="grid gap-3">
            {MEDIUM_CARDS.map(({ icon: Icon, title, text, tone }) => (
              <li
                key={title}
                className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur"
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Flow diagram */}
      <section
        aria-labelledby="how-flow"
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      >
        <div className="rounded-3xl border border-border/70 bg-card/40 p-6 backdrop-blur sm:p-8">
          <div className="mb-7 text-center">
            <span className="section-label">The pipeline</span>
            <h2 id="how-flow" className="mt-2 text-2xl font-bold tracking-tight">
              How a message travels
            </h2>
          </div>
          <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <li className="contents">
              <FlowBox
                icon={FileText}
                title="Original Media"
                subtitle="An ordinary-looking file you already have."
              />
            </li>
            <li className="contents">
              <FlowArrow />
            </li>
            <li className="contents">
              <FlowBox
                icon={KeyRound}
                title="Hidden Message"
                subtitle="Your secret, encoded bit by bit into imperceptible details."
                highlight
              />
            </li>
            <li className="contents">
              <FlowArrow />
            </li>
            <li className="contents">
              <FlowBox
                icon={FileCheck2}
                title="Stego Media"
                subtitle="Shared with anyone — nobody suspects a thing."
              />
            </li>
          </ol>
        </div>
      </section>

      {/* Live stats */}
      <section
        aria-labelledby="live-stats"
        className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="live-stats" className="text-lg font-semibold tracking-tight">
            Live lab statistics
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            GET /api/stats
          </span>
        </div>
        {!failed && <StatsStrip stats={stats} loading={loading} error={failed} />}
      </section>
    </div>
  );
}
