import { TimesheetsPage } from "@/entities/workforce/timesheets/components/timesheets-page";

export default async function WorkforceTimesheetsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <TimesheetsPage organisation={organisation} venue={venue} />;
}
