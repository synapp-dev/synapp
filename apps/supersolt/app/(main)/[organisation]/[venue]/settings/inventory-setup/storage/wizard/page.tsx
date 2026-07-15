import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import { StockLevelsWizardPage } from "@/entities/stock-counts/components/stock-levels-wizard-page";
import { buildRequestAuthContext } from "@/server/auth/context";
import { ingredientsService } from "@/server/ingredients/ingredients.service";
import { storageLocationsService } from "@/server/stock-counts/storage-locations.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// Must mirror StockLevelsWizardPage's useIngredientsQuery input exactly so the
// hydrated cache key matches the client's first-render key.
const WIZARD_INGREDIENT_FILTERS = {
  search: undefined,
  category: undefined,
  status: "active",
  supplierId: undefined,
  page: 1,
  pageSize: 1000,
} as const;

export default async function StockLevelsWizardRoute({
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
      const [ingredients, locations] = await Promise.all([
        ingredientsService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          ...WIZARD_INGREDIENT_FILTERS,
        }),
        storageLocationsService.list(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
        }),
      ]);
      queryClient.setQueryData(
        ingredientsKeys.list(organisation, venue, WIZARD_INGREDIENT_FILTERS),
        ingredients,
      );
      // The locations query uses an inline key in stock-levels-wizard-page.tsx
      // and its queryFn falls back to [] when the response has no data.
      queryClient.setQueryData(
        ["stock-wizard", organisation, venue, "locations"],
        locations ?? [],
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StockLevelsWizardPage organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
