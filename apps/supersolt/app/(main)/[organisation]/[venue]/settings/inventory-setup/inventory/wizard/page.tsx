import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { NormalisationWizardPage } from "@/entities/inventory-normalisation/components/normalisation-wizard-page";
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { attachSimilarPendingItems } from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function InventoryNormaliseWizardPage({
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
      const queue = await inventoryNormalisationService.getQueue(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        search: undefined,
      });
      // useNormalisationQueueQuery's queryFn attaches similar-pending
      // suggestions client-side; the cached value must match that shape.
      queryClient.setQueryData(
        inventoryNormalisationKeys.queue(organisation, venue, undefined),
        { ...queue, items: attachSimilarPendingItems(queue.items) },
      );
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NormalisationWizardPage organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
