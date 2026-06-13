import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type MemberListItem = {
  kind: "member" | "invite";
  id: string;
  userProfileId: string | null;
  name: string;
  email: string;
  roleSlug: string;
  roleDisplayName: string;
  venueIds: string[];
  status: "active" | "pending" | "archived";
  positionDisplayName: string | null;
  expiresAt: string | null;
};

export type VenueOption = {
  id: string;
  name: string;
};

export type MembersListPayload = {
  members: MemberListItem[];
  venues: VenueOption[];
};

export type MemberDetail = {
  userOrganisationId: string;
  userProfileId: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleSlug: string;
  roleDisplayName: string;
  venueIds: string[];
  status: "active" | "archived";
  venues: Array<{ id: string; name: string; slug: string }>;
};

export type XeroEmployeeRow = {
  email: string;
  firstName: string;
  lastName: string;
};

export type ApiErrorBody = {
  message: string;
  status?: number;
  code?: string;
};

export const membersApi = {
  list(organisationSlug: string): Promise<ApiResult<MembersListPayload>> {
    return apiFetch<MembersListPayload>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members`,
    );
  },

  get(organisationSlug: string, userOrganisationId: string): Promise<ApiResult<MemberDetail>> {
    return apiFetch<MemberDetail>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(userOrganisationId)}`,
    );
  },

  update(
    organisationSlug: string,
    userOrganisationId: string,
    body: {
      roleSlug?: string;
      venueIds?: string[];
      firstName?: string;
      lastName?: string;
    },
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(userOrganisationId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  archive(
    organisationSlug: string,
    userOrganisationId: string,
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(userOrganisationId)}/archive`,
      { method: "POST" },
    );
  },

  reactivate(
    organisationSlug: string,
    userOrganisationId: string,
    body: { venueIds: string[]; roleSlug?: string },
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/${encodeURIComponent(userOrganisationId)}/reactivate`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  invite(
    organisationSlug: string,
    body: { email: string; roleSlug: string; venueIds: string[] },
  ): Promise<ApiResult<{ inviteId: string }>> {
    return apiFetch<{ inviteId: string }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/invites`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  inviteBulk(
    organisationSlug: string,
    body: { emails: string[]; roleSlug: string; venueIds: string[] },
  ): Promise<ApiResult<{ created: number; skipped: number; errors: string[] }>> {
    return apiFetch<{ created: number; skipped: number; errors: string[] }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/invites/bulk`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  resendInvite(
    organisationSlug: string,
    inviteId: string,
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/invites/${encodeURIComponent(inviteId)}/resend`,
      { method: "POST" },
    );
  },

  revokeInvite(
    organisationSlug: string,
    inviteId: string,
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/invites/${encodeURIComponent(inviteId)}/revoke`,
      { method: "POST" },
    );
  },

  importXero(
    organisationSlug: string,
  ): Promise<ApiResult<{ employees: XeroEmployeeRow[] }>> {
    return apiFetch<{ employees: XeroEmployeeRow[] }>(
      `/organisations/${encodeURIComponent(organisationSlug)}/members/import/xero`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
};

export function membersErrorMessage(error: ApiErrorBody | null | undefined): string {
  if (!error?.message) return "Something went wrong";
  return error.message;
}
