import type { AppDb } from "@/server/db/create-app-db";
import { forecastRepo } from "@/server/forecast/forecast.repo";

/** Org default until Settings → Organisation stores target labour %. */
export const DEFAULT_TARGET_LABOUR_PCT = 30;

export type RosterDayForecast = {
  date: string;
  revenueCents: number;
  labourBudgetCents: number;
};

export type RosterWeekBudget = {
  targetLabourPct: number;
  forecastSalesCents: number;
  labourBudgetCents: number;
  daily: RosterDayForecast[];
  forecastReady: boolean;
};

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export async function computeRosterWeekBudget(
  appDb: AppDb,
  args: {
    venueId: string;
    weekStart: string;
    targetLabourPct?: number;
  },
): Promise<RosterWeekBudget> {
  const targetLabourPct = args.targetLabourPct ?? DEFAULT_TARGET_LABOUR_PCT;
  const weekEnd = addDaysIso(args.weekStart, 6);

  const forecastRows = await appDb.rls((tx) =>
    forecastRepo.listForecastsInRange(tx, {
      venueId: args.venueId,
      fromDate: args.weekStart,
      toDate: weekEnd,
    }),
  );

  const revenueByDate = new Map<string, number>();
  for (const row of forecastRows) {
    if (row.metric !== "revenue") continue;
    revenueByDate.set(row.date, Math.round(Number(row.forecastValue) * 100));
  }

  const daily: RosterDayForecast[] = [];
  let forecastSalesCents = 0;
  let labourBudgetCents = 0;

  for (let i = 0; i < 7; i += 1) {
    const date = addDaysIso(args.weekStart, i);
    const revenueCents = revenueByDate.get(date) ?? 0;
    const dayBudget = Math.round((revenueCents * targetLabourPct) / 100);
    forecastSalesCents += revenueCents;
    labourBudgetCents += dayBudget;
    daily.push({ date, revenueCents, labourBudgetCents: dayBudget });
  }

  return {
    targetLabourPct,
    forecastSalesCents,
    labourBudgetCents,
    daily,
    forecastReady: revenueByDate.size > 0,
  };
}

export function splhPlanned(
  forecastSalesCents: number,
  rosteredHours: number,
): number | null {
  if (rosteredHours <= 0) return null;
  return forecastSalesCents / 100 / rosteredHours;
}
