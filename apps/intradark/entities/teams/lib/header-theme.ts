import type { TeamSummary } from "@/entities/teams/types";

export type TeamHeaderTheme = {
  primaryColor: string;
  secondaryColor: string;
};

/** Intradark default profile header palette when the player has no team colours. */
export const INTRADARK_HEADER_THEME: TeamHeaderTheme = {
  primaryColor: "#00497d",
  secondaryColor: "#0483c8",
};

type TeamThemeSource = Pick<TeamSummary, "primaryColor" | "secondaryColor">;

/** Resolve glow (primary), border, and team-name (secondary) colours for the player header. */
export function resolveTeamHeaderTheme(
  team: TeamThemeSource | null | undefined,
): TeamHeaderTheme {
  if (!team) return INTRADARK_HEADER_THEME;

  const primaryColor = team.primaryColor ?? INTRADARK_HEADER_THEME.primaryColor;
  const secondaryColor =
    team.secondaryColor ?? team.primaryColor ?? INTRADARK_HEADER_THEME.secondaryColor;

  return { primaryColor, secondaryColor };
}
