import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/** The ONLY value ever persisted to localStorage — never secrets or media. */
const STORAGE_KEY = "stegolab-theme";

const listeners = new Set<() => void>();

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
  } catch {
    /* fall through to dark */
  }
  return "dark";
}

function applyTheme(next: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.style.colorScheme = next;
}

let theme: Theme = readStoredTheme() ?? systemTheme();
applyTheme(theme);

function setTheme(next: Theme): void {
  if (next === theme) return;
  theme = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable (private mode) — theme still applies for this session */
  }
  applyTheme(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return theme;
}

export function useTheme(): {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, []);
  const set = useCallback((next: Theme) => setTheme(next), []);
  return { theme: current, isDark: current === "dark", setTheme: set, toggleTheme };
}
