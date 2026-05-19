import { toast } from "sonner";
import { meApi } from "@/entities/me/api/endpoints";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import {
  enrichUserSchoolRoles,
  type RoleCatalogEntry,
  type SchoolRoleCatalogEntry,
} from "./enrich-user-school-roles";
import { parseUserWithRoles } from "./parse-user-with-roles";
import { removeSchoolRolesFromUser } from "./remove-school-from-user";

export type UserUpdateContext = {
  removedSchoolId?: string;
};

export type UserRefreshCatalog = {
  schools?: SchoolRoleCatalogEntry[];
  roles?: RoleCatalogEntry[];
};

export function buildUserRefreshCatalog(
  schools: Array<{ id: string; name: string }>,
  roles: Array<{ key?: string | null; name?: string | null }>
): UserRefreshCatalog {
  return {
    schools: schools.map((s) => ({ id: s.id, name: s.name })),
    roles: roles.map((r) => ({ key: r.key ?? null, name: r.name ?? null })),
  };
}

export async function fetchUserWithRolesById(
  userId: string,
  catalog?: UserRefreshCatalog & {
    previousSchoolRoles?: UserWithRolesAndSchools["schoolRoles"];
  }
): Promise<UserWithRolesAndSchools | null> {
  const result = await meApi.get.userById(userId);
  if (!result.data) {
    return null;
  }
  const parsed = parseUserWithRoles(result.data);
  return enrichUserSchoolRoles(parsed, {
    schools: catalog?.schools,
    roles: catalog?.roles,
    previousSchoolRoles: catalog?.previousSchoolRoles,
  });
}

export async function refreshSelectedUserAfterMutation(params: {
  userId: string;
  currentUser: UserWithRolesAndSchools | null;
  setSelectedUser: (user: UserWithRolesAndSchools | null) => void;
  removedSchoolId?: string;
  catalog?: UserRefreshCatalog;
}): Promise<void> {
  const { userId, currentUser, setSelectedUser, removedSchoolId, catalog } =
    params;
  const refreshed = await fetchUserWithRolesById(userId, {
    ...catalog,
    previousSchoolRoles: currentUser?.schoolRoles,
  });

  if (refreshed) {
    setSelectedUser(refreshed);
    return;
  }

  if (currentUser && removedSchoolId) {
    setSelectedUser(removeSchoolRolesFromUser(currentUser, removedSchoolId));
    toast.warning(
      "User removed from school, but the profile could not be refreshed. Close and reopen the user if anything looks out of date."
    );
    return;
  }

  if (currentUser) {
    toast.warning(
      "Changes were saved, but the user profile could not be refreshed. Close and reopen the user if anything looks out of date."
    );
  }
}

export function createUserDetailOnUserUpdateHandler(options: {
  userId: string | undefined;
  selectedUser: UserWithRolesAndSchools | null;
  setSelectedUser: (user: UserWithRolesAndSchools | null) => void;
  refetchLists: () => Promise<unknown>;
  catalog?: UserRefreshCatalog;
}): (context?: UserUpdateContext) => Promise<void> {
  return async (context) => {
    await options.refetchLists();
    if (!options.userId) {
      return;
    }
    await refreshSelectedUserAfterMutation({
      userId: options.userId,
      currentUser: options.selectedUser,
      setSelectedUser: options.setSelectedUser,
      removedSchoolId: context?.removedSchoolId,
      catalog: options.catalog,
    });
  };
}
