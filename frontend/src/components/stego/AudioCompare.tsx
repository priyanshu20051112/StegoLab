import { useEffect, useState } from "react";
import { AudioWaveform, Download, Music } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDuration } from "@/lib/format";

interface Track {
  url: string;
  filename: string;
  size?: number | null;
  durationSeconds?: number | null;
  label: string;
}

function AudioPlayer({
  track,
  highlight = false,
}: {
  track: Track;
  highlight?: boolean;
}) {
  const [measuredDuration, setMeasuredDuration] = useState<number | null>(null);
  const [durationState, setDurationState] = useState<number | null>(
    track.durationSeconds ?? null,
  );

  useEffect(() => {
    setMeasuredDuration(null);
    setDurationState(track.durationSeconds ?? null);
  }, [track.url, track.durationSeconds]);

  const displayDuration =
    measuredDuration !== null && Number.isFinite(measuredDuration)
      ? measuredDuration
      : durationState;

  return (
    <figure
      className={`space-y-3 rounded-2xl p-4 backdrop-blur ${
        highlight
          ? "border border-primary/40 bg-card/60 shadow-glow"
          : "border border-border/70 bg-card/60"
      }`}
    >
      <figcaption className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {highlight ? (
            <AudioWaveform className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <Music className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
          {track.label}
        </span>
        {highlight && <Badge variant="success">WAV</Badge>}
      </figcaption>

      <audio
        controls
        preload="metadata"
        src={track.url}
        aria-label={`${track.label} audio player`}
        className="w-full"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) {
            setMeasuredDuration(value);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <p className="min-w-0 truncate font-mono" title={track.filename}>
          {track.filename}
        </p>
        <div className="flex shrink-0 items-center gap-3 font-mono">
          {typeof track.size === "number" && <span>{formatBytes(track.size)}</span>}
          <span>
            {displayDuration !== null && Number.isFinite(displayDuration)
              ? formatDuration(displayDuration)
              : "—:—"}
          </span>
        </div>
      </div>
    </figure>
  );
}

export interface AudioCompareProps {
  originalUrl: string;
  stegoUrl: string;
  originalFilename?: string;
  stegoFilename?: string;
  originalSize?: number | null;
  stegoSize?: number | null;
  originalDuration?: number | null;
  stegoDuration?: number | null;
  onDownload?: () => void;
  downloadLabel?: string;
  className?: string;
}

export function AudioCompare({
  originalUrl,
  stegoUrl,
  originalFilename = "original.wav",
  stegoFilename = "stegolab_encoded.wav",
  originalSize,
  stegoSize,
  originalDuration,
  stegoDuration,
  onDownload,
  downloadLabel = "Download WAV",
  className,
}: AudioCompareProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        <AudioPlayer
          track={{
            url: originalUrl,
            filename: originalFilename,
            size: originalSize,
            durationSeconds: originalDuration,
            label: "Original",
          }}
        />
        <AudioPlayer
          highlight
          track={{
            url: stegoUrl,
            filename: stegoFilename,
            size: stegoSize,
            durationSeconds: stegoDuration,
            label: "Stego audio",
          }}
        />
      </div>

      {onDownload && (
        <div className="mt-5 flex justify-center">
          <Button type="button" size="lg" onClick={onDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloadLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
