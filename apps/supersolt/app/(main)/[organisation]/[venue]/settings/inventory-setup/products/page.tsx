import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { PosCatalogImportPage } from "@/entities/pos-catalog-import/components/pos-catalog-import-page";
import { PosCatalogImportProvider } from "@/entities/pos-catalog-import/components/pos-catalog-import-provider";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { recipesKeys } from "@/entities/recipes/model/keys";
import { squareKeys } from "@/entities/square/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { recipesService } from "@/server/recipes/recipes.service";
import { getVenueSquareConnectionSummary } from "@/server/sales/sales-insights.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror PosCatalogImportPage's first-render useRecipesQuery input
// exactly (literal page/pageSize, no filters) so the hydrated cache key
// matches and the page paints with data instead of a spinner. The client
// still background-refetches on mount, so freshness is unchanged.
const INITIAL_RECIPES_FILTERS = {
  search: undefined,
  category: undefined,
  status: undefined,
  page: 1,
  pageSize: 500,
} as const;

export default async function PosItemsPage({
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
      // getVenueSquareConnectionSummary only reads venue_square_connections
      // from the DB (no Square API calls, no token refresh), so it is safe to
      // prefetch alongside the list queries.
      const [posItemsData, squareSummary, recipesData] = await Promise.all([
        posCatalogImportService.listPosItems(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
        }),
        getVenueSquareConnectionSummary(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
        }),
        recipesService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_RECIPES_FILTERS,
        }),
      ]);
      queryClient.setQueryData(
        posCatalogImportKeys.list(organisation, venue),
        posItemsData
      );
      queryClient.setQueryData(
        squareKeys.venueConnection(organisation, venue),
        squareSummary
      );
      queryClient.setQueryData(
        recipesKeys.list(organisation, venue, INITIAL_RECIPES_FILTERS),
        recipesData
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PosCatalogImportProvider>
        <PosCatalogImportPage organisationSlug={organisation} venueSlug={venue} />
      </PosCatalogImportProvider>
    </HydrationBoundary>
  );
}
