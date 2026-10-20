import { useState } from "react";
import { Check, Copy, Download, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { copyToClipboard, downloadText } from "@/lib/download";
import { utf8ByteLength, formatBytes } from "@/lib/format";
import type { Medium } from "@/types";

const MEDIUM_LABEL: Record<Medium, string> = {
  image: "Image",
  audio: "Audio",
  text: "Text",
};

export interface ResultCardProps {
  message: string;
  medium: Medium;
}

export function ResultCard({ message, medium }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(message);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) window.setTimeout(() => setCopied(false), 2000);
  };

  const byteLength = utf8ByteLength(message);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success"
            aria-hidden="true"
          >
            <Lock className="h-5 w-5" />
          </span>
          Hidden Message Found
        </h2>
        <Badge variant="success">Medium: {MEDIUM_LABEL[medium]}</Badge>
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/50 p-4 sm:p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Decoded message
        </p>
        <p
          className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground sm:text-base"
          tabIndex={0}
        >
          {message}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {byteLength} bytes (UTF-8) · {formatBytes(byteLength)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={copied ? "success" : "default"}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy Message
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadText(message, "stegolab_decoded_message.txt")
          }
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download TXT
        </Button>
      </div>

      <div aria-live="polite" className="sr-only">
        {copied
          ? "Message copied to clipboard."
          : copyFailed
            ? "Copying to the clipboard failed. Please select the message and copy it manually."
            : ""}
      </div>
    </div>
  );
}
