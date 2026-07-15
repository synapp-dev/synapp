import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { RecipesPageClient } from "@/app/(main)/[organisation]/[venue]/menu/recipes/_components/recipes-page-client";
import { recipesKeys } from "@/entities/recipes/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { recipesService } from "@/server/recipes/recipes.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror the client's first-render query input exactly
// (entities/recipes/model/store.ts defaults mapped through
// RecipesPageClient's trim-or-undefined / "all" -> undefined rules) so the
// hydrated cache key matches and the page paints with data instead of a
// spinner. The client still background-refetches on mount, so freshness is
// unchanged.
const INITIAL_LIST_FILTERS = {
  search: undefined,
  category: undefined,
  status: undefined,
  page: 1,
  pageSize: 10,
} as const;

export default async function InventorySetupRecipesPage({
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
      const data = await recipesService.list(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        ...INITIAL_LIST_FILTERS,
      });
      queryClient.setQueryData(
        recipesKeys.list(organisation, venue, INITIAL_LIST_FILTERS),
        data
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecipesPageClient organisation={organisation} venue={venue} hidePageHeader />
    </HydrationBoundary>
  );
}
