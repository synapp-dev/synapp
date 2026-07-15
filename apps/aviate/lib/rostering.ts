import { addDays, format, parseISO } from "date-fns";

/** "04:30:00" -> "04:30" (postgres `time` columns include seconds). */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Inclusive list of ISO dates between two ISO dates, capped for safety. */
export function datesInRange(startsOn: string, endsOn: string, cap = 31): string[] {
  const start = parseISO(startsOn);
  const end = parseISO(endsOn);
  const dates: string[] = [];
  for (
    let d = start;
    d <= end && dates.length < cap;
    d = addDays(d, 1)
  ) {
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
}

export function formatDayHeading(isoDate: string): { day: string; date: string } {
  const d = parseISO(isoDate);
  return { day: format(d, "EEE"), date: format(d, "d MMM") };
}
