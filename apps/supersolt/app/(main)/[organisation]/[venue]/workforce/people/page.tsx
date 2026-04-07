import { PeoplePageClient } from "@/app/(main)/[organisation]/[venue]/workforce/people/_components/people-page-client";

export default async function WorkforcePeoplePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <PeoplePageClient organisation={organisation} venue={venue} />;
}
