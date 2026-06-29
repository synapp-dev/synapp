/**
 * "Steal" points (PUG plan §2.1) — the visible, per-season PUG score (separate
 * from hidden Elo). Base win = +6; margin modifiers let close losers steal back
 * and blow-out losers get demerited. Pure + deterministic.
 *
 *  margin | winner | loser
 *   ≤2    |  +6    |  +2   ("fighter")
 *   3–4   |  +6    |  +1
 *   5–6   |  +6    |   0
 *   7–8   |  +8    |  −2   ("#ratioed")
 *   9–10  | +10    |  −4
 *   ≥11   | +12    |  −6   ("de_Stroyed")
 */

export const STEAL_BASE_WIN = 6;

export interface StealPoints {
  winner: number;
  loser: number;
}

/** Points awarded to the winning and losing side given the round score. */
export function stealPointsForScore(
  winnerScore: number,
  loserScore: number,
): StealPoints {
  const margin = Math.abs(winnerScore - loserScore);
  if (margin === 0) return { winner: 0, loser: 0 }; // draw

  let winnerBonus = 0;
  let loserMod = 0; // positive = steal-back, negative = demerit
  if (margin <= 2) loserMod = 2;
  else if (margin <= 4) loserMod = 1;
  else if (margin <= 6) loserMod = 0;
  else if (margin <= 8) {
    winnerBonus = 2;
    loserMod = -2;
  } else if (margin <= 10) {
    winnerBonus = 4;
    loserMod = -4;
  } else {
    winnerBonus = 6;
    loserMod = -6;
  }

  return { winner: STEAL_BASE_WIN + winnerBonus, loser: loserMod };
}

/** Per-team points for a finished match (team1/team2 keyed). null = draw. */
export function stealPointsByTeam(
  scoreTeam1: number,
  scoreTeam2: number,
  winnerTeam: 1 | 2 | null,
): { team1: number; team2: number } {
  if (winnerTeam === null) return { team1: 0, team2: 0 };
  const winnerScore = winnerTeam === 1 ? scoreTeam1 : scoreTeam2;
  const loserScore = winnerTeam === 1 ? scoreTeam2 : scoreTeam1;
  const pts = stealPointsForScore(winnerScore, loserScore);
  return winnerTeam === 1
    ? { team1: pts.winner, team2: pts.loser }
    : { team1: pts.loser, team2: pts.winner };
}
