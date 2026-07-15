import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { ProductsRecipeWizardPage } from "@/entities/pos-catalog-import/components/products-recipe-wizard-page";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function ProductsRecipeWizardRoute({
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
      // ProductsRecipeWizardPage's only first-render list query; the key has
      // no filter object so there is no INITIAL_* constant to mirror.
      const data = await posCatalogImportService.listPosItems(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
      });
      queryClient.setQueryData(
        posCatalogImportKeys.list(organisation, venue),
        data
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsRecipeWizardPage organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
