/**
 * Shared match finalization seam (PUG plan §12/§13). The ONE place a finished
 * match becomes a result: writes match_results + match_player_stats, applies
 * hidden Elo to player_ratings, marks the match completed, then runs the
 * tournament hook (standings / ladder swap) when the match is attributed to a
 * season. Both the MatchZy ingest (PUG) and ladder matches resolve through here.
 *
 * Idempotent: a match already `completed` is a no-op (safe against MatchZy
 * re-delivery of series_end).
 */
import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  matchPlayers,
  matchResults,
  matchPlayerStats,
  matches,
  playerRatings,
} from "@/server/db/schema";
import { onCompetitionMatchCompleted } from "@/entities/tournament/lib/finalize-hook";

import { computeEloDeltas, type EloPlayer } from "./elo";
import { DEFAULT_RATING } from "./leagues";

export interface PlayerStatLine {
  steamid64: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  headshotKills?: number;
  damage?: number;
  mvps?: number;
}

export interface MatchResultInput {
  winnerTeam: 1 | 2 | null;
  scoreTeam1: number;
  scoreTeam2: number;
  map?: string | null;
  durationSeconds?: number | null;
  /** Optional per-player scoreboard (from MatchZy); zeros if absent. */
  playerStats?: PlayerStatLine[];
}

export interface FinalizeSummary {
  ok: boolean;
  alreadyFinalized?: boolean;
  winnerTeam: 1 | 2 | null;
  deltas: Record<string, number>;
}

/** Finalize a match: results + stats + Elo + completion + tournament hook. */
export async function finalizeMatch(
  matchId: string,
  result: MatchResultInput,
): Promise<FinalizeSummary> {
  const [match] = await db
    .select({
      id: matches.id,
      status: matches.status,
      map: matches.map,
      seasonId: matches.seasonId,
      stageId: matches.stageId,
      homeEntrantId: matches.homeEntrantId,
      awayEntrantId: matches.awayEntrantId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error(`Match not found: ${matchId}`);
  if (match.status === "completed") {
    return { ok: true, alreadyFinalized: true, winnerTeam: result.winnerTeam, deltas: {} };
  }

  const roster = await db
    .select({ steamid64: matchPlayers.steamid64, team: matchPlayers.team })
    .from(matchPlayers)
    .where(eq(matchPlayers.matchId, matchId));

  const steamIds = roster.map((r) => r.steamid64);
  const ratingRows = steamIds.length
    ? await db
        .select({
          steamid64: playerRatings.steamid64,
          rating: playerRatings.rating,
          peakRating: playerRatings.peakRating,
          matchesPlayed: playerRatings.matchesPlayed,
          wins: playerRatings.wins,
          losses: playerRatings.losses,
        })
        .from(playerRatings)
        .where(inArray(playerRatings.steamid64, steamIds))
    : [];
  const ratingById = new Map(ratingRows.map((r) => [r.steamid64, r]));

  const toEloPlayer = (steamid64: string): EloPlayer => {
    const r = ratingById.get(steamid64);
    return {
      steamid64,
      rating: r?.rating ?? DEFAULT_RATING,
      matchesPlayed: r?.matchesPlayed ?? 0,
    };
  };

  const team1 = roster.filter((r) => r.team === 1).map((r) => toEloPlayer(r.steamid64));
  const team2 = roster.filter((r) => r.team === 2).map((r) => toEloPlayer(r.steamid64));
  const deltas = computeEloDeltas(team1, team2, result.winnerTeam);

  const statByPlayer = new Map(
    (result.playerStats ?? []).map((s) => [s.steamid64, s]),
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(matchResults)
      .values({
        matchId,
        winnerTeam: result.winnerTeam,
        scoreTeam1: result.scoreTeam1,
        scoreTeam2: result.scoreTeam2,
        map: result.map ?? match.map ?? null,
        durationSeconds: result.durationSeconds ?? null,
      })
      .onConflictDoNothing({ target: matchResults.matchId });

    for (const r of roster) {
      const s = statByPlayer.get(r.steamid64);
      const delta = deltas[r.steamid64] ?? 0;
      await tx
        .insert(matchPlayerStats)
        .values({
          matchId,
          steamid64: r.steamid64,
          team: r.team,
          kills: s?.kills ?? 0,
          deaths: s?.deaths ?? 0,
          assists: s?.assists ?? 0,
          headshotKills: s?.headshotKills ?? 0,
          damage: s?.damage ?? 0,
          mvps: s?.mvps ?? 0,
          ratingDelta: delta,
        })
        .onConflictDoNothing({
          target: [matchPlayerStats.matchId, matchPlayerStats.steamid64],
        });

      const won = result.winnerTeam !== null && r.team === result.winnerTeam;
      const lost = result.winnerTeam !== null && r.team !== result.winnerTeam;
      const prev = ratingById.get(r.steamid64);
      const newRating = (prev?.rating ?? DEFAULT_RATING) + delta;
      await tx
        .insert(playerRatings)
        .values({
          steamid64: r.steamid64,
          rating: newRating,
          peakRating: Math.max(newRating, prev?.peakRating ?? DEFAULT_RATING),
          matchesPlayed: (prev?.matchesPlayed ?? 0) + 1,
          wins: (prev?.wins ?? 0) + (won ? 1 : 0),
          losses: (prev?.losses ?? 0) + (lost ? 1 : 0),
          lastMatchAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: playerRatings.steamid64,
          set: {
            rating: newRating,
            peakRating: sql`greatest(${playerRatings.peakRating}, ${newRating})`,
            matchesPlayed: sql`${playerRatings.matchesPlayed} + 1`,
            wins: sql`${playerRatings.wins} + ${won ? 1 : 0}`,
            losses: sql`${playerRatings.losses} + ${lost ? 1 : 0}`,
            lastMatchAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        });
    }

    await tx
      .update(matches)
      .set({
        status: "completed",
        endedAt: sql`now()`,
        map: result.map ?? match.map ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(matches.id, matchId));
  });

  // Tournament attribution (standings + ladder swap) outside the core tx so a
  // driver hiccup can't roll back the canonical result/Elo write.
  if (match.seasonId && match.stageId) {
    await onCompetitionMatchCompleted({
      matchId,
      seasonId: match.seasonId,
      stageId: match.stageId,
      homeEntrantId: match.homeEntrantId,
      awayEntrantId: match.awayEntrantId,
      winnerTeam: result.winnerTeam,
      scoreHome: result.scoreTeam1,
      scoreAway: result.scoreTeam2,
    });
  }

  return { ok: true, winnerTeam: result.winnerTeam, deltas };
}
