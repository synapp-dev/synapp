import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { UserOrganisationRoleWithName } from "@/stores/userOrganisationRoleStore";

export type UserOrganisationRolesResponse = {
  success: boolean;
  data: UserOrganisationRoleWithName[];
  error?: string;
};

export function useUserOrganisationRolesQuery() {
  const authFetch = useAuthFetch();
  return useQuery<UserOrganisationRolesResponse, Error>({
    queryKey: ["user_organisation_roles"],
    queryFn: async () => {
      const res = await authFetch("/api/user_organisation_roles");
      if (!res.ok) throw new Error("Failed to fetch user organisation roles");
      return res.json();
    },
  });
}
