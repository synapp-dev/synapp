import { addDays } from "@/lib/scoring/compute";

// Calendar-month math for the review rollups. Same conventions as weeks.ts:
// all dates are YYYY-MM-DD strings, arithmetic is UTC-safe string math.

/** First day of the month containing `date`. */
export function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Shift a month start by whole months. */
export function addMonths(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split("-").map(Number);
  const total = y! * 12 + (m! - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total - year * 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Last day of the month starting at `monthStart`. */
export function monthEndOf(monthStart: string): string {
  return addDays(addMonths(monthStart, 1), -1);
}

/** Every date of the month, first through last. */
export function monthDates(monthStart: string): string[] {
  const end = monthEndOf(monthStart);
  const dates: string[] = [];
  for (let date = monthStart; date <= end; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}
