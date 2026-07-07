import { differenceInDays, format, parseISO } from "date-fns";

const DATE_STYLES = {
  short: "d MMM",
  medium: "d MMM yyyy",
  long: "EEEE, d MMMM yyyy",
} as const;

function toDate(date: string | Date): Date {
  return typeof date === "string" ? parseISO(date) : date;
}

export function formatMoney(amount: number, currency = "AUD"): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export function formatDate(
  date: string | Date,
  style: "short" | "medium" | "long" = "medium"
): string {
  try {
    return format(toDate(date), DATE_STYLES[style]);
  } catch {
    return typeof date === "string" ? date : "";
  }
}

export function formatHours(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function daysSince(date: string | Date): number {
  const days = differenceInDays(new Date(), toDate(date));
  return Number.isNaN(days) ? 0 : days;
}

// Compact relative time, e.g. "1d", "3h", "5mo".
export function relativeTime(date: string | Date): string {
  const parsed = toDate(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const sec = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(day / 365)}y`;
}
