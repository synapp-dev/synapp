import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { MembersListPage } from "@/entities/organisations/members/components/members-list-page";
import { membersKeys } from "@/entities/organisations/members/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

export default async function SettingsPermissionsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation } = await params;

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      // The client's useScopedSettingsAccess reads organisationSlug
      // synchronously from useParams(), so its first-render key is always the
      // route slug — the same one prefetched here.
      const data = await organisationMembersService.listMembers(ctx, {
        organisationSlug: organisation,
      });
      queryClient.setQueryData(membersKeys.list(organisation), data);
    }
  } catch {
    // Prefetch is an optimisation only; on any failure (including non-owners,
    // whom the service rejects) the client component fetches exactly as it
    // did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MembersListPage />
    </HydrationBoundary>
  );
}
