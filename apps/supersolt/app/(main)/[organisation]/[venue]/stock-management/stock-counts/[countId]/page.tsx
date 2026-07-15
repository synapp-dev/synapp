import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { StockCountDetailPage } from "@/entities/stock-counts/components/stock-count-detail-page";
import { stockCountKeys } from "@/entities/stock-counts/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function StockCountDetailRoute({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; countId: string }>;
}) {
  const { organisation, venue, countId } = await params;

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      const data = await stockCountsService.get(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        countId,
      });
      queryClient.setQueryData(
        stockCountKeys.detail(organisation, venue, countId),
        data,
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StockCountDetailPage
        organisation={organisation}
        venue={venue}
        countId={countId}
      />
    </HydrationBoundary>
  );
}
