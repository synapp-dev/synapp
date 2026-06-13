export const membersKeys = {
  all: ["members"] as const,
  list: (organisationSlug: string) =>
    [...membersKeys.all, "list", organisationSlug] as const,
  detail: (organisationSlug: string, userOrganisationId: string) =>
    [...membersKeys.all, "detail", organisationSlug, userOrganisationId] as const,
};
