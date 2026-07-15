import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { MenuItemsPageClient } from "@/app/(main)/[organisation]/[venue]/menu/menu-items/_components/menu-items-page-client";
import { menuItemsKeys } from "@/entities/menu-items/model/keys";
import { recipesKeys } from "@/entities/recipes/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { menuItemsService } from "@/server/menu-items/menu-items.service";
import { recipesService } from "@/server/recipes/recipes.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror the client's first-render query input exactly
// (entities/menu-items/model/store.ts defaults mapped through
// MenuItemsPageClient's trim-or-undefined / "all" -> undefined rules) so the
// hydrated cache key matches and the page paints with data instead of a
// spinner. The client still background-refetches on mount, so freshness is
// unchanged.
const INITIAL_MENU_ITEMS_FILTERS = {
  search: undefined,
  sectionName: undefined,
  page: 1,
  pageSize: 10,
} as const;

// MenuItemsPageClient also fires a recipes lookup (component picker) with
// these literal values on first render.
const INITIAL_RECIPES_FILTERS = {
  search: undefined,
  category: undefined,
  status: undefined,
  page: 1,
  pageSize: 200,
} as const;

export default async function MenuItemsPage({
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
      const [menuItemsData, recipesData] = await Promise.all([
        menuItemsService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_MENU_ITEMS_FILTERS,
        }),
        recipesService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...INITIAL_RECIPES_FILTERS,
        }),
      ]);
      queryClient.setQueryData(
        menuItemsKeys.list(organisation, venue, INITIAL_MENU_ITEMS_FILTERS),
        menuItemsData
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
      <MenuItemsPageClient organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
