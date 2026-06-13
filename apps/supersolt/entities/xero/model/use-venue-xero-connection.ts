import { useQuery } from "@tanstack/react-query";
import { xeroApi } from "@/entities/xero/api/endpoints";
import { xeroKeys } from "@/entities/xero/model/keys";

async function fetchVenueXeroConnection(
  organisationSlug: string,
  venueSlug: string,
) {
  const res = await xeroApi.getVenueConnection(organisationSlug, venueSlug);
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (!res.data) {
    throw new Error("Missing Xero connection summary");
  }
  return res.data;
}

export function useVenueXeroConnectionQuery(
  organisationSlug: string | undefined,
  venueSlug: string | undefined,
  enabled = true,
) {
  const canFetch = Boolean(organisationSlug && venueSlug && enabled);

  return useQuery({
    queryKey: xeroKeys.venueConnection(organisationSlug ?? "", venueSlug ?? ""),
    queryFn: () => fetchVenueXeroConnection(organisationSlug!, venueSlug!),
    enabled: canFetch,
    staleTime: 15_000,
  });
}
