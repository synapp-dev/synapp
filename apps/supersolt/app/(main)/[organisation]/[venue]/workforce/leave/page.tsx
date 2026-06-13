import { LeavePage } from "@/entities/workforce/leave/components/leave-page";

export default async function WorkforceLeavePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  return <LeavePage organisation={organisation} venue={venue} />;
}
