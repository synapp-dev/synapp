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
  organisationMembersService: { listMembers: vi.fn() },
}));

vi.mock("@/entities/organisations/members/components/members-list-page", () => ({
  MembersListPage: () => null,
}));

import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";
import SettingsPermissionsPage from "./page";

type DehydratedQueries = {
  queries: Array<{ queryHash: string; state: { data: unknown } }>;
};

/**
 * Rebuilds the query key exactly as MembersListPage does on first render:
 * useMembersListQuery(access.organisationSlug), where useScopedSettingsAccess
 * reads the slug synchronously from useParams() — i.e. the route slug.
 */
function clientFirstRenderKey(organisation: string) {
  return membersKeys.list(organisation);
}

function pageParams() {
  return { params: Promise.resolve({ organisation: "org-1", venue: "ven-1" }) };
}

async function renderPageDehydratedState(): Promise<DehydratedQueries> {
  const element = await SettingsPermissionsPage(pageParams());
  return (element as unknown as { props: { state: DehydratedQueries } }).props
    .state;
}

describe("SettingsPermissionsPage RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches under the exact query key the client computes on first render", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    const data = {
      members: [
        {
          kind: "member",
          id: "uo-1",
          userProfileId: "profile-1",
          name: "Sam Cook",
          email: "sam@example.com",
          roleSlug: "manager",
          roleDisplayName: "Venue Manager",
          venueIds: ["venue-1"],
          status: "active",
          positionDisplayName: null,
          expiresAt: null,
        },
      ],
      venues: [{ id: "venue-1", name: "Hawthorn" }],
    };
    vi.mocked(organisationMembersService.listMembers).mockResolvedValue(
      data as never,
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]!.queryHash).toBe(
      hashKey(clientFirstRenderKey("org-1")),
    );
    expect(state.queries[0]!.state.data).toEqual(data);
    expect(vi.mocked(organisationMembersService.listMembers)).toHaveBeenCalledWith(
      { userId: "user-1" },
      { organisationSlug: "org-1" },
    );
  });

  it("renders with no prefetched state when auth cannot be resolved", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue(null);

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
    expect(
      vi.mocked(organisationMembersService.listMembers),
    ).not.toHaveBeenCalled();
  });

  it("renders with no prefetched state when the service throws (e.g. non-owner)", async () => {
    vi.mocked(resolveVerifiedServerAuthFromCookies).mockResolvedValue({
      userId: "user-1",
      appDb: {} as never,
    });
    vi.mocked(organisationMembersService.listMembers).mockRejectedValue(
      new Error("forbidden"),
    );

    const state = await renderPageDehydratedState();

    expect(state.queries).toHaveLength(0);
  });
});
