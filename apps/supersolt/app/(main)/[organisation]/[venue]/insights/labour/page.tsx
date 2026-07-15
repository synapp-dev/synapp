import { Phase2LockedPage } from "@/app/(main)/[organisation]/[venue]/_components/phase2-locked-page";
import { LabourInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/labour/_components/labour-insights-page-client";
import { isPhase2ModulesEnabled } from "@/lib/phase2-modules";

export default async function LabourInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  if (!isPhase2ModulesEnabled()) {
    return <Phase2LockedPage title="Labour insights" />;
  }

  return <LabourInsightsPageClient organisation={organisation} venue={venue} />;
}
