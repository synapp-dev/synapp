import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { SupplierConfigurationWizard } from "@/entities/suppliers/components/supplier-configuration-wizard";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { WIZARD_SUPPLIERS_LIST_FILTERS } from "@/entities/suppliers/model/wizard-query-input";
import { buildRequestAuthContext } from "@/server/auth/context";
import { suppliersService } from "@/server/suppliers/suppliers.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function InventorySetupSupplierConfigurePage({
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
      const data = await suppliersService.list(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        ...WIZARD_SUPPLIERS_LIST_FILTERS,
        // The API route parses a missing ?archived param to `false` (never
        // undefined) before calling the service; the repo treats both the
        // same (non-archived only), but mirror the route exactly. The query
        // key keeps `archived: undefined` because that is what the wizard's
        // hook hashes on first render.
        archived: false,
      });
      queryClient.setQueryData(
        suppliersKeys.list(organisation, venue, WIZARD_SUPPLIERS_LIST_FILTERS),
        data
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupplierConfigurationWizard organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
