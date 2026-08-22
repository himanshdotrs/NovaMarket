import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------ formatters ------------------------------ */

const STROOPS = 10_000_000;

/** Stroops → decimal XLM string (trims trailing zeros). */
export function fromStroops(v: number | bigint | undefined | null): string {
  const n = Number(v ?? 0) / STROOPS;
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

/** Decimal XLM → stroops bigint (safe for form inputs). */
export function toStroops(xlm: string | number): bigint {
  const n = typeof xlm === "string" ? parseFloat(xlm) : xlm;
  if (!Number.isFinite(n) || n < 0) return 0n;
  return BigInt(Math.round(n * STROOPS));
}

/** Royalty basis points → "5%" style label. */
export function formatRoyalty(bps: number | bigint | undefined | null): string {
  return `${(Number(bps ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export function shortAddress(addr?: string | null, size = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, size + 2)}…${addr.slice(-size)}`;
}

export function shortHash(hash?: string | null): string {
  if (!hash) return "";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

/** "just now" / "2m ago" / "3h ago" / "5d ago" */
export function timeAgo(input: string | number | Date): string {
  const then = new Date(input).getTime();
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function formatDateTime(input: string | number | Date): string {
  return new Date(input).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Seconds remaining until a unix deadline, clamped at 0. */
export function secondsUntil(unixDeadline: number | bigint): number {
  return Math.max(0, Number(unixDeadline) - Math.floor(Date.now() / 1000));
}

export function formatDuration(secs: number): string {
  if (secs <= 0) return "ended";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}
