import { apiFetchOrThrow } from "@/lib/api/client-envelope";
import type { PeopleDetailDto, PeopleListItem } from "@/server/workforce/people.service";

export type { PeopleDetailDto, PeopleListItem };

export function peopleApiBase(organisation: string) {
  return `/organisations/${encodeURIComponent(organisation)}/workforce/people`;
}

export const peopleApi = {
  list(organisation: string, params?: { venueSlug?: string; venueId?: string }) {
    const qs = new URLSearchParams();
    if (params?.venueSlug) qs.set("venueSlug", params.venueSlug);
    if (params?.venueId) qs.set("venueId", params.venueId);
    const query = qs.toString();
    return apiFetchOrThrow<{ employees: PeopleListItem[]; statusCounts: Record<string, number> }>(
      `${peopleApiBase(organisation)}${query ? `?${query}` : ""}`,
    );
  },

  get(organisation: string, userOrganisationId: string) {
    return apiFetchOrThrow<{ employee: PeopleDetailDto }>(
      `${peopleApiBase(organisation)}/${encodeURIComponent(userOrganisationId)}`,
    );
  },

  patch(
    organisation: string,
    userOrganisationId: string,
    body: Record<string, unknown>,
  ) {
    return apiFetchOrThrow<{
      employee: PeopleDetailDto;
      complianceStatus: string;
      warnings: { code: string; message: string }[];
    }>(`${peopleApiBase(organisation)}/${encodeURIComponent(userOrganisationId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  createInvite(
    organisation: string,
    body: {
      email: string;
      roleSlug: string;
      venueIds: string[];
      employmentType?: string;
      startDate?: string;
    },
  ) {
    return apiFetchOrThrow<{ inviteId: string }>(peopleApiBase(organisation), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
