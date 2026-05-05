/**
 * Practice-only mapping: Discord user snowflake → team side for voice automove.
 */
export function buildTeamMap(env: NodeJS.ProcessEnv): Map<string, "A" | "B"> {
  const map = new Map<string, "A" | "B">();
  const parseIds = (raw: string | undefined) =>
    raw
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];

  for (const id of parseIds(env.DISCORD_PRACTICE_TEAM_A_IDS)) {
    map.set(id, "A");
  }
  for (const id of parseIds(env.DISCORD_PRACTICE_TEAM_B_IDS)) {
    map.set(id, "B");
  }
  return map;
}
