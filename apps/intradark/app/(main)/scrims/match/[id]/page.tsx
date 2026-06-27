import { notFound } from "next/navigation";

import { getTeamRoster } from "@/entities/teams/lib/queries";
import { ScrimLobby } from "@/entities/scrims/components/lobby/scrim-lobby";
import { getScrimById, getTeamServers } from "@/entities/scrims/lib/queries";
import type { TeamServer } from "@/entities/scrims/types";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

export const dynamic = "force-dynamic";

export default async function ScrimMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scrim = await getScrimById(id);
  if (!scrim) notFound();

  const viewer = await getCurrentUserProfiles();
  const steamid64 = viewer?.userProfile.steam_profile_id ?? null;

  const [homeRoster, awayRoster] = await Promise.all([
    getTeamRoster(scrim.homeTeam.id),
    getTeamRoster(scrim.awayTeam.id),
  ]);

  const inHome = steamid64
    ? homeRoster.some((m) => m.steamid64 === steamid64)
    : false;
  const inAway = steamid64
    ? awayRoster.some((m) => m.steamid64 === steamid64)
    : false;
  const canManage = inHome || inAway;

  // Connect details are sensitive — only fetch for teams the viewer is on.
  const servers: (TeamServer & { teamName: string })[] = [];
  if (inHome) {
    const rows = await getTeamServers(scrim.homeTeam.id);
    servers.push(...rows.map((s) => ({ ...s, teamName: scrim.homeTeam.name })));
  }
  if (inAway) {
    const rows = await getTeamServers(scrim.awayTeam.id);
    servers.push(...rows.map((s) => ({ ...s, teamName: scrim.awayTeam.name })));
  }

  return (
    <ScrimLobby
      scrim={scrim}
      homeRoster={homeRoster}
      awayRoster={awayRoster}
      servers={servers}
      canManage={canManage}
    />
  );
}
