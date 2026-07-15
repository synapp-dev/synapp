import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { IngredientsPageClient } from "@/app/(main)/[organisation]/[venue]/menu/ingredients/_components/ingredients-page-client";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { ingredientsService } from "@/server/ingredients/ingredients.service";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror the client's first-render query input exactly
// (entities/ingredients/model/store.ts defaults) so the hydrated cache key
// matches and the page paints with data instead of a spinner. The client
// still background-refetches on mount, so freshness is unchanged.
const INITIAL_LIST_FILTERS = {
  search: undefined,
  category: undefined,
  status: undefined,
  supplierId: undefined,
  page: 1,
  pageSize: 10,
} as const;

// Mirrors the client's useSuppliersQuery({status:"active", page:1, pageSize:200})
// call (the supplier dropdown data), mapped through the hook's key shape.
const INITIAL_SUPPLIERS_FILTERS = {
  search: undefined,
  category: undefined,
  status: "active",
  archived: undefined,
  hasProducts: undefined,
  inventorySource: undefined,
  sort: undefined,
  page: 1,
  pageSize: 200,
} as const;

export default async function MasterInventoryListPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "menu-ingredients");

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      const [ingredients, suppliers] = await Promise.all([
        ingredientsService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_LIST_FILTERS,
        }),
        suppliersService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_SUPPLIERS_FILTERS,
        }),
      ]);
      queryClient.setQueryData(
        ingredientsKeys.list(organisation, venue, INITIAL_LIST_FILTERS),
        ingredients
      );
      queryClient.setQueryData(
        suppliersKeys.list(organisation, venue, INITIAL_SUPPLIERS_FILTERS),
        suppliers
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IngredientsPageClient
        organisation={organisation}
        venue={venue}
        hidePageHeader
      />
    </HydrationBoundary>
  );
}
