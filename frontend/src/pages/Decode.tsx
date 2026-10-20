import { Link } from "react-router-dom";
import {
  ArrowRight,
  EyeOff,
  FileText,
  KeyRound,
  RotateCcw,
  ScanEye,
} from "lucide-react";
import { useDecodeFlow } from "@/hooks/useDecodeFlow";
import { MediumSelector } from "@/components/stego/MediumSelector";
import { StepIndicator } from "@/components/stego/StepIndicator";
import { DropZone } from "@/components/stego/DropZone";
import { ErrorAlert } from "@/components/stego/ErrorAlert";
import { ResultCard } from "@/components/stego/ResultCard";
import { HowItWorks } from "@/components/stego/HowItWorks";
import { PrivacyNotice } from "@/components/stego/PrivacyNotice";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { formatBytes } from "@/lib/format";

const STEPS = ["Choose Medium", "Provide Media", "Decode", "Result"];

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
      aria-labelledby={`decode-step-${stepNumber}-heading`}
      className="glass rounded-2xl p-5 sm:p-6 animate-slide-up"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-sm font-semibold text-primary">
          {stepNumber}
        </span>
        <div>
          <h2
            id={`decode-step-${stepNumber}-heading`}
            className="text-base font-semibold sm:text-lg"
          >
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

export default function Decode() {
  const flow = useDecodeFlow();

  const hasStarted =
    flow.medium !== null ||
    flow.file !== null ||
    flow.stegoText.length > 0;

  const announcement =
    flow.status === "loading"
      ? "Decoding in progress, please wait."
      : flow.status === "success"
        ? "Hidden message found and displayed below."
        : flow.error
          ? flow.error
          : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:py-14 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="section-label">Receiver</span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Decode a Hidden Message
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Provide the steganographic media and StegoLab will extract the
            secret it carries.
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
        <StepIndicator
          steps={STEPS}
          current={flow.step}
          ariaLabel="Decoding progress"
        />
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <SectionCard
        stepNumber={1}
        title="Choose Medium"
        description="Select where the message was hidden."
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
          title="Provide Media"
          description={
            flow.medium === "text"
              ? "Paste the steganographic text you received."
              : "Upload the file you received."
          }
        >
          {flow.medium === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="stego-text-input">Steganographic Text</Label>
              <Textarea
                id="stego-text-input"
                value={flow.stegoText}
                onChange={(event) => flow.setStegoText(event.target.value)}
                disabled={flow.isSubmitting}
                rows={9}
                placeholder="Paste the steganographic text that contains a hidden message..."
                aria-describedby="stego-text-hint"
              />
              <p
                id="stego-text-hint"
                className="font-mono text-xs text-muted-foreground"
              >
                {formatBytes(
                  new TextEncoder().encode(flow.stegoText).byteLength,
                )}{" "}
                of input text
              </p>
            </div>
          ) : (
            <DropZone
              kind={flow.medium}
              file={flow.file}
              onFile={flow.chooseFile}
              onRemove={flow.removeFile}
              disabled={flow.isSubmitting}
              label={`Upload ${
                flow.medium === "image" ? "stego image" : "stego audio file"
              }`}
            />
          )}
        </SectionCard>
      )}

      {flow.hasInput && (
        <SectionCard
          stepNumber={3}
          title="Decode"
          description="Extraction runs server-side, in memory."
        >
          <div className="space-y-4">
            {flow.error && (
              <ErrorAlert title="Decoding failed" message={flow.error} />
            )}
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void flow.decode()}
              disabled={!flow.canDecode}
              loading={flow.isSubmitting}
            >
              {!flow.isSubmitting && <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {flow.isSubmitting ? "Decoding…" : "Decode Message"}
            </Button>
          </div>
          <div className="mt-5">
            <PrivacyNotice />
          </div>
        </SectionCard>
      )}

      {flow.status === "success" && flow.result && (
        <SectionCard
          stepNumber={4}
          title="Result"
          description="The payload recovered from your media."
        >
          <ResultCard
            message={flow.result.message}
            medium={flow.result.medium}
          />
          <div className="mt-5 flex flex-wrap gap-3 border-t border-border/60 pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={flow.reset}
              aria-label="Decode another message — start over"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Decode Another Message
            </Button>
          </div>
        </SectionCard>
      )}

      {flow.medium && <HowItWorks medium={flow.medium} className="glass" />}

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-5 text-center text-sm backdrop-blur">
        <ScanEye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Want to hide a message?</span>
        <Link
          to="/encode"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded focus-visible:ring-offset-2"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
          Go to Sender
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <FileText
          className="ml-auto hidden h-4 w-4 text-muted-foreground sm:block"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
