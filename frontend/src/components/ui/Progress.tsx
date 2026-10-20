import * as React from "react";
import { cn } from "@/lib/utils";

export type ProgressVariant = "default" | "warning" | "destructive";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value (clamped to 0–max). Defaults to 0. */
  value?: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  variant?: ProgressVariant;
  /** Human-readable value text announced to assistive tech. */
  valueText?: string;
  /** Accessible name for the progressbar. */
  label?: string;
}

const fillByVariant: Record<ProgressVariant, string> = {
  default: "bg-primary",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      variant = "default",
      valueText,
      label = "Progress",
      ...props
    },
    ref,
  ) => {
    const safeMax = max > 0 ? max : 100;
    const clamped = Math.max(0, Math.min(value, safeMax));
    const percent = (clamped / safeMax) * 100;
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={valueText}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            fillByVariant[variant],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
