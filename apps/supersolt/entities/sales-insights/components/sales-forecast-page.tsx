"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ForecastEventsManager } from "@/entities/forecast/components/forecast-events-manager";
import {
  dateRangeToCalendarIso,
  useForecastRangeQuery,
} from "@/entities/forecast/model/use-forecast-range-query";
import { ForecastAccuracyCard } from "@/entities/sales-insights/components/forecast-accuracy-card";
import { ForecastModelCard } from "@/entities/sales-insights/components/forecast-model-card";
import { ForecastOutlookCard } from "@/entities/sales-insights/components/forecast-outlook-card";
import { SalesKpiMetricCard } from "@/entities/sales-insights/components/sales-kpi-metric-card";
import { SalesTabPageHeader } from "@/entities/sales-insights/components/sales-tab-page-header";
import {
  buildForecastOutlookDays,
  daysUntilForecastReady,
  summarizeForecastAccuracy,
  type ChartPointWeather,
} from "@/entities/sales-insights/lib/sales-forecast-ui";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import {
  WEATHER_KIND_LABELS,
  weatherIconKind,
} from "@/entities/weather/lib/weather-icon-kind";
import { addDaysCalendarIso, listCalendarDatesBetween } from "@/lib/date/calendar-iso";
import { SkeletonReveal } from "@/lib/ui/skeleton-reveal";
import type { VenueWeatherDayDto } from "@/entities/forecast/model/types";

const OUTLOOK_DAYS = 14;

/** Calendar "today" in the venue's timezone (en-CA formats as YYYY-MM-DD). */
function todayIsoInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildWeatherByDate(
  weather: VenueWeatherDayDto[],
): Map<string, ChartPointWeather> {
  const map = new Map<string, ChartPointWeather>();
  for (const day of weather) {
    const kind = weatherIconKind({
      weatherCode: day.weatherCode,
      bucket: day.bucket,
    });
    const tempMaxC = day.tempMaxC === null ? null : Math.round(day.tempMaxC);
    map.set(day.date, {
      kind,
      tempMaxC,
      label: `${WEATHER_KIND_LABELS[kind]}${tempMaxC === null ? "" : ` · ${tempMaxC}°`}`,
    });
  }
  return map;
}

type SalesForecastPageClientProps = {
  organisation: string;
  venue: string;
};

export function SalesForecastPageClient({
  organisation,
  venue,
}: SalesForecastPageClientProps) {
  const { dateRange, meta, timezone, contentLoading, splashHeld } =
    useSalesInsightsBase({ organisation, venue });
  const isSquare = meta?.dataSource === "square";

  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);
  const outlookToIso = useMemo(
    () => addDaysCalendarIso(todayIso, OUTLOOK_DAYS - 1),
    [todayIso],
  );

  // Forward view is always today + 13 regardless of the period picker; the
  // picker drives the accuracy section below.
  const outlookQuery = useForecastRangeQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    fromDate: todayIso,
    toDate: outlookToIso,
    enabled: isSquare,
  });

  const accuracyRange = useMemo(
    () => dateRangeToCalendarIso(dateRange),
    [dateRange],
  );
  const accuracyQuery = useForecastRangeQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    fromDate: accuracyRange.fromDate,
    toDate: accuracyRange.toDate,
    enabled: isSquare,
  });

  const state = outlookQuery.state ?? accuracyQuery.state;
  const forecastReady = state?.forecastReady ?? false;

  const outlookDays = useMemo(() => {
    const dates = listCalendarDatesBetween(todayIso, outlookToIso);
    return buildForecastOutlookDays(
      outlookQuery.forecasts,
      dates,
      todayIso,
      buildWeatherByDate(outlookQuery.weather),
    );
  }, [outlookQuery.forecasts, outlookQuery.weather, todayIso, outlookToIso]);

  const accuracySummary = useMemo(() => {
    const dates = listCalendarDatesBetween(
      accuracyRange.fromDate,
      // Never score days that haven't happened yet.
      accuracyRange.toDate < todayIso ? accuracyRange.toDate : addDaysCalendarIso(todayIso, -1),
    );
    return summarizeForecastAccuracy(
      accuracyQuery.dailySales,
      accuracyQuery.forecasts,
      dates,
    );
  }, [
    accuracyQuery.dailySales,
    accuracyQuery.forecasts,
    accuracyRange.fromDate,
    accuracyRange.toDate,
    todayIso,
  ]);

  const kpis = useMemo(() => {
    const tradingDays = outlookDays.filter((day) => !day.closed);
    const next7 = outlookDays
      .slice(0, 7)
      .reduce((sum, day) => sum + (day.closed ? 0 : day.revenueCents), 0);
    const next14 = outlookDays.reduce(
      (sum, day) => sum + (day.closed ? 0 : day.revenueCents),
      0,
    );
    const busiest = tradingDays.reduce(
      (best, day) =>
        best === null || day.revenueCents > best.revenueCents ? day : best,
      null as (typeof outlookDays)[number] | null,
    );
    const quietest = tradingDays.reduce(
      (worst, day) =>
        worst === null || day.revenueCents < worst.revenueCents ? day : worst,
      null as (typeof outlookDays)[number] | null,
    );
    return { next7, next14, busiest, quietest };
  }, [outlookDays]);

  const loading =
    splashHeld ||
    contentLoading ||
    (isSquare && (outlookQuery.isPending || accuracyQuery.isPending));

  const showForecastContent = isSquare && forecastReady && outlookDays.length > 0;

  return (
    <section className="space-y-4">
      <SalesTabPageHeader
        title="Forecast"
        description="What the engine expects next and how it has been scoring: the two-week outlook with its drivers, accuracy for the selected period, and the calendar that shapes it."
      />

      {!loading && !isSquare ? (
        <Card>
          <CardContent className="py-6 text-center text-sm">
            <p className="font-medium">Forecasting needs Square sales history</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Connect Square from the{" "}
              <Link
                href={`/${organisation}/${venue}/insights/sales`}
                className="text-primary font-medium underline underline-offset-2"
              >
                sales overview
              </Link>{" "}
              to unlock daily forecasts.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && isSquare && !forecastReady ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Forecasts warming up
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {state && state.availableHistoryDays > 0
                ? `${state.availableHistoryDays} day${state.availableHistoryDays === 1 ? "" : "s"} of sales history synced. Forecasts unlock after 14 days, so about ${daysUntilForecastReady(state.availableHistoryDays)} more day${daysUntilForecastReady(state.availableHistoryDays) === 1 ? "" : "s"} needed.`
                : "Import Square history from DevKit to build daily sales and enable forecasts."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isSquare && (loading || showForecastContent) ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SkeletonReveal loading={loading} markSize={52}>
            <SalesKpiMetricCard
              label="Next 7 days"
              value={formatCurrency(kpis.next7)}
              isLoading={loading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={loading} markSize={52}>
            <SalesKpiMetricCard
              label="Next 14 days"
              value={formatCurrency(kpis.next14)}
              isLoading={loading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={loading} markSize={52}>
            <SalesKpiMetricCard
              label="Busiest day ahead"
              value={kpis.busiest ? `${kpis.busiest.weekday} ${kpis.busiest.label}` : "—"}
              size="md"
              forecastHint={
                kpis.busiest ? formatCurrency(kpis.busiest.revenueCents) : null
              }
              isLoading={loading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={loading} markSize={52}>
            <SalesKpiMetricCard
              label="Quietest day ahead"
              value={kpis.quietest ? `${kpis.quietest.weekday} ${kpis.quietest.label}` : "—"}
              size="md"
              forecastHint={
                kpis.quietest ? formatCurrency(kpis.quietest.revenueCents) : null
              }
              isLoading={loading}
            />
          </SkeletonReveal>
        </div>
      ) : null}

      {isSquare && (loading || showForecastContent) ? (
        <SkeletonReveal loading={loading} radius={14} markSize={72}>
          <ForecastOutlookCard days={outlookDays} />
        </SkeletonReveal>
      ) : null}

      {isSquare && (loading || (forecastReady && !accuracyQuery.isPending)) ? (
        <SkeletonReveal loading={loading} radius={14} markSize={72}>
          <ForecastAccuracyCard summary={accuracySummary} />
        </SkeletonReveal>
      ) : null}

      {isSquare ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ForecastEventsManager
              organisation={organisation}
              venue={venue}
              onChanged={() => {
                outlookQuery.refetch();
                accuracyQuery.refetch();
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <ForecastModelCard
              organisation={organisation}
              venue={venue}
              state={state}
              weatherActive={outlookQuery.weather.length > 0}
              onRecomputed={() => {
                outlookQuery.refetch();
                accuracyQuery.refetch();
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
