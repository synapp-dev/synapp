import { useQuery } from "@tanstack/react-query";
import type { Organisation } from "@/providers/postgres/organisations/read";
import { useDatabaseEndpoint } from "@/utils/api-client";

export type OrganisationsResponse = {
  success: boolean;
  data: Organisation[];
  error?: string;
};

export function useGetAllOrganisations() {
  const db = useDatabaseEndpoint();
  return useQuery<OrganisationsResponse, Error>({
    queryKey: ["organisations"],
    queryFn: async () => {
      const response = await db.organisations();
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch organisations");
      }
      return response;
    },
  });
}

// New explicit hooks for ID and slug
export function useGetOrganisationById(id: string) {
  const db = useDatabaseEndpoint();
  return useQuery<
    { success: boolean; data: Organisation | null; error?: string },
    Error
  >({
    queryKey: ["organisations", "id", id],
    queryFn: async () => {
      const response = await db.organisationById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch organisation by ID");
      }
      return response;
    },
    enabled: !!id,
  });
}

export function useGetOrganisationBySlug(slug: string) {
  const db = useDatabaseEndpoint();
  return useQuery<
    { success: boolean; data: Organisation | null; error?: string },
    Error
  >({
    queryKey: ["organisations", "slug", slug],
    queryFn: async () => {
      const response = await db.organisationBySlug(slug);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch organisation by slug");
      }
      return response;
    },
    enabled: !!slug,
  });
}
