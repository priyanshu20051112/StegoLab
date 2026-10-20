import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

export interface ErrorAlertProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Polite, screen-reader-friendly error announcement used for API failures.
 */
export function ErrorAlert({
  message,
  title = "Something went wrong",
  onDismiss,
  className,
}: ErrorAlertProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("animate-fade-in", className)}
    >
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle className="flex items-center justify-between gap-3 pr-6">
          <span>{title}</span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss error message"
              className="rounded-md p-1 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
