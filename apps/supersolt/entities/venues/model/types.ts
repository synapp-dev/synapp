/** Response payload for POST /api/organisations/[organisation]/venues */
export type CreatedOrganisationVenueDto = {
  id: string;
  name: string;
  slug: string;
  organisationSlug: string;
};
