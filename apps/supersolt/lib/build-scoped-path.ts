export function buildScopedPath(
  organisationSlug: string,
  venueSlug: string,
  sectionPath: string
): string {
  return `/${organisationSlug}/${venueSlug}/${sectionPath}`;
}
