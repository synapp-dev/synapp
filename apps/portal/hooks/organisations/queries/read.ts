import { useQuery } from "@tanstack/react-query";
import type { Organisation } from "@/providers/postgres/organisations/read";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export type OrganisationsResponse = {
  success: boolean;
  data: Organisation[];
  error?: string;
};

export function useOrganisationsQuery() {
  const authFetch = useAuthFetch();
  return useQuery<OrganisationsResponse, Error>({
    queryKey: ["organisations"],
    queryFn: async () => {
      const res = await authFetch("/api/organisations");
      if (!res.ok) throw new Error("Failed to fetch organisations");
      return res.json();
    },
  });
}

export function useOrganisationQuery(id: string) {
  const authFetch = useAuthFetch();
  return useQuery<
    { success: boolean; data: Organisation | null; error?: string },
    Error
  >({
    queryKey: ["organisations", id],
    queryFn: async () => {
      const res = await authFetch(`/api/organisations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch organisation");
      return res.json();
    },
    enabled: !!id,
  });
}
