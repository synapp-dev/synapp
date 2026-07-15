import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { InventorySetupWizard } from "@/entities/inventory-setup/components/wizard/inventory-setup-wizard";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function InventorySetupIndexPage({
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
      const data = await inventorySetupService.getProgress(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
      });
      queryClient.setQueryData(
        inventorySetupKeys.progress(organisation, venue),
        data,
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventorySetupWizard organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
