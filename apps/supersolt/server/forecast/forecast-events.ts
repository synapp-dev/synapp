/**
 * Operator-entered calendar events, and how the forecast engine reads them. Effects:
 *  - closure       -> the day is forced to a zero forecast and excluded from every baseline pool.
 *  - price_change  -> a level shift: baselines only learn from data on/after the change date.
 *  - menu_change   -> same as price_change.
 *  - promotion     -> optional expected multiplier on revenue and orders, and a widened band.
 *  - event         -> same as promotion (a one-off local event the operator expects to move trade).
 */

export type ForecastEventKind =
  | "closure"
  | "promotion"
  | "event"
  | "price_change"
  | "menu_change";

export type ForecastEvent = {
  kind: ForecastEventKind;
  startDate: string;
  endDate: string;
  title: string;
  /** Operator's expected trade multiplier (e.g. 1.3 = +30%); null when unknown. */
  expectedMultiplier: number | null;
};

export type ForecastEventContext = {
  events: ForecastEvent[];
};

function overlaps(event: ForecastEvent, isoDate: string): boolean {
  return isoDate >= event.startDate && isoDate <= event.endDate;
}

export function isClosedOn(
  ctx: ForecastEventContext | undefined,
  isoDate: string,
): boolean {
  return Boolean(
    ctx?.events.some((e) => e.kind === "closure" && overlaps(e, isoDate)),
  );
}

/** Set of closure dates within a window, so baselines can drop them as non-trading days. */
export function closureDates(
  ctx: ForecastEventContext | undefined,
): Set<string> {
  const set = new Set<string>();
  if (!ctx) {
    return set;
  }
  for (const e of ctx.events) {
    if (e.kind !== "closure") {
      continue;
    }
    // Expand the (usually short) closure range to individual dates.
    for (let d = e.startDate; d <= e.endDate; d = addOneDay(d)) {
      set.add(d);
    }
  }
  return set;
}

function addOneDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Most recent price/menu-change start on or before the date; baselines should not look past it. */
export function levelShiftFloor(
  ctx: ForecastEventContext | undefined,
  isoDate: string,
): string | null {
  if (!ctx) {
    return null;
  }
  let latest: string | null = null;
  for (const e of ctx.events) {
    if (e.kind !== "price_change" && e.kind !== "menu_change") {
      continue;
    }
    if (e.startDate <= isoDate && (!latest || e.startDate > latest)) {
      latest = e.startDate;
    }
  }
  return latest;
}

/** Product of expected multipliers for promotions/events overlapping the date (1 when none/unknown). */
export function promoMultiplierForDate(
  ctx: ForecastEventContext | undefined,
  isoDate: string,
): number {
  if (!ctx) {
    return 1;
  }
  let multiplier = 1;
  for (const e of ctx.events) {
    if (
      (e.kind === "promotion" || e.kind === "event") &&
      overlaps(e, isoDate) &&
      e.expectedMultiplier &&
      e.expectedMultiplier > 0
    ) {
      multiplier *= e.expectedMultiplier;
    }
  }
  return multiplier;
}

/** Whether a less-predictable operator event (promotion/one-off event) applies, to widen the band. */
export function hasUncertaintyEvent(
  ctx: ForecastEventContext | undefined,
  isoDate: string,
): boolean {
  return Boolean(
    ctx?.events.some(
      (e) =>
        (e.kind === "promotion" || e.kind === "event") && overlaps(e, isoDate),
    ),
  );
}

/** Operator events overlapping the date, for display/flags on the forecast row. */
export function eventFlagsForDate(
  ctx: ForecastEventContext | undefined,
  isoDate: string,
): Array<{ kind: ForecastEventKind; title: string }> {
  if (!ctx) {
    return [];
  }
  return ctx.events
    .filter((e) => overlaps(e, isoDate))
    .map((e) => ({ kind: e.kind, title: e.title }));
}
