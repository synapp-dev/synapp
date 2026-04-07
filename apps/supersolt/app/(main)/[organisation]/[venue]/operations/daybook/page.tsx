import { DaybookPageClient } from "@/app/(main)/[organisation]/[venue]/operations/daybook/_components/daybook-page-client";

export default async function DaybookPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <DaybookPageClient organisation={organisation} venue={venue} />;
}
