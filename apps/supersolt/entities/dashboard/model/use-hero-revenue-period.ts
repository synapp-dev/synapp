"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { forecastApi } from "@/entities/forecast/api/endpoints";
import { addDaysCalendarIso } from "@/lib/date/calendar-iso";
import {
  buildHeroPeriodView,
  type HeroPeriodView,
} from "@/lib/dashboard/build-hero-period-view";
import { heroChartWindowInVenue } from "@/lib/dashboard/dashboard-sales-week";
import { heroPeriodOption, type HeroPeriodKey } from "@/lib/dashboard/hero-period";
import { todayCalendarIsoInVenue } from "@/lib/roster/venue-time";

const ALL_TIME_FROM = "2000-01-01";

/**
 * Hero data for the non-default period picks, sourced from synced
 * daily_sales (the default 7-day view keeps the live-orders snapshot).
 * Fetches the window plus its comparison window in one range.
 */
export function useHeroRevenuePeriod(input: {
  organisationSlug: string;
  venueSlug: string;
  venueTimezone: string;
  periodKey: HeroPeriodKey;
  todayLive: { revenueCents: number; hasTrade: boolean } | null;
  enabled: boolean;
}): { view: HeroPeriodView | null; isPending: boolean } {
  const timezone = input.venueTimezone;
  const today = todayCalendarIsoInVenue(timezone);
  const option = heroPeriodOption(input.periodKey);
  const fromDate =
    option.days !== null
      ? addDaysCalendarIso(today, -(option.days * 2 - 1))
      : ALL_TIME_FROM;
  const enabled =
    input.enabled && Boolean(input.organisationSlug && input.venueSlug);

  const dailyQuery = useQuery({
    queryKey: [
      "hero-period-daily-sales",
      input.organisationSlug,
      input.venueSlug,
      fromDate,
      today,
    ],
    queryFn: () =>
      forecastApi.get.dailySales({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        fromDate,
        toDate: today,
      }),
    enabled,
    staleTime: 60_000,
  });

  const window = heroChartWindowInVenue(timezone, today);
  const forecastQuery = useQuery({
    queryKey: [
      "hero-period-forecasts",
      input.organisationSlug,
      input.venueSlug,
      window.fromDate,
      window.toDate,
    ],
    queryFn: () =>
      forecastApi.get
        .forecasts({
          organisationSlug: input.organisationSlug,
          venueSlug: input.venueSlug,
          fromDate: window.fromDate,
          toDate: window.toDate,
        })
        .catch(() => null),
    enabled,
    staleTime: 60_000,
  });

  const view = useMemo(() => {
    if (!enabled || !dailyQuery.data) return null;
    const forecastMap: Record<string, number> = {};
    for (const row of forecastQuery.data?.forecasts ?? []) {
      if (row.metric === "revenue") forecastMap[row.date] = row.forecastValue;
    }
    return buildHeroPeriodView({
      periodKey: input.periodKey,
      today,
      dailySales: dailyQuery.data.rows.map((row) => ({
        date: row.date,
        revenueCents: row.revenueCents,
      })),
      revenueForecastCentsByDate: forecastMap,
      todayLive: input.todayLive,
    });
  }, [
    enabled,
    dailyQuery.data,
    forecastQuery.data,
    input.periodKey,
    input.todayLive,
    today,
  ]);

  return { view, isPending: enabled && dailyQuery.isPending };
}
