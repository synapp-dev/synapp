import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";

import { membersKeys } from "@/entities/organisations/members/model/keys";

vi.mock("@/utils/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/supabase/resolve-server-auth", () => ({
  resolveVerifiedServerAuthFromCookies: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  buildRequestAuthContext: vi.fn().mockResolvedValue({ userId: "user-1" }),
}));

vi.mock("@/server/organisations/organisation-members.service", () => ({
  organisationMembersService: { getMember: vi.fn() },
}));

vi.mock("@/entities/organisations/members/components/member-edit-page", () => ({
  MemberEditPage: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";
import SettingsMemberEditPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as MemberEditPage does on first render:
 * useMemberDetailQuery(access.organisationSlug, memberId), where
 * useScopedSettingsAccess reads the slug synchronously from useParams() —
 * i.e. the route slug.
 */
function clientFirstRenderKey(organisation: string, memberId: string) {
  return membersKeys.detail(organisation, memberId);
}

function pageParams() {
  return {
    params: Promise.resolve({
      organisation: "org-1",
      venue: "ven-1",
      memberId: "uo-1",
    }),
  };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await SettingsMemberEditPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("SettingsMemberEditPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      userOrganisationId: "uo-1",
      userProfileId: "profile-1",
      name: "Sam Cook",
      email: "sam@example.com",
      firstName: "Sam",
      lastName: "Cook",
      roleSlug: "manager",
      roleDisplayName: "Venue Manager",
      venueIds: ["venue-1"],
      status: "active",
      venues: [{ id: "venue-1", name: "Hawthorn", slug: "hawthorn" }],
    };
    vi.mocked(organisationMembersService.getMember).mockResolvedValue(
      data as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1", "uo-1")),
    );
    expect(state.queries[0]!.state.data).toEqual(data);
    expect(vi.mocked(organisationMembersService.getMember)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1", userOrganisationId: "uo-1" },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(
      vi.mocked(organisationMembersService.getMember),
    ).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws (e.g. non-owner)", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(organisationMembersService.getMember).mockRejectedValue(
      new Error("forbidden"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
