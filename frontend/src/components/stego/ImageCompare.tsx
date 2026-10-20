import { Download, Image as ImageIcon, ScanEye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/format";

export interface ImageCompareProps {
  originalUrl: string;
  stegoUrl: string;
  originalName?: string;
  stegoName?: string;
  originalSize?: number | null;
  stegoSize?: number | null;
  onDownload?: () => void;
  downloadLabel?: string;
  className?: string;
}

export function ImageCompare({
  originalUrl,
  stegoUrl,
  originalName = "original",
  stegoName = "stegolab_encoded.png",
  originalSize,
  stegoSize,
  onDownload,
  downloadLabel = "Download PNG",
  className,
}: ImageCompareProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur">
          <figcaption className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Original
            </span>
            {typeof originalSize === "number" && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatBytes(originalSize)}
              </span>
            )}
          </figcaption>
          <img
            src={originalUrl}
            alt="Original image before encoding"
            className="aspect-[4/3] w-full rounded-lg border border-border/60 bg-black/10 object-contain dark:bg-black/40"
          />
          <p className="truncate font-mono text-xs text-muted-foreground" title={originalName}>
            {originalName}
          </p>
        </figure>

        <figure className="space-y-3 rounded-2xl border border-primary/40 bg-card/60 p-4 backdrop-blur shadow-glow">
          <figcaption className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ScanEye className="h-4 w-4 text-primary" aria-hidden="true" />
              Stego image
            </span>
            <Badge variant="success">PNG</Badge>
          </figcaption>
          <img
            src={stegoUrl}
            alt="Encoded stego image containing the hidden message"
            className="aspect-[4/3] w-full rounded-lg border border-border/60 bg-black/10 object-contain dark:bg-black/40"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs text-muted-foreground" title={stegoName}>
              {stegoName}
            </p>
            {typeof stegoSize === "number" && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatBytes(stegoSize)}
              </span>
            )}
          </div>
        </figure>
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
