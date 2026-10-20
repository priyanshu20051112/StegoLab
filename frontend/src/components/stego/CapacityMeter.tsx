import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/Progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CapacityMeterProps {
  /** Total capacity in bytes, or null when unknown. */
  capacityBytes: number | null;
  /** Current message size in bytes (UTF-8). */
  messageBytes: number;
  /** Extra description, e.g. "for this image". */
  contextLabel?: string;
  className?: string;
}

export function CapacityMeter({
  capacityBytes,
  messageBytes,
  contextLabel = "this file",
  className,
}: CapacityMeterProps) {
  const known = capacityBytes !== null && capacityBytes > 0;
  const overCapacity = known && messageBytes > capacityBytes;
  const percent = known
    ? Math.min(100, (messageBytes / capacityBytes) * 100)
    : 0;
  const nearlyFull = known && !overCapacity && percent >= 90;

  const variant = overCapacity
    ? "destructive"
    : nearlyFull
      ? "warning"
      : "default";

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className="text-muted-foreground">
          Available capacity:{" "}
          <span className="font-mono font-medium text-foreground">
            {known ? formatBytes(capacityBytes) : "—"}
          </span>
        </p>
        <p className="text-muted-foreground">
          Your message:{" "}
          <span
            className={cn(
              "font-mono font-medium",
              overCapacity ? "text-destructive" : "text-foreground",
            )}
          >
            {formatBytes(messageBytes)}
          </span>
        </p>
      </div>

      <Progress
        value={known ? percent : 0}
        variant={variant}
        label="Message size versus available capacity"
        valueText={`${formatBytes(messageBytes)} of ${
          known ? formatBytes(capacityBytes) : "unknown"
        } used`}
        className="h-2.5"
      />

      <p
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          overCapacity
            ? "text-destructive"
            : nearlyFull
              ? "text-warning"
              : "text-muted-foreground",
        )}
      >
        {overCapacity ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Over capacity — the message will not fit inside {contextLabel}.
          </>
        ) : nearlyFull ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Almost full — {Math.round(100 - percent)}% of capacity left.
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {known
              ? `${Math.round(100 - percent)}% of capacity left.`
              : "Capacity will be verified by the server."}
          </>
        )}
      </p>
    </div>
  );
}
