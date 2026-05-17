import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
