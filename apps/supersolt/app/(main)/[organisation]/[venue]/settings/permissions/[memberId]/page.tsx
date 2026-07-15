import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { MemberEditPage } from "@/entities/organisations/members/components/member-edit-page";
import { membersKeys } from "@/entities/organisations/members/model/keys";
import { buildRequestAuthContext } from "@/server/auth/context";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { createServerClient } from "@/utils/supabase/server";

type PageProps = {
  params: Promise<{ organisation: string; venue: string; memberId: string }>;
};

export default async function SettingsMemberEditPage({ params }: PageProps) {
  const { organisation, memberId } = await params;

  const queryClient = new QueryClient();

  try {
    const supabase = await createServerClient();
    const auth = await resolveVerifiedServerAuthFromCookies(supabase);
    if (auth) {
      const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
      // The client's useScopedSettingsAccess reads organisationSlug
      // synchronously from useParams(), so its first-render key is always the
      // route slug — the same one prefetched here.
      const data = await organisationMembersService.getMember(ctx, {
        organisationSlug: organisation,
        userOrganisationId: memberId,
      });
      queryClient.setQueryData(membersKeys.detail(organisation, memberId), data);
    }
  } catch {
    // Prefetch is an optimisation only; on any failure (including non-owners,
    // whom the service rejects) the client component fetches exactly as it
    // did before this page prefetched.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MemberEditPage memberId={memberId} />
    </HydrationBoundary>
  );
}
