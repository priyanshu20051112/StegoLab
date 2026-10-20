import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Eye,
  FileText,
  RotateCcw,
  Send,
} from "lucide-react";
import { useEncodeFlow } from "@/hooks/useEncodeFlow";
import { MediumSelector } from "@/components/stego/MediumSelector";
import { StepIndicator } from "@/components/stego/StepIndicator";
import { DropZone } from "@/components/stego/DropZone";
import { CapacityMeter } from "@/components/stego/CapacityMeter";
import { ErrorAlert } from "@/components/stego/ErrorAlert";
import { ImageCompare } from "@/components/stego/ImageCompare";
import { AudioCompare } from "@/components/stego/AudioCompare";
import { HowItWorks } from "@/components/stego/HowItWorks";
import { PrivacyNotice } from "@/components/stego/PrivacyNotice";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { copyToClipboard, downloadBlob, downloadText } from "@/lib/download";
import { formatBytes, formatDuration, formatSampleRate } from "@/lib/format";
import type { AudioCapacity, ImageCapacity } from "@/types";

const STEPS = [
  "Choose Medium",
  "Add Media",
  "Add Secret",
  "Encode",
  "Download",
];

function SectionCard({
  stepNumber,
  title,
  description,
  children,
}: {
  stepNumber: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${stepNumber}-heading`}
      className="glass rounded-2xl p-5 sm:p-6 animate-slide-up"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-sm font-semibold text-primary">
          {stepNumber}
        </span>
        <div>
          <h2 id={`step-${stepNumber}-heading`} className="text-base font-semibold sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function CapacityFacts({
  capacity,
}: {
  capacity: ImageCapacity | AudioCapacity;
}) {
  const entries: { label: string; value: string }[] =
    "width" in capacity
      ? [
          { label: "Dimensions", value: `${capacity.width} × ${capacity.height} px` },
          { label: "Image size", value: formatBytes(capacity.size_bytes) },
          { label: "Capacity", value: formatBytes(capacity.capacity_bytes) },
        ]
      : [
          {
            label: "Duration",
            value: formatDuration(capacity.duration_seconds),
          },
          {
            label: "Channels",
            value:
              capacity.channels === 1 ? "1 (mono)" : `${capacity.channels} (stereo)`,
          },
          { label: "Sample rate", value: formatSampleRate(capacity.sample_rate) },
          { label: "Bit depth", value: `${capacity.bits_per_sample}-bit` },
          { label: "File size", value: formatBytes(capacity.size_bytes) },
          { label: "Capacity", value: formatBytes(capacity.capacity_bytes) },
        ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="rounded-xl border border-border/70 bg-background/40 p-3"
        >
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {entry.label}
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Encode() {
  const flow = useEncodeFlow();
  const [textCopied, setTextCopied] = useState(false);

  useEffect(() => {
    if (!textCopied) return;
    const timer = window.setTimeout(() => setTextCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [textCopied]);

  const hasStarted =
    flow.medium !== null ||
    flow.file !== null ||
    flow.coverText.length > 0 ||
    flow.message.length > 0;

  const announcement =
    flow.status === "loading"
      ? "Encoding in progress, please wait."
      : flow.status === "success"
        ? "Message successfully hidden. Your stego media is ready to download."
        : flow.error
          ? flow.error
          : "";

  const handleCopyText = async () => {
    if (!flow.result?.text) return;
    const ok = await copyToClipboard(flow.result.text);
    if (ok) setTextCopied(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:py-14 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="section-label">Sender</span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Encode a Secret Message
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Choose a medium, add your media, and hide a message in plain sight.
          </p>
        </div>
        {hasStarted && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={flow.reset}
            disabled={flow.isSubmitting}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Start Over
          </Button>
        )}
      </header>

      <div className="glass rounded-2xl px-3 py-5 sm:px-6">
        <StepIndicator steps={STEPS} current={flow.step} ariaLabel="Encoding progress" />
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <SectionCard
        stepNumber={1}
        title="Choose Medium"
        description="Pick where you want to hide your message."
      >
        <MediumSelector
          value={flow.medium}
          onChange={flow.selectMedium}
          disabled={flow.isSubmitting}
        />
      </SectionCard>

      {flow.medium && (
        <SectionCard
          stepNumber={2}
          title="Add Media"
          description={
            flow.medium === "text"
              ? "Provide the ordinary text that will carry the hidden message."
              : "Upload the file that will carry your hidden message."
          }
        >
          {flow.medium === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="cover-text">Cover Text</Label>
              <Textarea
                id="cover-text"
                value={flow.coverText}
                onChange={(event) => flow.setCoverText(event.target.value)}
                disabled={flow.isSubmitting}
                rows={7}
                placeholder="Enter the ordinary text that will carry your hidden message..."
                aria-describedby="cover-text-hint"
              />
              <p
                id="cover-text-hint"
                className="font-mono text-xs text-muted-foreground"
              >
                {formatBytes(
                  new TextEncoder().encode(flow.coverText).byteLength,
                )}{" "}
                of cover text
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <DropZone
                kind={flow.medium}
                file={flow.file}
                onFile={flow.chooseFile}
                onRemove={flow.removeFile}
                disabled={flow.isSubmitting}
                label={`Upload ${
                  flow.medium === "image" ? "cover image" : "cover audio file"
                }`}
              />

              {flow.capacityLoading && (
                <div className="space-y-2" aria-label="Calculating capacity">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              )}

              {flow.capacityError && (
                <ErrorAlert
                  title="Could not read this file"
                  message={flow.capacityError}
                />
              )}

              {flow.capacity && <CapacityFacts capacity={flow.capacity} />}
            </div>
          )}
        </SectionCard>
      )}

      {flow.hasMedia && (
        <SectionCard
          stepNumber={3}
          title="Add Secret"
          description="Write the message you want to hide."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret-message">Secret Message</Label>
              <Textarea
                id="secret-message"
                value={flow.message}
                onChange={(event) => flow.setMessage(event.target.value)}
                disabled={flow.isSubmitting}
                rows={5}
                placeholder="Enter the message you want to hide..."
                aria-describedby="secret-message-hint"
              />
              <p
                id="secret-message-hint"
                className="font-mono text-xs text-muted-foreground"
              >
                {flow.messageBytes} bytes (UTF-8) · {formatBytes(flow.messageBytes)}
              </p>
            </div>

            {flow.medium !== "text" && (
              <CapacityMeter
                capacityBytes={flow.capacity?.capacity_bytes ?? null}
                messageBytes={flow.messageBytes}
                contextLabel={
                  flow.medium === "image" ? "this image" : "this audio file"
                }
              />
            )}

            {flow.isOverCapacity && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Message too large for this {flow.medium}. Please use a larger{" "}
                {flow.medium === "image" ? "image" : "audio file"} or a shorter
                message.
              </p>
            )}

            {flow.medium === "image" && (
              <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                For reliable decoding, the generated stego image is exported as
                PNG. Do not convert it to JPEG after encoding.
              </p>
            )}

            <PrivacyNotice />
          </div>
        </SectionCard>
      )}

      {flow.hasMedia && (
        <SectionCard
          stepNumber={4}
          title="Encode"
          description="Everything runs server-side, in memory."
        >
          <div className="space-y-4">
            {flow.error && (
              <ErrorAlert
                title="Encoding failed"
                message={flow.error}
                onDismiss={() => flow.setMessage(flow.message)}
              />
            )}
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void flow.encode()}
              disabled={!flow.canEncode}
              loading={flow.isSubmitting}
            >
              {!flow.isSubmitting && (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {flow.isSubmitting ? "Encoding…" : "Encode Message"}
            </Button>
            {flow.medium !== "text" && !flow.capacity && !flow.capacityLoading && (
              <p className="text-xs text-muted-foreground">
                Capacity will also be enforced by the server.
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {flow.status === "success" && flow.result && (
        <SectionCard
          stepNumber={5}
          title="Download"
          description="Your stego media is ready."
        >
          <div className="space-y-5">
            <p
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-success/40 bg-success/10 p-3.5 text-sm font-semibold text-success"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              Message successfully hidden!
            </p>

            {flow.result.medium === "image" && (
              <ImageCompare
                originalUrl={flow.result.originalUrl ?? ""}
                stegoUrl={flow.result.url ?? ""}
                originalName={flow.file?.name ?? "original"}
                stegoName={flow.result.filename}
                originalSize={flow.result.originalSize}
                stegoSize={flow.result.blob.size}
                onDownload={() =>
                  downloadBlob(flow.result!.blob, flow.result!.filename)
                }
                downloadLabel="Download PNG"
              />
            )}

            {flow.result.medium === "audio" && (
              <AudioCompare
                originalUrl={flow.result.originalUrl ?? ""}
                stegoUrl={flow.result.url ?? ""}
                originalFilename={flow.file?.name ?? "original.wav"}
                stegoFilename={flow.result.filename}
                originalSize={flow.result.originalSize}
                stegoSize={flow.result.blob.size}
                originalDuration={
                  flow.capacity && "duration_seconds" in flow.capacity
                    ? flow.capacity.duration_seconds
                    : null
                }
                onDownload={() =>
                  downloadBlob(flow.result!.blob, flow.result!.filename)
                }
                downloadLabel="Download WAV"
              />
            )}

            {flow.result.medium === "text" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stego-text-result">Steganographic Text</Label>
                  <Textarea
                    id="stego-text-result"
                    readOnly
                    value={flow.result.text ?? ""}
                    rows={9}
                    className="bg-background/60 font-mono text-xs"
                  />
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatBytes(
                      new TextEncoder().encode(flow.result.text ?? "").byteLength,
                    )}{" "}
                    of encoded text
                  </p>
                </div>

                {flow.result.capacityNote && (
                  <p className="rounded-xl border border-border/70 bg-background/40 p-3 font-mono text-xs text-muted-foreground">
                    Server: {flow.result.capacityNote}
                  </p>
                )}

                <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  The hidden data uses invisible Unicode characters. Avoid
                  editing or reformatting the encoded text before decoding.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant={textCopied ? "success" : "secondary"}
                    onClick={handleCopyText}
                  >
                    <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                    {textCopied ? "Copied!" : "Copy Text"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadText(flow.result!.text ?? "", "stegolab_encoded.txt")
                    }
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download TXT
                  </Button>
                </div>
                <div aria-live="polite" className="sr-only">
                  {textCopied ? "Steganographic text copied to clipboard." : ""}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-5">
              <Button
                type="button"
                onClick={flow.reset}
                aria-label="Encode another message — start over"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Encode Another Message
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {flow.medium && <HowItWorks medium={flow.medium} className="glass" />}

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-5 text-center text-sm backdrop-blur">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Want to decode something?</span>
        <Link
          to="/decode"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded focus-visible:ring-offset-2"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Go to Receiver
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Badge variant="outline" className="ml-auto hidden font-mono sm:inline-flex">
          processed in memory · never stored
        </Badge>
      </div>
    </div>
  );
}
