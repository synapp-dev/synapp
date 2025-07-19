"use client";

import { useOrganisations } from "@/stores/organisations/organisation-store";
import { useUserOrganisationRoleStore } from "@/stores/userOrganisationRoleStore";
import { useSyncUserOrganisationRolesToStore } from "@/hooks/user-organisation-roles/queries/useSyncOrganisationsToStore";
import { useUserOrganisationRolesQuery } from "@/hooks/user-organisation-roles/queries/read";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function Home() {
  // Use our new combined hook for organisations
  const { organisations, isLoading, isError, error } = useOrganisations();
  
  // Keep the old pattern for user organisation roles for now
  useSyncUserOrganisationRolesToStore();
  const userOrganisationRoles = useUserOrganisationRoleStore(
    (s) => s.userOrganisationRoles
  );
  const {
    isLoading: isLoadingUserOrganisationRoles,
    isError: isErrorUserOrganisationRoles,
    error: errorUserOrganisationRoles,
  } = useUserOrganisationRolesQuery();

  if (isLoading || isLoadingUserOrganisationRoles)
    return <div>Loading organisations...</div>;
  if (isError || isErrorUserOrganisationRoles)
    return (
      <div>Error: {error || errorUserOrganisationRoles?.message}</div>
    );

  return (
    <div>
      <h1>Organisations</h1>
      {organisations.length === 0 ? (
        <div>No organisations found.</div>
      ) : (
        <>
          {organisations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </>
      )}
      <h1>User Organisation Roles</h1>
      {userOrganisationRoles.length === 0 ? (
        <div>No user organisation roles found.</div>
      ) : (
        <Card className="flex flex-col gap-4">
          {userOrganisationRoles.map((role) => (
            <li key={role.id}>
              Organisation: {role.organisation.name}, Role: {role.role_name}
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}
