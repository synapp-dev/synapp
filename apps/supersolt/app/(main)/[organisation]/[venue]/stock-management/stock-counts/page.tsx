import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { StockCountsListPage } from "@/entities/stock-counts/components/stock-counts-list-page";
import { stockCountKeys } from "@/entities/stock-counts/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";
import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function StockCountsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "stock-counts");

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      // Client fires useStockCountsQuery({ organisation, venue }) with no
      // status, so the key ends in "all" and the API route defaults the
      // missing query param to "all" before calling the service.
      const data = await stockCountsService.list(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        status: "all",
      });
      queryClient.setQueryData(stockCountKeys.list(organisation, venue), data);
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StockCountsListPage organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
