import { useQuery } from "@tanstack/react-query";
import { squareApi } from "@/entities/square/api/endpoints";
import { squareKeys } from "@/entities/square/model/keys";

async function fetchVenueSquareConnection(
  organisationSlug: string,
  venueSlug: string,
) {
  const res = await squareApi.getVenueConnection(organisationSlug, venueSlug);
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (!res.data) {
    throw new Error("Missing Square connection summary");
  }
  return res.data;
}

export function useVenueSquareConnectionQuery(
  organisationSlug: string | undefined,
  venueSlug: string | undefined,
  enabled = true,
) {
  const canFetch = Boolean(organisationSlug && venueSlug && enabled);

  return useQuery({
    queryKey: squareKeys.venueConnection(organisationSlug ?? "", venueSlug ?? ""),
    queryFn: () => fetchVenueSquareConnection(organisationSlug!, venueSlug!),
    enabled: canFetch,
    staleTime: 15_000,
  });
}
