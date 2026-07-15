"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Download,
  Flame,
  ShoppingCart,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { InsightsPeriodControls } from "@/entities/insights/components/insights-period-controls";
import { useInsightsAlertsQuery } from "@/entities/insights/model/use-insights-alerts-query";
import { useInsightsPeriod } from "@/entities/insights/model/insights-period-provider";
import { toDateInputValue } from "@/entities/insights/lib/period";
import { calendarDatesInRange } from "@/entities/sales-insights/lib/sales-forecast-ui";
import { dateRangeToCalendarIso } from "@/entities/forecast/model/use-forecast-range-query";
import { useDashboardInsightTiles } from "@/entities/dashboard/model/use-dashboard-insight-tiles";
import { useInventoryCogsRange } from "@/entities/dashboard/model/use-inventory-cogs-range";
import { InventoryDaysCoverCard } from "./inventory-days-cover-card";
import { InventoryHeroCard, type InventoryHeroPoint } from "./inventory-hero-card";
import { InventoryKpiCard } from "./inventory-kpi-card";
import { InventoryStockRiskCard } from "./inventory-stock-risk-card";
import { InventorySuperbotCard } from "./inventory-superbot-card";
import { useInventoryDigest } from "./use-inventory-digest";

type InventoryInsightsPageClientProps = {
  organisation: string;
  venue: string;
};

/** Entrance stagger, in ms, between the page's major sections. */
const SECTION_STAGGER_MS = 90;

/**
 * Ghost icon-button styling for the dark inventory hero card, mirroring the
 * sales hero. Dual-theme: light chrome on the dark-indigo surface (app light
 * mode), dark chrome on the inverted light surface (app dark mode).
 */
const HERO_ICON_ACTION_CLASS =
  "size-8 text-indigo-100/85 hover:bg-white/15 hover:text-white dark:text-slate-700 dark:hover:bg-slate-900/10 dark:hover:text-slate-900";

const dayLabelFormat = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
});

function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>,
) {
  const escapedRows = rows.map((row) =>
    row
      .map((value) => {
        const text = String(value);
        if (text.includes(",") || text.includes("\"")) {
          return `"${text.replaceAll("\"", "\"\"")}"`;
        }
        return text;
      })
      .join(","),
  );

  const csv = [header.join(","), ...escapedRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Section({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("opacity-0 animate-slide-up-fade-in-slow", className)}
      style={{ animationDelay: `${index * SECTION_STAGGER_MS}ms` }}
    >
      {children}
    </div>
  );
}

export function InventoryInsightsPageClient({
  organisation,
  venue,
}: InventoryInsightsPageClientProps) {
  const { dateRange } = useInsightsPeriod();
  const calendarRange = useMemo(
    () => dateRangeToCalendarIso(dateRange),
    [dateRange],
  );

  const tilesQuery = useDashboardInsightTiles({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const tiles = tilesQuery.data ?? null;
  const tilesLoading = tilesQuery.isPending;

  const cogsQuery = useInventoryCogsRange({
    organisationSlug: organisation,
    venueSlug: venue,
    fromDate: calendarRange.fromDate,
    toDate: calendarRange.toDate,
  });
  const cogs = cogsQuery.data ?? null;
  const heroLoading = cogsQuery.isPending;

  const digest = useInventoryDigest({
    organisationSlug: organisation,
    venueSlug: venue,
    enabled: true,
  });

  const digestVisible =
    digest.status !== "idle" && digest.status !== "unavailable";

  const alertsQuery = useInsightsAlertsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    module: "inventory",
  });
  const alerts = alertsQuery.data ?? [];

  const rangeDates = useMemo(
    () => calendarDatesInRange(dateRange.start, dateRange.end),
    [dateRange],
  );

  // Fill the whole selected period so quiet days still hold their place on
  // the x-axis, matching the sales hero's calendar coverage.
  const heroPoints = useMemo((): InventoryHeroPoint[] => {
    const costByDate = new Map(
      (cogs?.costByDay ?? []).map((entry) => [entry.date, entry.costCents]),
    );
    return rangeDates.map((date) => ({
      label: dayLabelFormat.format(new Date(`${date}T12:00:00`)),
      cost: (costByDate.get(date) ?? 0) / 100,
    }));
  }, [cogs?.costByDay, rangeDates]);

  const deltaPp = useMemo(() => {
    if (!cogs || cogs.percent === null || cogs.prevPercent === null) {
      return null;
    }
    return cogs.percent - cogs.prevPercent;
  }, [cogs]);

  const anchored = tiles !== null && tiles.stockRisk.trackedIngredients !== null;
  const atRisk = tiles?.stockRisk.atRisk ?? [];

  const ordersHref = `/${organisation}/${venue}/purchasing/orders`;
  const stockCountsHref = `/${organisation}/${venue}/stock-management/stock-counts`;
  const wasteHref = `/${organisation}/${venue}/stock-management/waste`;

  function handleExportCsv() {
    if (!tiles && !cogs) {
      toast.error("Nothing to export yet");
      return;
    }
    const fromLabel = toDateInputValue(dateRange.start);
    const toLabel = toDateInputValue(dateRange.end);
    downloadCsv(
      `inventory-insights-${fromLabel}-to-${toLabel}.csv`,
      ["Metric", "Value"],
      [
        ["Period", `${fromLabel} to ${toLabel}`],
        ["Theoretical COGS %", cogs?.percent?.toFixed(1) ?? "n/a"],
        ["Consumption cost", ((cogs?.costCents ?? 0) / 100).toFixed(2)],
        ["Revenue", ((cogs?.revenueCents ?? 0) / 100).toFixed(2)],
        ...(cogs?.costByDay ?? []).map((entry) => [
          `Consumption cost: ${entry.date}`,
          (entry.costCents / 100).toFixed(2),
        ]),
        ["Ingredients at risk (<3d cover)", atRisk.length],
        ["Tracked ingredients", tiles?.stockRisk.trackedIngredients ?? 0],
        [
          "Untracked sales (7d)",
          ((tiles?.unmappedSales.valueCents7d ?? 0) / 100).toFixed(2),
        ],
        ...atRisk.map((item) => [
          `At risk: ${item.name}`,
          `${item.daysOfCover.toFixed(1)} days cover`,
        ]),
      ],
    );
    toast.success("Inventory summary exported");
  }

  return (
    <section className="space-y-5">
      <Section index={0} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
          {tilesLoading ? null : tiles ? (
            <Badge
              variant="secondary"
              className="gap-1.5 px-2 py-0.5 text-xs font-normal"
            >
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live · consumption engine
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal"
            >
              Engine warming up
            </Badge>
          )}
        </div>
      </Section>

      {alerts.length > 0 ? (
        <Section index={1} className="space-y-2">
          {alerts.map((alert) => (
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
        </Section>
      ) : null}

      <Section index={1}>
        <InventoryHeroCard
          cogsPercent={cogs?.percent ?? null}
          deltaPp={deltaPp}
          costCents={cogs?.costCents ?? 0}
          revenueCents={cogs?.revenueCents ?? 0}
          periodDays={rangeDates.length}
          points={heroPoints}
          isLoading={heroLoading}
          periodControls={
            <InsightsPeriodControls tone="onHero" heroAccent="indigo" />
          }
          actions={
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
          }
        />
      </Section>

      {/* Superbot read at half width beside the KPI tiles, dashboard-digest style.
          The digest card renders null when idle/unavailable, so the KPIs take
          the full row in that case. */}
      <div
        className={cn(
          "grid gap-4",
          digestVisible ? "items-stretch lg:grid-cols-2" : "",
        )}
      >
        {digestVisible ? (
          <Section index={2} className="h-full">
            <InventorySuperbotCard
              organisation={organisation}
              venue={venue}
              text={digest.text}
              status={digest.status}
              onRegenerate={() => void digest.regenerate()}
              className="h-full"
            />
          </Section>
        ) : null}
        <div
          className={cn(
            "grid gap-3",
            // Two equal rows so the tiles split the digest's height evenly
            // instead of leaving stretch gaps beneath natural-height cards.
            digestVisible
              ? "sm:grid-cols-2 sm:grid-rows-2"
              : "grid-cols-2 xl:grid-cols-4",
          )}
        >
          <Section index={3} className="h-full">
            <InventoryKpiCard
              label="Consumed (7d)"
              icon={Flame}
              tone="neutral"
              countUpEnd={(tiles?.cogs.costCents7d ?? 0) / 100}
              countUpPrefix="$"
              footnote="Theoretical ingredient cost"
              countUpDelaySeconds={(3 * SECTION_STAGGER_MS) / 1000}
              isLoading={tilesLoading}
            />
          </Section>
          <Section index={4} className="h-full">
            <InventoryKpiCard
              label="Stock at risk"
              icon={TriangleAlert}
              tone={!anchored ? "neutral" : atRisk.length > 0 ? "bad" : "good"}
              countUpEnd={atRisk.length}
              footnote={
                anchored ? "Under 3 days of cover" : "Needs a baseline stock count"
              }
              countUpDelaySeconds={(4 * SECTION_STAGGER_MS) / 1000}
              isLoading={tilesLoading}
            />
          </Section>
          <Section index={5} className="h-full">
            <InventoryKpiCard
              label="Untracked sales (7d)"
              icon={ShoppingCart}
              tone={(tiles?.unmappedSales.valueCents7d ?? 0) > 0 ? "watch" : "good"}
              countUpEnd={(tiles?.unmappedSales.valueCents7d ?? 0) / 100}
              countUpPrefix="$"
              footnote={`${Math.round(tiles?.unmappedSales.count7d ?? 0).toLocaleString(
                "en-AU",
              )} line items not mapped to recipes`}
              countUpDelaySeconds={(5 * SECTION_STAGGER_MS) / 1000}
              isLoading={tilesLoading}
            />
          </Section>
          <Section index={6} className="h-full">
            <InventoryKpiCard
              label="Tracked ingredients"
              icon={Boxes}
              tone={anchored ? "good" : "neutral"}
              countUpEnd={tiles?.stockRisk.trackedIngredients ?? 0}
              footnote={
                anchored ? "Anchored by approved stock count" : "No anchor yet"
              }
              countUpDelaySeconds={(6 * SECTION_STAGGER_MS) / 1000}
              isLoading={tilesLoading}
            />
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Section index={7} className="lg:col-span-2">
          <InventoryDaysCoverCard
            atRisk={atRisk}
            trackedIngredients={tiles?.stockRisk.trackedIngredients ?? null}
            stockCountsHref={stockCountsHref}
            isLoading={tilesLoading}
          />
        </Section>
        <Section index={8} className="lg:col-span-3">
          <InventoryStockRiskCard
            atRisk={atRisk}
            trackedIngredients={tiles?.stockRisk.trackedIngredients ?? null}
            orderGuideHref={ordersHref}
            isLoading={tilesLoading}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            href: ordersHref,
            icon: ShoppingCart,
            title: "Order guide",
            blurb: "Consumption-rate demand, ready to send",
          },
          {
            href: stockCountsHref,
            icon: ClipboardList,
            title: "Stock counts",
            blurb: "Anchor stock-on-hand with a count",
          },
          {
            href: wasteHref,
            icon: Trash2,
            title: "Waste log",
            blurb: "Record waste so cover stays honest",
          },
        ].map((link, index) => (
          <Section key={link.href} index={9 + index}>
            <Link href={link.href} className="group block h-full">
              <Card
                className={cn(
                  "h-full gap-0 py-0 shadow-sm transition-all duration-300",
                  "group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-lg",
                )}
              >
                <CardContent className="flex items-center gap-3 px-5 py-4">
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <link.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {link.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {link.blurb}
                    </span>
                  </span>
                  <ArrowRight
                    className="text-muted-foreground size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </Link>
          </Section>
        ))}
      </div>
    </section>
  );
}
