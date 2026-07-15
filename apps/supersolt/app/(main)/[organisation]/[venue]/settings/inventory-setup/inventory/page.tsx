import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { NormalisationQueuePage } from "@/entities/inventory-normalisation/components/normalisation-queue-page";
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { attachSimilarPendingItems } from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function InventorySetupNormalisePage({
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
      const [progress, queue] = await Promise.all([
        inventorySetupService.getProgress(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
        }),
        inventoryNormalisationService.getQueue(ctx, {
          organisationSlug: organisation,
          venueSlug: venue,
          search: undefined,
        }),
      ]);
      queryClient.setQueryData(
        inventorySetupKeys.progress(organisation, venue),
        progress,
      );
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
      <NormalisationQueuePage organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
