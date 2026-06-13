import { RosterPage } from "@/entities/workforce/roster/components/roster-page";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function WorkforceRosterPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "workforce-roster");

  return <RosterPage organisation={organisation} venue={venue} />;
}
