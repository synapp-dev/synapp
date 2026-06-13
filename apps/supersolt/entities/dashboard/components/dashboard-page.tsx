"use client";

import * as React from "react";

import { StaggeredAnimation } from "@/lib/ui/staggered-animation";
import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import type { DashboardKpiLabourContext } from "@/entities/ai-agent-chat/lib/agent-chat-dashboard-kpi-labour-context";
import { DashboardKpiCard } from "@/entities/dashboard/components/dashboard-kpi-card";
import { NetRevenueHeroCard } from "@/entities/dashboard/components/net-revenue-hero-card";
import { SuperbotSuggestionsCard } from "@/entities/dashboard/components/superbot-suggestions-card";
import { useDashboardSuperbotSuggestions } from "@/entities/dashboard/model/use-dashboard-superbot-suggestions";
import type { DashboardLiveSalesSlice } from "@/lib/dashboard/build-dashboard-sales-snapshot";
import { mergeDashboardWithLiveSales } from "@/entities/dashboard/lib/merge-dashboard-data";
import type { DashboardKpiData } from "@/entities/dashboard/model/dummy-dashboard-data";
import type { DashboardPreferencesRow } from "@/entities/dashboard/model/dashboard-preferences-types";
import { useDashboardSalesQuery } from "@/entities/dashboard/model/use-dashboard-sales-query";
import { Separator } from "@workspace/ui/components/separator";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";

const LABOUR_KPI_USER_MESSAGE =
  "I clicked the Labour % card on the dashboard.";

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
    [initialLiveSales, liveSalesQuery.data]
  );

  const KPI_COUNT = dashboardView.kpis.length;
  const { sendMessage, status, scopeReady } = useAgentChat();
  const { setOpen, setOpenMobile } = useRightSidebar();
  const busy = status === "submitted" || status === "streaming";

  const labourKpi = React.useMemo(
    () => dashboardView.kpis.find((k) => k.id === "labour"),
    [dashboardView.kpis]
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

  const { suggestions: superbotSuggestions } = useDashboardSuperbotSuggestions({
    organisationSlug: linkScope?.organisationSlug ?? organisationSlug,
    venueSlug: linkScope?.venueSlug,
    enabled: Boolean(linkScope?.venueSlug),
  });

  return (
    <section className="space-y-6">
      <StaggeredAnimation index={0} delaySeconds={0.08} fadeDirection="up">
        <NetRevenueHeroCard
          hero={dashboardView.hero}
          series={dashboardView.netRevenueSeries}
          dataSource={dashboardView.dataSource}
        />
      </StaggeredAnimation>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardView.kpis.map((kpi, i) => (
          <StaggeredAnimation
            key={kpi.id}
            index={i}
            delaySeconds={dashboardCardDelay(i)}
            fadeDirection={KPI_FADE_DIRECTIONS[i % KPI_FADE_DIRECTIONS.length]!}
          >
            <DashboardKpiCard
              kpi={kpi}
              countUpDelaySeconds={dashboardCardDelay(i)}
              onRequestAgentInsight={
                kpi.id === "labour" ? handleLabourKpiSuperbot : undefined
              }
            />
          </StaggeredAnimation>
        ))}
      </div>

      <StaggeredAnimation
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
      </StaggeredAnimation>

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
