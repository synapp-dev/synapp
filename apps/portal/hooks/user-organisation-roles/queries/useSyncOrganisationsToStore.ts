import { useEffect } from "react";
import { useUserOrganisationRolesQuery } from "./read";
import { useUserOrganisationRoleStore } from "@/stores/userOrganisationRoleStore";

export function useSyncUserOrganisationRolesToStore() {
  const { data, isSuccess } = useUserOrganisationRolesQuery();
  const setUserOrganisationRoles = useUserOrganisationRoleStore(
    (s) => s.setUserOrganisationRoles
  );

  useEffect(() => {
    if (isSuccess && data?.data) {
      setUserOrganisationRoles(data.data);
    }
  }, [isSuccess, data, setUserOrganisationRoles]);
}
