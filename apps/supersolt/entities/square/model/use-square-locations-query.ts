import { useQuery } from "@tanstack/react-query";
import { squareApi } from "@/entities/square/api/endpoints";
import { squareKeys } from "@/entities/square/model/keys";

async function fetchSquareLocations(organisationSlug: string, venueSlug: string) {
  const res = await squareApi.getLocations(organisationSlug, venueSlug);
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (!res.data) {
    throw new Error("Missing Square locations");
  }
  return res.data;
}

export function useSquareLocationsQuery(
  organisationSlug: string | undefined,
  venueSlug: string | undefined,
  enabled = true,
) {
  const canFetch = Boolean(organisationSlug && venueSlug && enabled);

  return useQuery({
    queryKey: squareKeys.locations(organisationSlug ?? "", venueSlug ?? ""),
    queryFn: () => fetchSquareLocations(organisationSlug!, venueSlug!),
    enabled: canFetch,
    staleTime: 30_000,
  });
}
