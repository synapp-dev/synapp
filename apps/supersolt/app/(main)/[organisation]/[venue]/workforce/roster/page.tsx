import { RosterPageClient } from "@/app/(main)/[organisation]/[venue]/workforce/roster/_components/roster-page-client";

export default async function WorkforceRosterPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <RosterPageClient organisation={organisation} venue={venue} />;
}
