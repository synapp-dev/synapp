import { create } from "zustand";
import type { UserOrganisationRole } from "@/providers/postgres/user_organisation_roles/read";

export type UserOrganisationRoleWithName = UserOrganisationRole & {
  role_name: string;
  organisation: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
};

type UserOrganisationRoleStore = {
  userOrganisationRoles: UserOrganisationRoleWithName[];
  setUserOrganisationRoles: (roles: UserOrganisationRoleWithName[]) => void;
  selectedUserOrganisationRole: UserOrganisationRoleWithName | null;
  setSelectedUserOrganisationRole: (
    role: UserOrganisationRoleWithName | null
  ) => void;
};

export const useUserOrganisationRoleStore = create<UserOrganisationRoleStore>(
  (set) => ({
    userOrganisationRoles: [],
    setUserOrganisationRoles: (roles) => set({ userOrganisationRoles: roles }),
    selectedUserOrganisationRole: null,
    setSelectedUserOrganisationRole: (role) =>
      set({ selectedUserOrganisationRole: role }),
  })
);
