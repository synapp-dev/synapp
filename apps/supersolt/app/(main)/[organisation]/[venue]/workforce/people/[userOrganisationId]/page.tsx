import { PeopleDetailPage } from "@/entities/workforce/people/components/people-detail-page";

export default async function WorkforcePeopleDetailPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; userOrganisationId: string }>;
}) {
  const { organisation, venue, userOrganisationId } = await params;

  return (
    <PeopleDetailPage
      organisation={organisation}
      venue={venue}
      userOrganisationId={userOrganisationId}
    />
  );
}
