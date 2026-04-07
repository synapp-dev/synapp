import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { venuesApi } from "@/entities/venues/api/endpoints";
import { venuesKeys } from "@/entities/venues/model/keys";
import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";

export function useAccessibleVenueGroupsQuery(
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<AccessibleOrganisation[], Error> {
  return useQuery<AccessibleOrganisation[], Error>({
    queryKey: venuesKeys.groups(),
    queryFn: async () => {
      const { data, error } = await venuesApi.get.accessibleVenueGroups();
      if (error) {
        throw new Error(error.message);
      }

      return data?.organisations ?? [];
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}
