"use client";

import { useQuery } from "@tanstack/react-query";
import { membersApi } from "@/entities/organisations/members/api/endpoints";
import { membersKeys } from "@/entities/organisations/members/model/keys";

export function useMemberDetailQuery(
  organisationSlug: string,
  userOrganisationId: string,
) {
  return useQuery({
    queryKey: membersKeys.detail(organisationSlug, userOrganisationId),
    queryFn: async () => {
      const result = await membersApi.get(organisationSlug, userOrganisationId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(organisationSlug && userOrganisationId),
  });
}
