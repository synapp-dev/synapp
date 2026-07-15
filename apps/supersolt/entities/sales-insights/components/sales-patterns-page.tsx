"use client";

import { SalesFulfillmentCard } from "@/entities/sales-insights/components/sales-fulfillment-card";
import { SalesHeatmapCard } from "@/entities/sales-insights/components/sales-heatmap-card";
import { SalesTabPageHeader } from "@/entities/sales-insights/components/sales-tab-page-header";
import { useSalesIntelligenceQuery } from "@/entities/sales-insights/model/use-sales-intelligence-query";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import { SkeletonReveal } from "@/lib/ui/skeleton-reveal";

type SalesPatternsPageClientProps = {
  organisation: string;
  venue: string;
};

export function SalesPatternsPageClient({
  organisation,
  venue,
}: SalesPatternsPageClientProps) {
  const { dateRange, meta, contentLoading, splashHeld } = useSalesInsightsBase({
    organisation,
    venue,
  });

  const intelligenceQuery = useSalesIntelligenceQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
    scope: "patterns",
    enabled: meta?.dataSource === "square",
  });
  const intelligence = intelligenceQuery.data;
  const loading =
    splashHeld ||
    contentLoading ||
    (meta?.dataSource === "square" && intelligenceQuery.isPending);

  return (
    <section className="space-y-4">
      <SalesTabPageHeader
        title="Patterns"
        description="When the money moves: your weekly rhythm, and how orders split across dine-in, pick-up and delivery."
      />

      <SkeletonReveal loading={loading} radius={14} markSize={72}>
        <SalesHeatmapCard heatmap={intelligence?.heatmap ?? null} />
      </SkeletonReveal>

      <SkeletonReveal loading={loading} radius={14} markSize={72}>
        <SalesFulfillmentCard fulfillment={intelligence?.fulfillment ?? null} />
      </SkeletonReveal>
    </section>
  );
}
