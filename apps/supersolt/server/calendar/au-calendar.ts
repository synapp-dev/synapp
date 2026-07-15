/**
 * Deterministic, known-in-advance calendar signals (public holidays, school-term breaks) for
 * demand forecasting. Static, region-keyed, no external calls. Currently only Victoria (Australia)
 * is populated; add regions/years by extending the tables below.
 */

export type CalendarRegion = "AU-VIC";

/** Resolve a venue's stored state/country to a supported calendar region, or null if unsupported. */
export function resolveCalendarRegion(
  state: string | null | undefined,
  country: string | null | undefined,
): CalendarRegion | null {
  const c = (country ?? "").trim().toLowerCase();
  if (c && c !== "au" && c !== "australia") {
    return null;
  }
  const s = (state ?? "").trim().toLowerCase();
  if (s === "vic" || s === "victoria") {
    return "AU-VIC";
  }
  return null;
}

type PublicHoliday = { date: string; name: string };
type SchoolTerm = { start: string; end: string };

/** Victorian statewide public holidays. Source: business.vic.gov.au (verified). */
const AU_VIC_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-03-09", name: "Labour Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Saturday before Easter Sunday" },
  { date: "2026-04-05", name: "Easter Sunday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "ANZAC Day" },
  { date: "2026-06-08", name: "King's Birthday" },
  { date: "2026-09-25", name: "Friday before the AFL Grand Final" },
  { date: "2026-11-03", name: "Melbourne Cup Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-28", name: "Boxing Day (additional)" },
];

/** Victorian government-school term dates (student first/last day). Source: vic.gov.au (verified). */
const AU_VIC_SCHOOL_TERMS: Record<number, SchoolTerm[]> = {
  2026: [
    { start: "2026-01-28", end: "2026-04-02" },
    { start: "2026-04-20", end: "2026-06-26" },
    { start: "2026-07-13", end: "2026-09-18" },
    { start: "2026-10-05", end: "2026-12-18" },
  ],
};

const PUBLIC_HOLIDAYS: Record<CalendarRegion, Map<string, string>> = {
  "AU-VIC": new Map(AU_VIC_PUBLIC_HOLIDAYS.map((h) => [h.date, h.name])),
};

const SCHOOL_TERMS: Record<CalendarRegion, Record<number, SchoolTerm[]>> = {
  "AU-VIC": AU_VIC_SCHOOL_TERMS,
};

/** Public holiday name for a date in the region, or null. */
export function publicHolidayName(
  region: CalendarRegion,
  isoDate: string,
): string | null {
  return PUBLIC_HOLIDAYS[region].get(isoDate) ?? null;
}

/**
 * Whether a date falls in a school-term break (any gap between terms, plus the summer break before
 * the first term and after the last term of a known year). Returns false for years we have no term
 * data for, so an unknown year never silently mislabels days.
 */
export function isSchoolHoliday(region: CalendarRegion, isoDate: string): boolean {
  const year = Number(isoDate.slice(0, 4));
  const terms = SCHOOL_TERMS[region][year];
  if (!terms || terms.length === 0) {
    return false;
  }
  // Inside any term => school day, not a break.
  for (const term of terms) {
    if (isoDate >= term.start && isoDate <= term.end) {
      return false;
    }
  }
  // Within the school year's span but not in a term => break (includes pre-term-1 / post-term-4).
  return true;
}
