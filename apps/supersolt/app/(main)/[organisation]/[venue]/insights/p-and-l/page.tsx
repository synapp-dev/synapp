import { PAndLInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/p-and-l/_components/p-and-l-insights-page-client";

export default async function PAndLInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <PAndLInsightsPageClient organisation={organisation} venue={venue} />;
}
