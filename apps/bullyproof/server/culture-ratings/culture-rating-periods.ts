/**
 * Inclusive calendar-date ranges (YYYY-MM-DD). Two ranges overlap if they share any day.
 */
export function inclusiveDateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
