import { notFound } from "next/navigation";

import { TeamAdminForm } from "@/entities/teams/components/team-admin-form";
import { isTeamLeader } from "@/entities/teams/lib/leader";
import { getTeamBySlug } from "@/entities/teams/lib/queries";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { MainSectionShell } from "@/components/organisms/main-section-shell";

export const dynamic = "force-dynamic";

export default async function TeamAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeamBySlug(decodeURIComponent(slug));
  if (!team) notFound();

  const viewer = await getCurrentUserProfiles();
  const viewerSteamid64 = viewer?.userProfile.steam_profile_id ?? null;
  if (!isTeamLeader(team.leaderSteamid64, viewerSteamid64)) {
    notFound();
  }

  return (
    <MainSectionShell
      title="Team settings"
      description="Update your team profile. Member management is coming soon."
    >
      <TeamAdminForm team={team} />
    </MainSectionShell>
  );
}
