import { Phase2LockedPage } from "@/app/(main)/[organisation]/[venue]/_components/phase2-locked-page";
import { PAndLInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/p-and-l/_components/p-and-l-insights-page-client";
import { isPhase2ModulesEnabled } from "@/lib/phase2-modules";

export default async function PAndLInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  if (!isPhase2ModulesEnabled()) {
    return <Phase2LockedPage title="P&L insights" />;
  }

  return <PAndLInsightsPageClient organisation={organisation} venue={venue} />;
}
