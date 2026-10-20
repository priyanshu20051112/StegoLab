import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  AudioWaveform,
  Database,
  FileText,
  FlaskConical,
  Image,
  Lock,
  Server,
  Smartphone,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const ALGORITHMS = [
  {
    icon: Image,
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
    title: "Image LSB (RGB channels)",
    description:
      "Each pixel stores red, green, and blue as 8-bit values. StegoLab overwrites the least significant bit of each channel with payload bits — a change of at most 1/256 per channel, invisible to the eye.",
    tags: ["PNG · BMP · JPG input", "PNG output (lossless)"],
  },
  {
    icon: AudioWaveform,
    tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-500",
    title: "Audio LSB (PCM samples)",
    description:
      "Uncompressed WAV audio is a stream of numeric samples. StegoLab writes payload bits into the least significant bit of successive samples, below the audible noise floor.",
    tags: ["WAV (PCM) only", "MP3 is unsupported by design"],
  },
  {
    icon: FileText,
    tone: "from-violet-500/15 to-violet-500/5 text-violet-500",
    title: "Text zero-width Unicode",
    description:
      "Invisible characters carry the bits: U+200B encodes 0, U+200C encodes 1, and the payload is wrapped between U+200D delimiters. The visible text reads completely normally.",
    tags: ["U+200B · U+200C · U+200D", "Zero visual footprint"],
  },
];

const PIPELINE = [
  {
    icon: Smartphone,
    label: "React SPA",
    detail: "Browser UI — files stay in your browser until you act.",
  },
  {
    icon: Server,
    label: "Flask REST API",
    detail: "Stateless endpoints under /api encode and decode in memory.",
  },
  {
    icon: Database,
    label: "PostgreSQL",
    detail:
      "Stores only anonymous operation metadata — never content.",
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16 animate-fade-in">
      <header className="space-y-4">
        <span className="section-label">About the project</span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About StegoLab
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          StegoLab is an educational, multi-media steganography workbench: a
          place to practice hiding and extracting secret messages inside
          everyday-looking media — and to understand exactly how those
          techniques work, and where they stop being enough.
        </p>
      </header>

      <section aria-labelledby="what-is-stego" className="space-y-4">
        <h2
          id="what-is-stego"
          className="text-2xl font-semibold tracking-tight"
        >
          What is steganography?
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass">
            <CardContent className="space-y-3 p-6 text-sm leading-relaxed text-muted-foreground">
              <p>
                Steganography is the practice of hiding information
                <em className="text-foreground not-italic font-medium">
                  {" "}inside an ordinary-looking medium
                </em>{" "}
                so that the very existence of the secret is not obvious. Unlike
                encryption, which makes content unreadable, steganography makes
                content unnoticeable: a photograph, a song, or a paragraph of
                prose carries a payload while appearing completely normal.
              </p>
              <p>
                The goal is deniability. A casual observer should have no reason
                to suspect there is anything to look for — the classic picture
                is a postcard where the visible message hides a second, silent
                one.
              </p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">
                Three core concepts:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary">01</span>
                  <span>
                    <strong className="text-foreground">Cover medium</strong> —
                    the ordinary file (image, audio, text) that carries the
                    payload.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary">02</span>
                  <span>
                    <strong className="text-foreground">Payload</strong> — the
                    hidden message, encoded bit by bit into imperceptible
                    details of the cover.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary">03</span>
                  <span>
                    <strong className="text-foreground">Stego medium</strong> —
                    the resulting file that is shared, looking identical to the
                    original.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="algorithms" className="space-y-5">
        <h2
          id="algorithms"
          className="text-2xl font-semibold tracking-tight"
        >
          The three algorithms
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {ALGORITHMS.map(({ icon: Icon, tone, title, description, tags }) => (
            <Card key={title} className="glass flex flex-col">
              <CardHeader className="space-y-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
                <p>{description}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="limitations" className="space-y-4">
        <h2
          id="limitations"
          className="text-2xl font-semibold tracking-tight"
        >
          Important limitations
        </h2>
        <Alert variant="warning" className="p-5 [&>svg]:h-5 [&>svg]:w-5">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle className="text-base">
            Steganography is not encryption
          </AlertTitle>
          <AlertDescription className="space-y-3 text-muted-foreground">
            <p>
              A hidden message can be discovered by someone who knows where and
              how to look. Statistical analysis (for example, comparing the
              distribution of least-significant bits against natural images) can
              reveal that a file carries a payload — and once found, the message
              itself may be readable with no password at all.
            </p>
            <p>
              For real secrecy, combine steganography with strong encryption,
              and treat this platform as what it is:{" "}
              <strong className="font-semibold text-warning">
                an educational demonstration
              </strong>
              . Do not use it for highly sensitive data.
            </p>
          </AlertDescription>
        </Alert>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            "Lossy transformations (JPEG conversion, MP3 re-encoding) destroy the payload.",
            "Editing or reformatting hidden-text payloads can silently break them.",
            "Capacity is finite — larger messages require larger cover media.",
            "A medium can be statistically flagged even when the message stays secret.",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground"
            >
              <Lock
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
            />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="architecture" className="space-y-5">
        <h2
          id="architecture"
          className="text-2xl font-semibold tracking-tight"
        >
          Architecture
        </h2>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" aria-hidden="true" />
              React → Flask REST API → PostgreSQL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
              {PIPELINE.map((step, index) => (
                <li key={step.label} className="contents">
                  <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="font-mono text-sm font-semibold">
                        {step.label}
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                  {index < PIPELINE.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden items-center justify-center md:flex"
                    >
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                The database records <strong className="text-foreground">only anonymous operation metadata</strong> —
                the medium used, sizes, timing, and whether the operation
                succeeded or failed.{" "}
                <strong className="text-foreground">No messages, no media files, no filenames, and no IP addresses</strong>{" "}
                are ever persisted. Encoding and decoding happen in memory on
                the server and the payload is discarded as soon as the response
                is sent.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Try it yourself</h2>
          <p className="text-sm text-muted-foreground">
            Hide a message in an image, or extract one someone sent you.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/encode"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Start Encoding
          </Link>
          <Link
            to="/decode"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Start Decoding
          </Link>
        </div>
      </section>
    </div>
  );
}
