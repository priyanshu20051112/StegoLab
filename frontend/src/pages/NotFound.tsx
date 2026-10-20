import { Link } from "react-router-dom";
import { ArrowLeft, ScanEye } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center animate-fade-in">
      <div aria-hidden="true" className="hero-motif absolute inset-0 -z-10" />
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <ScanEye className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="mt-6 font-mono text-6xl font-bold text-gradient sm:text-7xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Maybe its location is hidden with steganography. Either way, there is
        nothing to decode here.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
    </div>
  );
}
