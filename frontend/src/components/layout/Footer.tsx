import { Link } from "react-router-dom";
import { ScanEye, ShieldCheck } from "lucide-react";

const LINKS = [
  { to: "/encode", label: "Encode" },
  { to: "/decode", label: "Decode" },
  { to: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60 backdrop-blur">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
              <ScanEye className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">
              Stego<span className="text-primary">Lab</span>
            </span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            A multi-media steganography playground: hide and extract secret
            messages inside images, audio files, and ordinary text.
          </p>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Privacy: files and messages are processed in memory and never
              stored. Only anonymous operation statistics are recorded.{" "}
              <Link to="/about" className="text-primary hover:underline">
                Learn more
              </Link>
            </span>
          </p>
        </div>

        <nav aria-label="Footer navigation" className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Navigate
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
            </li>
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Techniques
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Image LSB steganography</li>
            <li>Audio LSB (PCM) steganography</li>
            <li>Zero-width Unicode text steganography</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© 2026 StegoLab — an educational demonstration.</p>
          <p className="font-mono">
            Steganography ≠ encryption · Use HTTPS in production
          </p>
        </div>
      </div>
    </footer>
  );
}
