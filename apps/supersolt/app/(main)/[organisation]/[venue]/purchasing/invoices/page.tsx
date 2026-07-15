import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { InvoicesPageClient } from "@/entities/invoices/components/invoices-page";
import { invoiceKeys } from "@/entities/invoices/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { listVenueInvoices } from "@/server/invoices/invoices.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

// InvoicesShell mounts both list queries unconditionally on first render —
// the "Pending Review" tab (default) and the "All Invoices" tab — so prefetch
// both under the exact keys useVenueInvoicesQuery hashes. The client still
// background-refetches on mount, so freshness is unchanged.
const INITIAL_VIEWS = ["pending_review", "all"] as const;

export default async function PurchasingInvoicesPage({
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
      const [pendingReview, all] = await Promise.all(
        INITIAL_VIEWS.map((view) =>
          listVenueInvoices(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
            view,
          })
        )
      );
      queryClient.setQueryData(
        invoiceKeys.list(organisation, venue, "pending_review"),
        pendingReview
      );
      queryClient.setQueryData(invoiceKeys.list(organisation, venue, "all"), all);
    }
  } catch {
    // Prefetch is an optimisation only; on any failure the client component
    // fetches exactly as it did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvoicesPageClient organisation={organisation} venue={venue} />
    </HydrationBoundary>
  );
}
