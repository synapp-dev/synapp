import { LeavePageClient } from "@/app/(main)/[organisation]/[venue]/workforce/leave/_components/leave-page-client";

export default async function WorkforceLeavePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <LeavePageClient organisation={organisation} venue={venue} />;
}
