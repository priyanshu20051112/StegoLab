import { useEffect, useId, useRef, useState } from "react";
import {
  FileAudio,
  FileImage,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { mapErrorCode } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { createObjectURL, revokeObjectURL } from "@/lib/download";
import { cn } from "@/lib/utils";

export type DropZoneKind = "image" | "audio";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const IMAGE_EXTENSIONS = [".png", ".bmp", ".jpg", ".jpeg"];
const AUDIO_EXTENSIONS = [".wav"];

const IMAGE_MIME = ["image/png", "image/bmp", "image/jpeg"];
const AUDIO_MIME = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/wav; codecs=1",
];

export interface DropZoneProps {
  kind: DropZoneKind;
  file: File | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  /** Accessible label for the drop area, e.g. "Encode input image". */
  label?: string;
  className?: string;
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function isAcceptedFile(file: File, kind: DropZoneKind): boolean {
  const ext = extensionOf(file.name);
  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  if (kind === "image") {
    return IMAGE_EXTENSIONS.includes(ext) || IMAGE_MIME.includes(mime);
  }
  if (AUDIO_EXTENSIONS.includes(ext)) return true;
  // Some systems report odd MIME types; a .wav extension is authoritative,
  // but never accept MP3/other lossy formats.
  if (mime === "audio/mpeg" || mime === "audio/mp3") return false;
  return AUDIO_MIME.includes(mime);
}

export function DropZone({
  kind,
  file,
  onFile,
  onRemove,
  disabled = false,
  label,
  className,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hintId = useId();
  const errorId = useId();

  const acceptLabel =
    kind === "image" ? "PNG, BMP, JPG/JPEG" : "WAV (PCM, uncompressed)";

  // Create an object URL for previews; revoke when the file changes/unmounts.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = createObjectURL(file);
    setPreviewUrl(url);
    return () => revokeObjectURL(url);
  }, [file]);

  // Clear stale validation errors when the file changes externally.
  useEffect(() => {
    setError(null);
  }, [file]);

  const validateAndAccept = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_BYTES) {
      setError(mapErrorCode("FILE_TOO_LARGE"));
      return;
    }
    if (!isAcceptedFile(candidate, kind)) {
      setError(mapErrorCode("UNSUPPORTED_FILE_TYPE", kind));
      return;
    }
    setError(null);
    onFile(candidate);
  };

  const openDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      openDialog();
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer?.files?.[0];
    validateAndAccept(dropped);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        aria-label={label}
        onClick={openDialog}
        onKeyDown={onKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex min-h-[190px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-accent/40",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span
          className={cn(
            "grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200",
            dragging && "scale-110",
          )}
        >
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </span>
        <span className="space-y-1">
          <span className="block text-base font-semibold">
            {dragging ? "Release to upload" : "Drop your file here"}
          </span>
          <span className="block text-sm text-muted-foreground">
            or{" "}
            <span className="font-medium text-primary underline underline-offset-2">
              Browse Files
            </span>
          </span>
        </span>
        <span
          id={hintId}
          className="rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
        >
          {acceptLabel} · Max {formatBytes(MAX_FILE_BYTES)}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={
          kind === "image" ? ".png,.bmp,.jpg,.jpeg,image/*" : ".wav,audio/*"
        }
        onChange={(event) => {
          validateAndAccept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error && (
        <div role="status" aria-live="polite" id={errorId}>
          <Alert variant="destructive">
            <AlertTitle>File not accepted</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {file && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur animate-fade-in sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {kind === "image" && previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="h-16 w-16 shrink-0 rounded-lg border border-border/70 object-cover"
              />
            ) : kind === "audio" ? (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-500">
                <FileAudio className="h-6 w-6" aria-hidden="true" />
              </span>
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <FileImage className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
          </div>

          {kind === "audio" && previewUrl && (
            <audio
              controls
              preload="metadata"
              src={previewUrl}
              aria-label={`Audio preview of ${file.name}`}
              className="w-full sm:w-56"
            />
          )}

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openDialog}
              disabled={disabled}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
