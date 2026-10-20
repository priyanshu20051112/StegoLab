import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class name merger used across all UI components. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
