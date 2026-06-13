"use client";

import { useQuery } from "@tanstack/react-query";
import { membersApi } from "@/entities/organisations/members/api/endpoints";
import { membersKeys } from "@/entities/organisations/members/model/keys";

export function useMembersListQuery(organisationSlug: string) {
  return useQuery({
    queryKey: membersKeys.list(organisationSlug),
    queryFn: async () => {
      const result = await membersApi.list(organisationSlug);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(organisationSlug),
  });
}
