/** True when the viewer's Steam ID matches the team leader. */
export function isTeamLeader(
  leaderSteamid64: string | null | undefined,
  viewerSteamid64: string | null | undefined,
): boolean {
  if (!leaderSteamid64 || !viewerSteamid64) return false;
  return leaderSteamid64 === viewerSteamid64;
}
