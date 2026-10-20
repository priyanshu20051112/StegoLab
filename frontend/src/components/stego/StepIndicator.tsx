import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepIndicatorProps {
  steps: string[];
  /** 1-based index of the current step. */
  current: number;
  ariaLabel?: string;
}

export function StepIndicator({
  steps,
  current,
  ariaLabel = "Progress",
}: StepIndicatorProps) {
  return (
    <ol
      aria-label={ariaLabel}
      className="flex w-full items-start gap-1 sm:gap-0"
    >
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1/2 top-4 hidden h-0.5 w-full sm:block",
                  number <= current ? "bg-primary/60" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 font-mono text-xs transition-colors duration-300",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary bg-background text-primary shadow-glow"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                number
              )}
            </span>
            <span
              className={cn(
                "mt-1.5 text-[10px] leading-tight sm:text-xs",
                active
                  ? "font-semibold text-foreground"
                  : done
                    ? "text-muted-foreground"
                    : "text-muted-foreground/70",
              )}
            >
              {number}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
