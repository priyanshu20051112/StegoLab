import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  /** Extra classes for the button element. */
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const [announced, setAnnounced] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          toggleTheme();
          setAnnounced(true);
        }}
        aria-label={
          isDark ? "Switch to light mode" : "Switch to dark mode"
        }
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground backdrop-blur transition-all duration-200 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {isDark ? (
          <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {announced ? (isDark ? "Dark mode enabled" : "Light mode enabled") : ""}
      </span>
    </>
  );
}
