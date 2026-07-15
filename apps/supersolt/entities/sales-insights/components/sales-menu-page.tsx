"use client";

import { useState } from "react";
import { MenuMatrixCard } from "@/entities/sales-insights/components/menu-matrix-card";
import { SalesItemDetailSheet } from "@/entities/sales-insights/components/sales-item-detail-sheet";
import { SalesPairingsCard } from "@/entities/sales-insights/components/sales-pairings-card";
import { SalesTabPageHeader } from "@/entities/sales-insights/components/sales-tab-page-header";
import { useSalesIntelligenceQuery } from "@/entities/sales-insights/model/use-sales-intelligence-query";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import { SkeletonReveal } from "@/lib/ui/skeleton-reveal";
import type { MenuMatrixItem } from "@/entities/sales-insights/model/intelligence-types";
import type { SalesMixRow } from "@/entities/sales-insights/model/types";

type SalesMenuPageClientProps = {
  organisation: string;
  venue: string;
};

export function SalesMenuPageClient({
  organisation,
  venue,
}: SalesMenuPageClientProps) {
  const { dateRange, orders, meta, timezone, contentLoading, splashHeld } =
    useSalesInsightsBase({ organisation, venue });
  const [detailMixRow, setDetailMixRow] = useState<SalesMixRow | null>(null);

  const intelligenceQuery = useSalesIntelligenceQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
    scope: "menu",
    enabled: meta?.dataSource === "square",
  });
  const intelligence = intelligenceQuery.data;
  const loading =
    splashHeld ||
    contentLoading ||
    (meta?.dataSource === "square" && intelligenceQuery.isPending);

  const recipesHref = `/${organisation}/${venue}/menu/recipes`;

  function handleMatrixItemSelect(item: MenuMatrixItem) {
    setDetailMixRow({
      mixKey: item.menuItemId,
      menuItemId: item.menuItemId,
      label: item.label,
      quantity: item.quantity,
      revenueCents: item.revenueCents,
      mapped: true,
    });
  }

  return (
    <section className="space-y-4">
      <SalesTabPageHeader
        title="Menu"
        description="What to promote, re-price, re-position or retire, and the combinations customers build on their own."
      />

      <SkeletonReveal loading={loading} radius={14} markSize={72}>
        <MenuMatrixCard
          matrix={intelligence?.matrix ?? null}
          recipesHref={recipesHref}
          onItemSelect={handleMatrixItemSelect}
        />
      </SkeletonReveal>

      <SkeletonReveal loading={loading} radius={14} markSize={72}>
        <SalesPairingsCard pairings={intelligence?.pairings ?? null} wide />
      </SkeletonReveal>

      <SalesItemDetailSheet
        item={detailMixRow}
        orders={orders}
        timezone={timezone}
        onOpenChange={(open) => {
          if (!open) setDetailMixRow(null);
        }}
      />
    </section>
  );
}
