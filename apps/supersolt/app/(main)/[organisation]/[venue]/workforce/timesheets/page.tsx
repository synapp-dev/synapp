import { TimesheetsPageClient } from "@/app/(main)/[organisation]/[venue]/workforce/timesheets/_components/timesheets-page-client";

export default async function WorkforceTimesheetsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <TimesheetsPageClient organisation={organisation} venue={venue} />;
}
