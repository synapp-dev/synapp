"use client";

import { useInsightsPeriod } from "@/entities/insights/model/insights-period-provider";
import { useSalesInsightsQuery } from "@/entities/sales-insights/model/useSalesInsightsQuery";
import { useSplashPageIntroHold } from "@/lib/ui/use-splash-page-intro-hold";
import type {
  SalesInsightsMeta,
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

/**
 * Shared wiring for every sales-insights tab: period range, splash hold and the
 * orders payload. React-query dedupes the fetch across tabs, so each tab can
 * call this without refetching.
 */
export function useSalesInsightsBase({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const { dateRange } = useInsightsPeriod();
  const splashHeld = useSplashPageIntroHold();
  const query = useSalesInsightsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
  });

  const orders: SalesOrderRow[] = query.data?.orders ?? [];
  const meta: SalesInsightsMeta | undefined = query.data?.meta;
  const salesMix: SalesMixRow[] = query.data?.salesMix ?? [];

  return {
    dateRange,
    splashHeld,
    query,
    orders,
    meta,
    salesMix,
    timezone:
      meta?.venueTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    contentLoading: splashHeld || query.isPending,
  };
}
