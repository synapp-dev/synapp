import { DEFAULT_RATING, TEAM_SIZE } from "./leagues";

export type BalanceInput = { steamid64: string; rating: number };
export type BalancedTeams = { team1: string[]; team2: string[] };

/**
 * §5 MVP team allocation — greedy ELO auto-balance, no captains.
 *
 * Sort players strongest → weakest (steamid64 as a deterministic tiebreak), then
 * hand each to whichever team currently has the lower total rating (filling the
 * stronger pick onto the trailing side). Teams are capped at TEAM_SIZE, so once one
 * side is full the rest go to the other. Deterministic for a given input set, which
 * keeps it unit-testable and reproducible for audit.
 */
export function balanceTeams(players: BalanceInput[]): BalancedTeams {
  const sorted = [...players].sort(
    (a, b) => b.rating - a.rating || a.steamid64.localeCompare(b.steamid64),
  );

  const team1: string[] = [];
  const team2: string[] = [];
  let sum1 = 0;
  let sum2 = 0;

  for (const p of sorted) {
    const team1Full = team1.length >= TEAM_SIZE;
    const team2Full = team2.length >= TEAM_SIZE;

    let toTeam1: boolean;
    if (team1Full) toTeam1 = false;
    else if (team2Full) toTeam1 = true;
    else toTeam1 = sum1 <= sum2; // lower (or equal) total gets the next strongest

    if (toTeam1) {
      team1.push(p.steamid64);
      sum1 += p.rating;
    } else {
      team2.push(p.steamid64);
      sum2 += p.rating;
    }
  }

  return { team1, team2 };
}

/** Sum of ratings for a roster (default rating applied to any missing value). */
export function teamRatingTotal(
  players: BalanceInput[],
  roster: string[],
): number {
  const byId = new Map(players.map((p) => [p.steamid64, p.rating]));
  return roster.reduce((acc, id) => acc + (byId.get(id) ?? DEFAULT_RATING), 0);
}
