import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export interface FormatUsdcOptions {
  precision?: 2 | 7;
}

export function formatUsdc(
  amount: string | number,
  { precision = 2 }: FormatUsdcOptions = {}
): string {
  const d = new Decimal(String(amount));
  const isNegative = d.isNegative();
  const formatted = d.abs().toFixed(precision);
  const [whole, frac = ""] = formatted.split(".");
  const intPart = Number(whole).toLocaleString("en-US");
  const result = `${intPart}.${frac} USDC`;
  return isNegative ? `-${result}` : result;
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
