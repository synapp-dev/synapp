import { notFound, redirect } from "next/navigation";

import { TeamHeader } from "@/entities/teams/components/team-header";
import { TeamTabs } from "@/entities/teams/components/team-tabs";
import { TeamsWorkspaceShell } from "@/entities/teams/components/teams-workspace-shell";
import { isTeamLeader } from "@/entities/teams/lib/leader";
import {
  canonicalTeamPathIfMismatch,
} from "@/entities/teams/lib/resolve-team-slug";
import {
  getMyTeamsForUser,
  getTeamBySlug,
} from "@/entities/teams/lib/queries";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

export const dynamic = "force-dynamic";

export default async function TeamSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);

  const team = await getTeamBySlug(urlSlug);
  if (!team) notFound();

  const canonical = canonicalTeamPathIfMismatch(urlSlug, team.slug);
  if (canonical) {
    redirect(canonical);
  }

  const viewer = await getCurrentUserProfiles();
  const viewerSteamid64 = viewer?.userProfile.steam_profile_id ?? null;
  const showAdmin = isTeamLeader(team.leaderSteamid64, viewerSteamid64);
  const myTeams = viewerSteamid64
    ? await getMyTeamsForUser(viewerSteamid64)
    : [];

  return (
    <TeamsWorkspaceShell myTeams={myTeams}>
      <div className="space-y-6">
        <TeamHeader team={team} />
        <TeamTabs slug={team.slug} showAdmin={showAdmin} />
        {children}
      </div>
    </TeamsWorkspaceShell>
  );
}
