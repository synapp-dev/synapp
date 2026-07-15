import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { OrdersPageClient } from "@/entities/purchase-orders/components/orders-page";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { orderGuideService } from "@/server/purchase-orders/order-guide.service";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror OrderGuideTab's first-render period (its useState default) so
// the hydrated cache key matches. The GET /order-guide route defaults a
// missing ?period param to "7d" and hashes the key on the preset string only.
const INITIAL_ORDER_GUIDE_PERIOD = "7d";

export default async function PurchasingOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisation: string; venue: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "purchasing-orders");
  const sp = await searchParams;
  const initialTab = sp.tab === "purchase-orders" ? "purchase-orders" : "guide";

  const queryClient = new QueryClient();

  // Only the "guide" tab mounts OrderGuideTab (and its query) on first
  // render; when ?tab=purchase-orders is set, computing the order guide
  // server-side would be wasted work, so skip the prefetch entirely.
  if (initialTab === "guide") {
    try {
      const supabase = await createServerClient();
      const auth = await resolveVerifiedServerAuthFromCookies(supabase);
      if (auth) {
        const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
        const data = await orderGuideService.get(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          periodPreset: INITIAL_ORDER_GUIDE_PERIOD,
          forceRefresh: false,
        });
        queryClient.setQueryData(
          purchaseOrderKeys.orderGuide(
            organisation,
            venue,
            INITIAL_ORDER_GUIDE_PERIOD
          ),
          data
        );
      }
    } catch {
      // Prefetch is an optimisation only; on any failure the client component
      // fetches exactly as it did before this page prefetched.
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrdersPageClient
        organisation={organisation}
        venue={venue}
        initialTab={initialTab}
      />
    </HydrationBoundary>
  );
}
