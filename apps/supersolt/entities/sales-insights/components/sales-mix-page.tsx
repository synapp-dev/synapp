"use client";

import { useState } from "react";
import { SalesItemDetailSheet } from "@/entities/sales-insights/components/sales-item-detail-sheet";
import { SalesMixCard } from "@/entities/sales-insights/components/sales-mix-card";
import { SalesTabPageHeader } from "@/entities/sales-insights/components/sales-tab-page-header";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import { SkeletonReveal } from "@/lib/ui/skeleton-reveal";
import type { SalesMixRow } from "@/entities/sales-insights/model/types";

type SalesMixPageClientProps = {
  organisation: string;
  venue: string;
};

export function SalesMixPageClient({
  organisation,
  venue,
}: SalesMixPageClientProps) {
  const { orders, meta, salesMix, timezone, contentLoading } =
    useSalesInsightsBase({ organisation, venue });
  const [detailMixRow, setDetailMixRow] = useState<SalesMixRow | null>(null);

  const integrationHref = `/${organisation}/${venue}/settings/integrations`;

  return (
    <section className="space-y-4">
      <SalesTabPageHeader
        title="Sales mix"
        description="Every item sold in the selected period, top sellers first. Click a row for its full breakdown."
      />
      <SkeletonReveal loading={contentLoading} radius={14} markSize={72}>
        <SalesMixCard
          rows={salesMix}
          dataSource={meta?.dataSource ?? "demo"}
          integrationHref={integrationHref}
          scrollAreaClassName="max-h-[70vh]"
          onRowSelect={setDetailMixRow}
          isLoading={contentLoading}
        />
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
