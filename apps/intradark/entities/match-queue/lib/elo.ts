/**
 * Hidden team Elo (PUG plan §8). Pure + deterministic so it's unit-testable and
 * auditable. Drives matchmaking balance, tournament seeding, and win-probability;
 * never shown to players unless an admin toggles visibility.
 *
 *   E1    = 1 / (1 + 10^((avgR2 - avgR1) / 400))
 *   delta = round(K * (result - E1))   per player, K boosted during placement
 */

export const DEFAULT_K = 32;
export const PLACEMENT_K = 40;
export const PLACEMENT_MATCHES = 10;

export interface EloPlayer {
  steamid64: string;
  rating: number;
  matchesPlayed: number;
}

/** Expected score (win probability) of a side rated `ratingFor` vs `ratingAgainst`. */
export function expectedScore(ratingFor: number, ratingAgainst: number): number {
  return 1 / (1 + 10 ** ((ratingAgainst - ratingFor) / 400));
}

/** Higher K while a player is still in placement (their first ~10 matches). */
export function kFactor(matchesPlayed: number): number {
  return matchesPlayed < PLACEMENT_MATCHES ? PLACEMENT_K : DEFAULT_K;
}

function average(players: EloPlayer[]): number {
  if (players.length === 0) return 0;
  return players.reduce((acc, p) => acc + p.rating, 0) / players.length;
}

/**
 * Per-player Elo delta for a finished match. `winnerTeam` null = draw.
 * Returns a map steamid64 → integer delta (winners positive, losers negative).
 */
export function computeEloDeltas(
  team1: EloPlayer[],
  team2: EloPlayer[],
  winnerTeam: 1 | 2 | null,
): Record<string, number> {
  const avg1 = average(team1);
  const avg2 = average(team2);
  const e1 = expectedScore(avg1, avg2);
  const e2 = 1 - e1;
  const result1 = winnerTeam === 1 ? 1 : winnerTeam === 2 ? 0 : 0.5;
  const result2 = 1 - result1;

  const out: Record<string, number> = {};
  for (const p of team1) {
    out[p.steamid64] = Math.round(kFactor(p.matchesPlayed) * (result1 - e1));
  }
  for (const p of team2) {
    out[p.steamid64] = Math.round(kFactor(p.matchesPlayed) * (result2 - e2));
  }
  return out;
}

/** Win probability for the home/team1 side — used for the (hidden) match preview. */
export function winProbability(team1: EloPlayer[], team2: EloPlayer[]): number {
  return expectedScore(average(team1), average(team2));
}
