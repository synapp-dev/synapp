import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { SuppliersPageClient } from "@/entities/suppliers/components/suppliers-page";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { xeroKeys } from "@/entities/xero/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import { getVenueXeroConnectionSummary } from "@/server/xero/venue-xero-connection";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror SuppliersPageClient's first-render query input exactly
// (entities/suppliers/model/store.ts defaults mapped through the same
// "all" -> undefined rules as its useSuppliersQuery call) so the hydrated
// cache key matches and the page paints with data instead of a spinner. The
// client still background-refetches on mount, so freshness is unchanged.
const INITIAL_LIST_FILTERS = {
  search: undefined,
  category: undefined,
  status: undefined,
  archived: false,
  hasProducts: undefined,
  // This page renders the client with inventorySetupMode, which pins the
  // query to inventory-source suppliers only.
  inventorySource: true,
  sort: "name",
  page: 1,
  pageSize: 50,
} as const;

export default async function InventorySetupSuppliersPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      // getVenueXeroConnectionSummary is a pure DB read of the
      // venue_xero_connections row — it never calls Xero's API and never
      // refreshes tokens — so it is safe to prefetch alongside the list.
      const [suppliers, xeroConnection] = await Promise.all([
        suppliersService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_LIST_FILTERS,
        }),
        getVenueXeroConnectionSummary(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
        }),
      ]);
      queryClient.setQueryData(
        suppliersKeys.list(organisation, venue, INITIAL_LIST_FILTERS),
        suppliers
      );
      queryClient.setQueryData(
        xeroKeys.venueConnection(organisation, venue),
        xeroConnection
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SuppliersPageClient organisation={organisation} venue={venue} hidePageHeader inventorySetupMode />
    </HydrationBoundary>
  );
}
