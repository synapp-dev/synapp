"use client";

import * as React from "react";

import { StaggeredAnimation } from "@/lib/ui/staggered-animation";
import { SkeletonReveal } from "@/lib/ui/skeleton-reveal";
import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import type { DashboardKpiLabourContext } from "@/entities/ai-agent-chat/lib/agent-chat-dashboard-kpi-labour-context";
import { AvgCheckBreakdownCard } from "@/entities/dashboard/components/avg-check-breakdown-card";
import { DashboardKpiCard } from "@/entities/dashboard/components/dashboard-kpi-card";
import { MorningDigestCard } from "@/entities/dashboard/components/morning-digest-card";
import { NetRevenueHeroCard } from "@/entities/dashboard/components/net-revenue-hero-card";
import { TopSellersCard } from "@/entities/dashboard/components/top-sellers-card";
import { mergeKpisWithInsightTiles } from "@/entities/dashboard/lib/merge-insight-tiles";
import { useDashboardDigest } from "@/entities/dashboard/model/use-dashboard-digest";
import { useDashboardInsightTiles } from "@/entities/dashboard/model/use-dashboard-insight-tiles";
import { useDashboardTopItems } from "@/entities/dashboard/model/use-dashboard-top-items";
import { useDashboardSuperbotSuggestions } from "@/entities/dashboard/model/use-dashboard-superbot-suggestions";
import type { DashboardLiveSalesSlice } from "@/lib/dashboard/build-dashboard-sales-snapshot";
import { mergeDashboardWithLiveSales } from "@/entities/dashboard/lib/merge-dashboard-data";
import { useDashboardAvgCheckBreakdown } from "@/entities/dashboard/model/use-dashboard-avg-check-breakdown";
import type { DashboardKpiData } from "@/entities/dashboard/model/dummy-dashboard-data";
import { dummyAvgCheckBreakdown } from "@/entities/dashboard/model/dummy-dashboard-data";
import type { DashboardPreferencesRow } from "@/entities/dashboard/model/dashboard-preferences-types";
import { useDashboardSalesQuery } from "@/entities/dashboard/model/use-dashboard-sales-query";
import { useHeroRevenuePeriod } from "@/entities/dashboard/model/use-hero-revenue-period";
import { useSplashPageIntroDone } from "@/hooks/use-splash-page-intro";
import type { HeroPeriodKey } from "@/lib/dashboard/hero-period";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";

const LABOUR_KPI_USER_MESSAGE = "I clicked the Labour % card on the dashboard.";

function labourKpiToServerContext(
  kpi: DashboardKpiData,
): DashboardKpiLabourContext {
  return {
    kpiId: "labour",
    kpiTitle: kpi.title,
    kpiValueDisplay: kpi.value,
    deltaDirection: kpi.deltaDirection,
    deltaPercent: kpi.deltaPercent,
    targetDisplay:
      kpi.targetDisplay != null && kpi.targetDisplay !== ""
        ? kpi.targetDisplay
        : undefined,
    targetMissed: kpi.targetMissed === true ? true : undefined,
  };
}

const PAUSE_AFTER_HERO_S = 1;
const STAGGER_STEP_S = 0.09;
const KPI_FADE_DIRECTIONS = ["left", "down", "up", "right"] as const;

function dashboardCardDelay(slotAfterPause: number): number {
  return PAUSE_AFTER_HERO_S + STAGGER_STEP_S * slotAfterPause;
}

export type DashboardPageClientProps = {
  organisationName: string;
  organisationSlug: string;
  defaultVenueId: string | null;
  venueTimezone: string;
  initialLiveSales: DashboardLiveSalesSlice | null;
  linkScope: ScopedContext | null;
  initialPreferences: DashboardPreferencesRow;
};

export function DashboardPageClient({
  linkScope,
  organisationSlug,
  venueTimezone,
  initialLiveSales,
}: DashboardPageClientProps) {
  const liveSalesQuery = useDashboardSalesQuery({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    venueTimezone,
    enabled: Boolean(linkScope?.venueSlug),
    initialData: initialLiveSales,
  });

  const dashboardView = React.useMemo(
    () => mergeDashboardWithLiveSales(liveSalesQuery.data ?? initialLiveSales),
    [initialLiveSales, liveSalesQuery.data],
  );

  const liveSquare = dashboardView.dataSource === "square";
  const [heroPeriod, setHeroPeriod] = React.useState<HeroPeriodKey>("7d");

  // Today's live number for period views (synced daily_sales can lag today).
  const todayLive = React.useMemo(() => {
    if (!liveSquare) return null;
    const todayPoint = dashboardView.netRevenueSeries.find(
      (point) => point.label === "Today",
    );
    if (!todayPoint) return null;
    return todayPoint.revenue !== null
      ? { revenueCents: Math.round(todayPoint.revenue * 100), hasTrade: true }
      : { revenueCents: 0, hasTrade: false };
  }, [dashboardView.netRevenueSeries, liveSquare]);

  const heroPeriodQuery = useHeroRevenuePeriod({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    venueTimezone,
    periodKey: heroPeriod,
    todayLive,
    enabled: heroPeriod !== "7d" && liveSquare && Boolean(linkScope?.venueSlug),
  });

  // Default 7-day view = the live-orders snapshot; other periods = daily_sales.
  const heroView =
    heroPeriod !== "7d" && heroPeriodQuery.view
      ? heroPeriodQuery.view
      : {
          hero: dashboardView.hero,
          netRevenueSeries: dashboardView.netRevenueSeries,
        };

  // Hold every entrance animation until the first-load splash/sidebar
  // choreography reveals the page (no-op on client-side navigations).
  const introDone = useSplashPageIntroDone();

  const { sendMessage, status, scopeReady } = useAgentChat();
  const { setOpen, setOpenMobile } = useRightSidebar();
  const busy = status === "submitted" || status === "streaming";

  const labourKpi = React.useMemo(
    () => dashboardView.kpis.find((k) => k.id === "labour"),
    [dashboardView.kpis],
  );

  const handleLabourKpiSuperbot = React.useCallback(() => {
    setOpen(true);
    setOpenMobile(true);
    if (!labourKpi || !scopeReady || busy) return;
    void sendMessage(
      { text: LABOUR_KPI_USER_MESSAGE },
      {
        body: {
          dashboardKpiLabourContext: labourKpiToServerContext(labourKpi),
        },
      },
    );
  }, [busy, labourKpi, scopeReady, sendMessage, setOpen, setOpenMobile]);

  useDashboardSuperbotSuggestions({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug,
    enabled: Boolean(linkScope?.venueSlug),
  });

  const insightTilesQuery = useDashboardInsightTiles({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    enabled: Boolean(linkScope?.venueSlug),
  });

  const topItemsQuery = useDashboardTopItems({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    enabled: Boolean(linkScope?.venueSlug),
  });

  const avgCheckBreakdownQuery = useDashboardAvgCheckBreakdown({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    enabled: Boolean(linkScope?.venueSlug),
  });

  const digest = useDashboardDigest({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug ?? "",
    enabled: Boolean(linkScope?.venueSlug),
  });

  const kpisWithInsights = React.useMemo(
    () => mergeKpisWithInsightTiles(dashboardView.kpis, insightTilesQuery.data),
    [dashboardView.kpis, insightTilesQuery.data],
  );

  // Avg check trades places with gross profit: GP takes the small slot and
  // avg check gets the wide bottom row with the category radial breakdown.
  const smallKpis = React.useMemo(
    () => kpisWithInsights.filter((kpi) => kpi.id !== "avg-check"),
    [kpisWithInsights],
  );
  const avgCheckKpi = React.useMemo(
    () => kpisWithInsights.find((kpi) => kpi.id === "avg-check"),
    [kpisWithInsights],
  );

  const handleAskAgentAboutDigest = React.useCallback(() => {
    setOpen(true);
    setOpenMobile(true);
  }, [setOpen, setOpenMobile]);

  // Data hooks above keep loading behind the splash; the animated content
  // mounts only once the page is actually fading into view.
  if (!introDone) {
    return null;
  }

  return (
    // Viewport-fit on lg+: header (4rem) + shell padding (1.5rem) leaves the
    // rest for the hero + card grid so the dashboard never scrolls vertically.
    <section className="flex flex-col gap-6 lg:h-[calc(100svh-5.5rem)] lg:min-h-0">
      <StaggeredAnimation
        index={0}
        delaySeconds={0}
        fadeDirection="up"
        className="shrink-0"
      >
        <NetRevenueHeroCard
          hero={heroView.hero}
          series={heroView.netRevenueSeries}
          dataSource={dashboardView.dataSource}
          periodKey={heroPeriod}
          onPeriodChange={liveSquare ? setHeroPeriod : undefined}
          isPeriodLoading={heroPeriod !== "7d" && heroPeriodQuery.isPending}
        />
      </StaggeredAnimation>

      <div className="grid min-h-0 items-stretch gap-4 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
        <StaggeredAnimation
          index={0}
          delaySeconds={0.08}
          fadeDirection="up"
          className="h-full min-h-0"
        >
          <MorningDigestCard
            text={digest.text}
            status={digest.status}
            organisationSlug={linkScope?.organisationSlug ?? organisationSlug}
            venueSlug={linkScope?.venueSlug ?? ""}
            fromCache={digest.fromCache}
            onRegenerate={() => void digest.regenerate()}
            onAskAgent={handleAskAgentAboutDigest}
            className="h-full"
          />
        </StaggeredAnimation>

        {/* Three equal rows on lg: the two KPI cards stack beside the
            row-span-2 top sellers (so their combined height matches it),
            with the avg-check breakdown across the bottom. */}
        <div className="grid min-h-0 gap-4 sm:grid-cols-2 lg:grid-rows-[repeat(3,minmax(0,1fr))]">
          <SkeletonReveal
            loading={topItemsQuery.isLoading}
            delayMs={dashboardCardDelay(0) * 1000}
            radius={14}
            markSize={72}
            className="h-full sm:row-span-2"
          >
            <TopSellersCard
              data={topItemsQuery.data}
              isLoading={topItemsQuery.isLoading}
              linkScope={linkScope}
              countUpDelaySeconds={dashboardCardDelay(0)}
            />
          </SkeletonReveal>

          {smallKpis.map((kpi, i) => (
            <StaggeredAnimation
              key={kpi.id}
              index={i + 1}
              delaySeconds={dashboardCardDelay(i + 1)}
              fadeDirection={
                KPI_FADE_DIRECTIONS[(i + 1) % KPI_FADE_DIRECTIONS.length]!
              }
              className="h-full"
            >
              <DashboardKpiCard
                kpi={kpi}
                countUpDelaySeconds={dashboardCardDelay(i + 1)}
                onRequestAgentInsight={
                  kpi.id === "labour" ? handleLabourKpiSuperbot : undefined
                }
              />
            </StaggeredAnimation>
          ))}

          <StaggeredAnimation
            index={smallKpis.length + 1}
            delaySeconds={dashboardCardDelay(smallKpis.length + 1)}
            fadeDirection={
              KPI_FADE_DIRECTIONS[
                (smallKpis.length + 1) % KPI_FADE_DIRECTIONS.length
              ]!
            }
            className="h-full sm:col-span-2"
          >
            <AvgCheckBreakdownCard
              kpi={avgCheckKpi}
              data={
                avgCheckBreakdownQuery.data ??
                (liveSquare ? null : dummyAvgCheckBreakdown)
              }
              isLoading={avgCheckBreakdownQuery.isLoading}
              linkScope={linkScope}
              countUpDelaySeconds={dashboardCardDelay(smallKpis.length + 1)}
            />
          </StaggeredAnimation>
        </div>
      </div>

      {/* <StaggeredAnimation
        index={0}
        delaySeconds={dashboardCardDelay(KPI_COUNT)}
        fadeDirection="up"
      >
        <Separator className="mt-12 mb-10 max-w-1/2 mx-auto" />
      </StaggeredAnimation>

      <StaggeredAnimation
        index={0}
        delaySeconds={dashboardCardDelay(KPI_COUNT + 1)}
        fadeDirection="left"
      >
        <SuperbotSuggestionsCard
          suggestions={superbotSuggestions}
          linkScope={linkScope}
          onSuggestionHandoff={() => {
            setOpen(true);
            setOpenMobile(true);
          }}
        />
      </StaggeredAnimation> */}

      {/* <div>
        Operations
        <div className="grid grid-cols-4">
          <div>Stock Anomalies</div>
          <div>Pending Invoices</div>
          <div>Roster Gaps</div>
          <div>Top Selling Items</div>
        </div>
      </div>
      <div>
        System & Notifications
        <div className="grid grid-cols-3">
          <div>Notifications</div>
          <div>Integration Health</div>
          <div>Licence / Certification Expiry</div>
        </div>
      </div> */}
    </section>
  );
}
