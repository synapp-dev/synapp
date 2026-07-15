"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Download,
  ListOrdered,
  ReceiptText,
  SquareStack,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { InsightsPeriodControls } from "@/entities/insights/components/insights-period-controls";
import { useInsightsAlertsQuery } from "@/entities/insights/model/use-insights-alerts-query";
import { useInsightsPeriodSearchString } from "@/entities/insights/model/insights-period-provider";
import { SalesHeroCard } from "@/entities/sales-insights/components/sales-hero-card";
import { SalesKpiMetricCard } from "@/entities/sales-insights/components/sales-kpi-metric-card";
import { SalesObservationsCard } from "@/entities/sales-insights/components/sales-observations-card";
import {
  buildSalesVsForecastChartPoints,
  calendarDatesInRange,
  chartHasForecastSeries,
  computeForecastDelta,
  confidenceLabel,
  daysUntilForecastReady,
  maxConfidenceInRange,
  summarizeComparableForecastPeriod,
  type ChartPointWeather,
} from "@/entities/sales-insights/lib/sales-forecast-ui";
import {
  WEATHER_KIND_LABELS,
  weatherIconKind,
} from "@/entities/weather/lib/weather-icon-kind";
import {
  channelLabel,
  formatCurrency,
  paymentLabel,
  sourceLabel,
  statusLabel,
} from "@/entities/sales-insights/lib/sales-format";
import { useSalesIntelligenceQuery } from "@/entities/sales-insights/model/use-sales-intelligence-query";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import {
  SkeletonReveal,
  SkeletonRevealGroup,
} from "@/lib/ui/skeleton-reveal";
import {
  dateRangeToCalendarIso,
  useForecastRangeQuery,
} from "@/entities/forecast/model/use-forecast-range-query";
import type { DailySalesRow } from "@/entities/forecast/model/types";
import { toDateInputValue } from "@/entities/insights/lib/period";
import { aggregateOrdersToDailySales } from "@/lib/sales/daily-sales-aggregate";

type SalesOverviewPageClientProps = {
  organisation: string;
  venue: string;
};

/**
 * Ghost icon-button styling for the dark sales hero card. Dual-theme:
 * light chrome on the dark-green surface (app light mode), dark chrome on the
 * inverted light-green surface (app dark mode).
 */
const HERO_ICON_ACTION_CLASS =
  "size-8 text-emerald-100/85 hover:bg-white/15 hover:text-white dark:text-slate-700 dark:hover:bg-slate-900/10 dark:hover:text-slate-900";

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function hourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? "am" : "pm";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}${suffix}`;
}

function formatCsvDateTime(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

type ExploreCardProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: string[];
  cta: string;
};

function ExploreCard({ href, icon: Icon, title, lines, cta }: ExploreCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="hover:border-primary/50 h-full gap-0 py-0 transition-colors">
        <CardContent className="flex h-full flex-col gap-2 px-4 py-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="text-muted-foreground h-4 w-4" />
            {title}
          </p>
          <div className="flex-1 space-y-1">
            {lines.map((line) => (
              <p
                key={line}
                className="text-muted-foreground text-xs leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
          <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
            {cta}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SalesOverviewPageClient({
  organisation,
  venue,
}: SalesOverviewPageClientProps) {
  const {
    dateRange,
    splashHeld,
    query,
    orders,
    meta,
    salesMix,
    contentLoading,
  } = useSalesInsightsBase({ organisation, venue });
  const isPending = query.isPending;

  const salesAlertsQuery = useInsightsAlertsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    module: "sales",
  });
  const salesAlerts = salesAlertsQuery.data ?? [];

  const intelligenceQuery = useSalesIntelligenceQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
    scope: "full",
    enabled: meta?.dataSource === "square",
  });
  const intelligence = intelligenceQuery.data;

  const periodSearch = useInsightsPeriodSearchString();
  const tabHref = (segment: string) =>
    `/${organisation}/${venue}/insights/sales/${segment}?${periodSearch}`;

  const calendarRange = useMemo(
    () => dateRangeToCalendarIso(dateRange),
    [dateRange]
  );

  const forecastQuery = useForecastRangeQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    fromDate: calendarRange.fromDate,
    toDate: calendarRange.toDate,
    enabled: meta?.dataSource === "square",
  });

  useEffect(() => {
    if (meta?.squareError) {
      toast.error("Could not load Square payments", {
        description: meta.squareError,
        duration: 12_000,
      });
    }
  }, [meta?.squareError]);

  useEffect(() => {
    if (meta?.squareOrdersError) {
      toast.error("Could not load Square order lines", {
        description: meta.squareOrdersError,
        duration: 14_000,
      });
    }
  }, [meta?.squareOrdersError]);

  useEffect(() => {
    if (meta?.squarePaymentsTruncated) {
      toast.warning("Some Square payments were not loaded", {
        description:
          "This date range has more transactions than we could fetch in one pass. Try a shorter range or contact support.",
        duration: 14_000,
      });
    }
  }, [meta?.squarePaymentsTruncated]);

  const periodStats = useMemo(() => {
    const validTransactions = orders.filter((order) => !order.is_void);
    const sales = validTransactions.filter((order) => !order.is_refund);
    const refunds = validTransactions.filter((order) => order.is_refund);

    const totalRevenue = sales.reduce(
      (sum, order) => sum + order.net_amount,
      0,
    );
    const totalRefunds = refunds.reduce(
      (sum, order) => sum + order.net_amount,
      0,
    );
    return {
      totalOrders: sales.length,
      totalRevenue,
      totalRefunds,
      refundCount: refunds.length,
      voidCount: orders.filter((order) => order.is_void).length,
      avgCheck: sales.length === 0 ? 0 : totalRevenue / sales.length,
    };
  }, [orders]);

  const rangeDates = useMemo(
    () => calendarDatesInRange(dateRange.start, dateRange.end),
    [dateRange]
  );

  // The daily_sales facts behind the chart are cron-synced, so they can lag the
  // payments list (today all day, and any day whose recompute hasn't landed).
  // The loaded payments cover the whole selected range — aggregate them and let
  // them win for every day they cover, so the chart always agrees with the
  // transactions table.
  const liveMergedDailySales = useMemo((): DailySalesRow[] => {
    const dailySales = forecastQuery.dailySales;
    if (
      meta?.dataSource !== "square" ||
      meta.squarePaymentsTruncated ||
      orders.length === 0
    ) {
      return dailySales;
    }
    const timezone =
      meta.venueTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const computedAt = new Date().toISOString();
    const fallbackVenueId = dailySales[0]?.venueId ?? "";
    const liveByDate = new Map(
      aggregateOrdersToDailySales(orders, timezone).map((day) => [
        day.date,
        day,
      ]),
    );
    const merged = dailySales.map((row) => {
      const live = liveByDate.get(row.date);
      if (!live) {
        return row;
      }
      liveByDate.delete(row.date);
      return {
        venueId: row.venueId,
        source: "live_payments",
        computedAt,
        ...live,
      };
    });
    // Days with payments but no fact row yet.
    for (const live of liveByDate.values()) {
      merged.push({
        venueId: fallbackVenueId,
        source: "live_payments",
        computedAt,
        ...live,
      });
    }
    return merged;
  }, [
    forecastQuery.dailySales,
    orders,
    meta?.dataSource,
    meta?.venueTimezone,
    meta?.squarePaymentsTruncated,
  ]);

  const weatherByDate = useMemo(() => {
    const map = new Map<string, ChartPointWeather>();
    for (const day of forecastQuery.weather) {
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
  }, [forecastQuery.weather]);

  const forecastUi = useMemo(() => {
    const { forecasts, state } = forecastQuery;
    const dailySales = liveMergedDailySales;
    const forecastReady = state?.forecastReady ?? false;
    const chartPoints = buildSalesVsForecastChartPoints(
      dailySales,
      forecasts,
      rangeDates,
      weatherByDate
    );
    const showForecast = forecastReady && chartHasForecastSeries(chartPoints);
    const comparable = summarizeComparableForecastPeriod(
      dailySales,
      forecasts,
      rangeDates
    );
    const confidence = maxConfidenceInRange(
      forecasts,
      comparable.comparableDates
    );

    const hasForecastCoverage =
      comparable.forecastRevenueCents > 0 ||
      comparable.forecastOrders > 0 ||
      comparable.forecastAvgCheckCents > 0;

    const revenueDelta =
      forecastReady &&
      hasForecastCoverage &&
      comparable.forecastRevenueCents > 0
        ? computeForecastDelta(
            comparable.actualRevenueCents,
            comparable.forecastRevenueCents
          )
        : null;
    const ordersDelta =
      forecastReady && hasForecastCoverage && comparable.forecastOrders > 0
        ? computeForecastDelta(
            comparable.actualOrders,
            comparable.forecastOrders
          )
        : null;
    const avgCheckDelta =
      forecastReady &&
      hasForecastCoverage &&
      comparable.forecastAvgCheckCents > 0
        ? computeForecastDelta(
            comparable.actualAvgCheckCents,
            comparable.forecastAvgCheckCents
          )
        : null;

    const periodForecastChartTotal = showForecast
      ? comparable.forecastRevenueCents / 100
      : null;
    const comparableDayCount = comparable.comparableDates.length;

    return {
      forecastReady,
      chartPoints,
      showForecast,
      confidence: confidenceLabel(confidence),
      revenueDelta,
      ordersDelta,
      avgCheckDelta,
      periodForecastChartTotal,
      comparableDayCount,
      daysUntilReady: daysUntilForecastReady(state?.availableHistoryDays ?? 0),
      availableHistoryDays: state?.availableHistoryDays ?? 0,
    };
  }, [
    forecastQuery.forecasts,
    liveMergedDailySales,
    forecastQuery.state,
    rangeDates,
    weatherByDate,
  ]);

  function handleExportCsv() {
    if (orders.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const header =
      "Date/Time,Order #,Channel,Gross,Tax,Discount,Net,Payment,Source,Status";
    const rows = orders.map((order) => {
      return [
        formatCsvDateTime(order.order_datetime),
        `"${order.order_number ?? order.id.slice(0, 8)}"`,
        channelLabel(order.channel),
        (order.gross_amount / 100).toFixed(2),
        (order.tax_amount / 100).toFixed(2),
        (order.discount_amount / 100).toFixed(2),
        (order.net_amount / 100).toFixed(2),
        paymentLabel(order.payment_method),
        sourceLabel(order.source).toLowerCase(),
        statusLabel(order),
      ].join(",");
    });

    const csvContent = [header, ...rows].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = csvUrl;
    link.download = `sales-${toDateInputValue(dateRange.start)}-to-${toDateInputValue(
      dateRange.end,
    )}.csv`;
    link.click();
    URL.revokeObjectURL(csvUrl);

    toast.success(`Exported ${orders.length} transactions`);
  }

  const integrationHref = `/${organisation}/${venue}/settings/integrations`;

  const squareConnectHref = useMemo(() => {
    const nextPath = `/${organisation}/${venue}/insights/sales`;
    return `/api/square/oauth/authorize?organisation=${encodeURIComponent(organisation)}&venue=${encodeURIComponent(venue)}&next=${encodeURIComponent(nextPath)}`;
  }, [organisation, venue]);

  const squareIntegrationNeedsAttention = useMemo(() => {
    if (isPending || !meta) {
      return false;
    }
    if (meta.dataSource === "demo") {
      return true;
    }
    if (
      meta.dataSource === "square" &&
      (meta.squareError || meta.squareOrdersError)
    ) {
      return true;
    }
    return false;
  }, [isPending, meta]);

  const squareConnectPrimaryLabel =
    meta?.dataSource === "square" &&
    (meta.squareError || meta.squareOrdersError)
      ? "Reconnect Square"
      : "Connect Square";

  const heroLoading =
    splashHeld ||
    isPending ||
    (meta?.dataSource === "square" &&
      forecastQuery.isPending &&
      !forecastQuery.isError);

  const exploreCards = useMemo((): ExploreCardProps[] => {
    if (meta?.dataSource !== "square") {
      return [];
    }
    const cards: ExploreCardProps[] = [];

    const topMix = salesMix.slice(0, 3);
    cards.push({
      href: tabHref("mix"),
      icon: ListOrdered,
      title: "Sales mix",
      lines:
        topMix.length > 0
          ? topMix.map(
              (row) => `${row.label} · ${formatCurrency(row.revenueCents)}`,
            )
          : ["Item ranking appears once sales land."],
      cta: "Full ranking",
    });

    const matrix = intelligence?.matrix;
    const opportunity = intelligence?.pairings?.opportunities[0];
    const menuLines: string[] = [];
    if (matrix && matrix.items.length > 0) {
      const count = (q: string) =>
        matrix.items.filter((item) => item.quadrant === q).length;
      menuLines.push(
        `${count("star")} Stars · ${count("plowhorse")} Plowhorses · ${count("puzzle")} Puzzles · ${count("dog")} Dogs`,
      );
    }
    if (opportunity) {
      menuLines.push(
        `${formatCurrency(opportunity.estValueCents)} attach opportunity on ${opportunity.itemLabel}`,
      );
    }
    cards.push({
      href: tabHref("menu"),
      icon: SquareStack,
      title: "Menu",
      lines:
        menuLines.length > 0
          ? menuLines
          : ["Engineering matrix and pairings for costed items."],
      cta: "Engineering & pairings",
    });

    const peak = intelligence?.heatmap?.peak;
    const fulfillment = intelligence?.fulfillment;
    const patternLines: string[] = [];
    if (peak) {
      patternLines.push(
        `Money hour: ${WEEKDAY_LONG[peak.dow]} ${hourLabel(peak.hour)}`,
      );
    }
    if (fulfillment) {
      const total =
        fulfillment.totalDineInCents +
        fulfillment.totalPickUpCents +
        fulfillment.totalDeliveryCents;
      if (total > 0) {
        patternLines.push(
          `Dine-in ${Math.round((fulfillment.totalDineInCents / total) * 100)}% · Pick-up ${Math.round((fulfillment.totalPickUpCents / total) * 100)}%`,
        );
      }
    }
    cards.push({
      href: tabHref("patterns"),
      icon: Clock3,
      title: "Patterns",
      lines:
        patternLines.length > 0
          ? patternLines
          : ["Weekly rhythm and fulfilment split."],
      cta: "Rhythm & channels",
    });

    cards.push({
      href: tabHref("transactions"),
      icon: ReceiptText,
      title: "Transactions",
      lines: [
        `${periodStats.totalOrders.toLocaleString("en-AU")} sales in the period`,
        `${periodStats.refundCount} refund${periodStats.refundCount === 1 ? "" : "s"} · ${periodStats.voidCount} void${periodStats.voidCount === 1 ? "" : "s"}`,
      ],
      cta: "Search & export",
    });

    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.dataSource, salesMix, intelligence, periodStats, periodSearch]);

  return (
    <section className="space-y-5">
      {salesAlerts.length > 0 ? (
        <div className="space-y-2">
          {salesAlerts.map((alert) => (
            <Card key={alert.id} className="border-primary/20 bg-muted/30">
              <CardContent className="py-3 text-sm">
                <p className="font-medium">{alert.headline}</p>
                {alert.supportingMetric ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {alert.supportingMetric}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {squareIntegrationNeedsAttention ? (
        <Card className="border-primary/25 bg-muted/50">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">
                {meta?.dataSource === "demo"
                  ? "Square is not connected for this venue"
                  : "Square could not load sales data"}
              </p>
              <p className="text-muted-foreground text-xs">
                {meta?.dataSource === "demo"
                  ? "You are seeing demo transactions. Organisation admins can connect Square POS to load real sales for this venue."
                  : "Your venue may be missing a valid Square link, location, or API access. Reconnect Square from this page or review venue settings."}
              </p>
              {meta?.dataSource === "square" &&
              (meta.squareError || meta.squareOrdersError) ? (
                <ul className="text-destructive list-inside list-disc text-xs">
                  {meta.squareError ? <li>{meta.squareError}</li> : null}
                  {meta.squareOrdersError ? (
                    <li>{meta.squareOrdersError}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <a href={squareConnectHref}>{squareConnectPrimaryLabel}</a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={integrationHref}>Square settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!heroLoading &&
      meta?.dataSource === "square" &&
      !forecastUi.forecastReady ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Forecasts warming up
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {forecastUi.availableHistoryDays > 0
                ? `${forecastUi.availableHistoryDays} day${forecastUi.availableHistoryDays === 1 ? "" : "s"} of sales history synced. Forecasts unlock after 14 days — about ${forecastUi.daysUntilReady} more day${forecastUi.daysUntilReady === 1 ? "" : "s"} needed.`
                : "Import Square history from DevKit to build daily sales and enable forecasts."}{" "}
              <Link
                href={`/${organisation}/${venue}/settings/devkit`}
                className="text-primary font-medium underline underline-offset-2"
              >
                DevKit
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <SkeletonReveal loading={heroLoading} radius={14} markSize={84}>
        <SalesHeroCard
          revenueCents={periodStats.totalRevenue}
          delta={forecastUi.revenueDelta}
          points={forecastUi.chartPoints}
          periodForecastTotal={forecastUi.periodForecastChartTotal}
          comparableDayCount={forecastUi.comparableDayCount}
          showForecast={forecastUi.showForecast}
          isLoading={heroLoading}
          dataSource={meta?.dataSource ?? "demo"}
          periodControls={<InsightsPeriodControls tone="onHero" />}
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={HERO_ICON_ACTION_CLASS}
                    asChild
                  >
                    <Link
                      href={`/${organisation}/${venue}/settings/calendar`}
                      aria-label="Venue calendar"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Venue calendar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={HERO_ICON_ACTION_CLASS}
                    aria-label="Export CSV"
                    onClick={handleExportCsv}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export CSV</TooltipContent>
              </Tooltip>
            </>
          }
        />
      </SkeletonReveal>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SkeletonRevealGroup>
          <SkeletonReveal loading={contentLoading} markSize={52}>
            <SalesKpiMetricCard
              label="Orders"
              value={periodStats.totalOrders.toLocaleString("en-AU")}
              delta={forecastUi.ordersDelta}
              confidenceLabel={
                forecastUi.showForecast ? forecastUi.confidence : null
              }
              isLoading={contentLoading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={contentLoading} markSize={52}>
            <SalesKpiMetricCard
              label="Avg check"
              value={formatCurrency(periodStats.avgCheck)}
              delta={forecastUi.avgCheckDelta}
              confidenceLabel={
                forecastUi.showForecast ? forecastUi.confidence : null
              }
              isLoading={contentLoading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={contentLoading} markSize={52}>
            <SalesKpiMetricCard
              label="Refunds"
              value={`${periodStats.refundCount} (${formatCurrency(periodStats.totalRefunds)})`}
              size="md"
              isLoading={contentLoading}
            />
          </SkeletonReveal>
          <SkeletonReveal loading={contentLoading} markSize={52}>
            <SalesKpiMetricCard
              label="Voids"
              value={String(periodStats.voidCount)}
              size="md"
              isLoading={contentLoading}
            />
          </SkeletonReveal>
        </SkeletonRevealGroup>
      </div>

      {intelligence && intelligence.observations.length > 0 ? (
        <SalesObservationsCard
          observations={intelligence.observations}
          records={intelligence.records}
        />
      ) : null}

      {exploreCards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {exploreCards.map((card) => (
            <ExploreCard key={card.title} {...card} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
