import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <div className="rounded-2xl border border-info/30 bg-info/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-info"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-info">
            Privacy &amp; data handling
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your files and messages are sent to the StegoLab server only to
            perform encoding or decoding. They are processed in memory and are
            never written to disk or stored in the database. Only anonymous
            statistics (medium, sizes, timing, success/failure) are recorded.
            Do not use this educational demo for highly sensitive data.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            For any real deployment, serve StegoLab over HTTPS so requests
            cannot be read or tampered with while in transit.
          </p>
        </div>
      </div>
    </div>
  );
}
