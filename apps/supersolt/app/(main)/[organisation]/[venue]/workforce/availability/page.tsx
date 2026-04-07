import { AvailabilityPageClient } from "@/app/(main)/[organisation]/[venue]/workforce/availability/_components/availability-page-client";

export default async function WorkforceAvailabilityPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <AvailabilityPageClient organisation={organisation} venue={venue} />;
}
