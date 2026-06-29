/** Tournament read queries (public shop-window data). */
import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/server/db/drizzle";
import {
  competitionChallenges,
  competitionEntrants,
  competitionFixtures,
  competitionPrizes,
  competitionSeasons,
  competitionStandings,
  competitionStages,
  competitions,
  newsArticleCompetitions,
  newsArticles,
  steamProfiles,
} from "@/server/db/schema";

import type {
  Competition,
  CompetitionSeason,
  CompetitionStage,
  CompetitionSummary,
  FeaturedLeague,
  LadderRow,
} from "../types";

/** Hub list — each competition with its most recent season + entrant count. */
export async function listCompetitions(): Promise<CompetitionSummary[]> {
  const rows = await db
    .select({
      id: competitions.id,
      slug: competitions.slug,
      name: competitions.name,
      format: competitions.format,
      gameMode: competitions.gameMode,
      entryType: competitions.entryType,
      recurrence: competitions.recurrence,
      branding: competitions.branding,
      seasonId: competitionSeasons.id,
      seasonStatus: competitionSeasons.status,
      seasonNumber: competitionSeasons.seasonNumber,
      prizePool: competitionSeasons.prizePool,
      prizeCurrency: competitionSeasons.prizeCurrency,
    })
    .from(competitions)
    .leftJoin(
      competitionSeasons,
      eq(competitionSeasons.competitionId, competitions.id),
    )
    .orderBy(desc(competitions.createdAt), desc(competitionSeasons.seasonNumber));

  // Keep the highest season per competition (first seen due to ordering).
  const seen = new Map<string, CompetitionSummary>();
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.set(r.id, {
      id: r.id,
      slug: r.slug,
      name: r.name,
      format: r.format,
      gameMode: r.gameMode,
      entryType: r.entryType,
      recurrence: r.recurrence,
      branding: (r.branding ?? {}) as Record<string, unknown>,
      currentSeasonId: r.seasonId,
      currentSeasonStatus: r.seasonStatus,
      prizePool: r.prizePool,
      prizeCurrency: r.prizeCurrency,
      entrantCount: 0,
    });
  }

  // Entrant counts for the current seasons.
  const seasonIds = [...seen.values()].map((s) => s.currentSeasonId).filter(Boolean) as string[];
  if (seasonIds.length) {
    const counts = await db
      .select({
        seasonId: competitionEntrants.seasonId,
        n: sql<number>`count(*)::int`,
      })
      .from(competitionEntrants)
      .where(inArray(competitionEntrants.seasonId, seasonIds))
      .groupBy(competitionEntrants.seasonId);
    const bySeason = new Map(counts.map((c) => [c.seasonId, Number(c.n)]));
    for (const s of seen.values()) {
      if (s.currentSeasonId) s.entrantCount = bySeason.get(s.currentSeasonId) ?? 0;
    }
  }

  return [...seen.values()];
}

/**
 * Featured PUG leagues for the hub hero carousel: each queue competition with
 * its current season, entrant count, and top-5 player leaderboard.
 */
export async function listFeaturedLeagues(): Promise<FeaturedLeague[]> {
  const rows = await db
    .select({
      id: competitions.id,
      slug: competitions.slug,
      name: competitions.name,
      description: competitions.description,
      gameMode: competitions.gameMode,
      seasonId: competitionSeasons.id,
      seasonStatus: competitionSeasons.status,
      seasonNumber: competitionSeasons.seasonNumber,
      prizePool: competitionSeasons.prizePool,
      prizeCurrency: competitionSeasons.prizeCurrency,
    })
    .from(competitions)
    .leftJoin(
      competitionSeasons,
      eq(competitionSeasons.competitionId, competitions.id),
    )
    .where(eq(competitions.format, "queue"))
    .orderBy(desc(competitions.createdAt), desc(competitionSeasons.seasonNumber));

  // Keep one season per competition: prefer a live one, else the highest number.
  const byComp = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = byComp.get(r.id);
    if (!prev) byComp.set(r.id, r);
    else if (prev.seasonStatus !== "live" && r.seasonStatus === "live")
      byComp.set(r.id, r);
  }
  const leagues = [...byComp.values()];
  const seasonIds = leagues.map((l) => l.seasonId).filter(Boolean) as string[];

  // Entrant counts per current season.
  const entrantBySeason = new Map<string, number>();
  if (seasonIds.length) {
    const counts = await db
      .select({
        seasonId: competitionEntrants.seasonId,
        n: sql<number>`count(*)::int`,
      })
      .from(competitionEntrants)
      .where(inArray(competitionEntrants.seasonId, seasonIds))
      .groupBy(competitionEntrants.seasonId);
    for (const c of counts) entrantBySeason.set(c.seasonId, Number(c.n));
  }

  // First stage per season → top-5 player standings for that stage.
  const leadersBySeason = new Map<string, FeaturedLeague["leaders"]>();
  if (seasonIds.length) {
    const stages = await db
      .select({
        id: competitionStages.id,
        seasonId: competitionStages.seasonId,
        sortOrder: competitionStages.sortOrder,
      })
      .from(competitionStages)
      .where(inArray(competitionStages.seasonId, seasonIds))
      .orderBy(asc(competitionStages.sortOrder));

    const firstStageBySeason = new Map<string, string>();
    for (const s of stages) {
      if (!firstStageBySeason.has(s.seasonId))
        firstStageBySeason.set(s.seasonId, s.id);
    }
    const stageToSeason = new Map(
      [...firstStageBySeason.entries()].map(([season, stage]) => [stage, season]),
    );
    const stageIds = [...firstStageBySeason.values()];

    if (stageIds.length) {
      const standings = await db
        .select({
          stageId: competitionStandings.stageId,
          rank: competitionStandings.rank,
          steamid64: competitionStandings.steamid64,
          points: competitionStandings.points,
          name: steamProfiles.personaname,
          avatar: steamProfiles.avatar,
        })
        .from(competitionStandings)
        .leftJoin(
          steamProfiles,
          eq(steamProfiles.steamid64, competitionStandings.steamid64),
        )
        .where(inArray(competitionStandings.stageId, stageIds))
        .orderBy(
          sql`${competitionStandings.rank} asc nulls last`,
          desc(competitionStandings.points),
        );

      for (const row of standings) {
        const seasonId = stageToSeason.get(row.stageId);
        if (!seasonId) continue;
        const list = leadersBySeason.get(seasonId) ?? [];
        if (list.length >= 5) continue;
        list.push({
          rank: row.rank ?? list.length + 1,
          name: row.name ?? row.steamid64 ?? "—",
          avatar: row.avatar,
          points: row.points,
        });
        leadersBySeason.set(seasonId, list);
      }
    }
  }

  return leagues.map((l) => ({
    slug: l.slug,
    name: l.name,
    description: l.description,
    gameMode: l.gameMode,
    status: l.seasonStatus,
    prizePool: l.prizePool,
    prizeCurrency: l.prizeCurrency,
    entrantCount: l.seasonId ? (entrantBySeason.get(l.seasonId) ?? 0) : 0,
    leaders: l.seasonId ? (leadersBySeason.get(l.seasonId) ?? []) : [],
  }));
}

export interface CompetitionDetail {
  competition: Competition;
  seasons: CompetitionSeason[];
}

export async function getCompetitionBySlug(
  slug: string,
): Promise<CompetitionDetail | null> {
  const [comp] = await db
    .select()
    .from(competitions)
    .where(sql`LOWER(${competitions.slug}) = LOWER(${slug})`)
    .limit(1);
  if (!comp) return null;

  const seasons = await db
    .select()
    .from(competitionSeasons)
    .where(eq(competitionSeasons.competitionId, comp.id))
    .orderBy(desc(competitionSeasons.seasonNumber));

  return { competition: comp, seasons };
}

export interface SeasonDetail {
  competition: Competition;
  season: CompetitionSeason;
  stages: CompetitionStage[];
}

export async function getSeasonDetail(
  seasonId: string,
): Promise<SeasonDetail | null> {
  const [season] = await db
    .select()
    .from(competitionSeasons)
    .where(eq(competitionSeasons.id, seasonId))
    .limit(1);
  if (!season) return null;

  const [comp] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, season.competitionId))
    .limit(1);
  if (!comp) return null;

  const stages = await db
    .select()
    .from(competitionStages)
    .where(eq(competitionStages.seasonId, seasonId))
    .orderBy(asc(competitionStages.sortOrder));

  return { competition: comp, season, stages };
}

export interface PrizeRow {
  id: string;
  placementLow: number;
  placementHigh: number;
  prizeType: string;
  amount: string | null;
  currency: string | null;
  description: string | null;
  payoutStatus: string;
}

export async function getPrizes(seasonId: string): Promise<PrizeRow[]> {
  return db
    .select({
      id: competitionPrizes.id,
      placementLow: competitionPrizes.placementLow,
      placementHigh: competitionPrizes.placementHigh,
      prizeType: competitionPrizes.prizeType,
      amount: competitionPrizes.amount,
      currency: competitionPrizes.currency,
      description: competitionPrizes.description,
      payoutStatus: competitionPrizes.payoutStatus,
    })
    .from(competitionPrizes)
    .where(eq(competitionPrizes.seasonId, seasonId))
    .orderBy(asc(competitionPrizes.placementLow));
}

export interface LinkedNewsRow {
  slug: string;
  title: string;
  relationType: string;
  publishedAt: string | null;
}

export async function getLinkedNews(seasonId: string): Promise<LinkedNewsRow[]> {
  return db
    .select({
      slug: newsArticles.slug,
      title: newsArticles.title,
      relationType: newsArticleCompetitions.relationType,
      publishedAt: newsArticles.publishedAt,
    })
    .from(newsArticleCompetitions)
    .innerJoin(newsArticles, eq(newsArticles.id, newsArticleCompetitions.articleId))
    .where(
      and(
        eq(newsArticleCompetitions.seasonId, seasonId),
        eq(newsArticles.status, "published"),
      ),
    )
    .orderBy(desc(newsArticles.publishedAt));
}

export interface StandingRow {
  rank: number | null;
  name: string;
  avatar: string | null;
  points: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
}

/** Player-ranked standings (PUG steal-points leaderboard) for a stage. */
export async function getPlayerStandings(stageId: string): Promise<StandingRow[]> {
  const rows = await db
    .select({
      rank: competitionStandings.rank,
      steamid64: competitionStandings.steamid64,
      points: competitionStandings.points,
      wins: competitionStandings.wins,
      losses: competitionStandings.losses,
      matchesPlayed: competitionStandings.matchesPlayed,
      name: steamProfiles.personaname,
      avatar: steamProfiles.avatar,
    })
    .from(competitionStandings)
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, competitionStandings.steamid64))
    .where(eq(competitionStandings.stageId, stageId))
    .orderBy(sql`${competitionStandings.rank} asc nulls last`, desc(competitionStandings.points));

  return rows.map((r) => ({
    rank: r.rank,
    name: r.name ?? r.steamid64 ?? "—",
    avatar: r.avatar,
    points: r.points,
    wins: r.wins,
    losses: r.losses,
    matchesPlayed: r.matchesPlayed,
  }));
}

export interface FixtureRow {
  id: string;
  round: number | null;
  status: string;
  matchId: string | null;
  bracket: string | null;
  homeName: string | null;
  awayName: string | null;
}

/** League/bracket fixtures for a stage, ordered by round. */
export async function getFixtures(stageId: string): Promise<FixtureRow[]> {
  const home = alias(competitionEntrants, "home_e");
  const away = alias(competitionEntrants, "away_e");
  const rows = await db
    .select({
      id: competitionFixtures.id,
      round: competitionFixtures.round,
      status: competitionFixtures.status,
      matchId: competitionFixtures.matchId,
      bracket: competitionFixtures.bracket,
      homeName: home.displayName,
      awayName: away.displayName,
    })
    .from(competitionFixtures)
    .leftJoin(home, eq(home.id, competitionFixtures.homeEntrantId))
    .leftJoin(away, eq(away.id, competitionFixtures.awayEntrantId))
    .where(eq(competitionFixtures.stageId, stageId))
    .orderBy(asc(competitionFixtures.round));
  return rows;
}

/** Entrant-ranked standings (league table) for a stage. */
export async function getEntrantStandings(stageId: string): Promise<StandingRow[]> {
  const rows = await db
    .select({
      rank: competitionStandings.rank,
      points: competitionStandings.points,
      wins: competitionStandings.wins,
      losses: competitionStandings.losses,
      matchesPlayed: competitionStandings.matchesPlayed,
      name: competitionEntrants.displayName,
      avatar: competitionEntrants.avatar,
    })
    .from(competitionStandings)
    .innerJoin(competitionEntrants, eq(competitionEntrants.id, competitionStandings.entrantId))
    .where(eq(competitionStandings.stageId, stageId))
    .orderBy(sql`${competitionStandings.rank} asc nulls last`, desc(competitionStandings.points));

  return rows.map((r) => ({
    rank: r.rank,
    name: r.name,
    avatar: r.avatar,
    points: r.points,
    wins: r.wins,
    losses: r.losses,
    matchesPlayed: r.matchesPlayed,
  }));
}

export interface LadderChallengeRow {
  id: string;
  status: string;
  matchId: string | null;
  challengerEntrantId: string;
  challengedEntrantId: string;
  challengerName: string;
  challengedName: string;
}

export interface LadderState {
  stageId: string | null;
  rows: LadderRow[];
  challenges: LadderChallengeRow[];
}

/** Everything the interactive ladder needs: positions + open/active challenges. */
export async function getLadderState(seasonId: string): Promise<LadderState> {
  const rows = await getLadderRows(seasonId);

  const [stage] = await db
    .select({ id: competitionStages.id })
    .from(competitionStages)
    .where(eq(competitionStages.seasonId, seasonId))
    .orderBy(asc(competitionStages.sortOrder))
    .limit(1);

  if (!stage) return { stageId: null, rows, challenges: [] };

  const nameById = new Map(rows.map((r) => [r.entrantId, r.displayName]));
  const challengeRows = await db
    .select({
      id: competitionChallenges.id,
      status: competitionChallenges.status,
      matchId: competitionChallenges.matchId,
      challengerEntrantId: competitionChallenges.challengerEntrantId,
      challengedEntrantId: competitionChallenges.challengedEntrantId,
    })
    .from(competitionChallenges)
    .where(
      and(
        eq(competitionChallenges.stageId, stage.id),
        inArray(competitionChallenges.status, ["pending", "accepted"]),
      ),
    )
    .orderBy(desc(competitionChallenges.createdAt));

  return {
    stageId: stage.id,
    rows,
    challenges: challengeRows.map((c) => ({
      id: c.id,
      status: c.status,
      matchId: c.matchId,
      challengerEntrantId: c.challengerEntrantId,
      challengedEntrantId: c.challengedEntrantId,
      challengerName: nameById.get(c.challengerEntrantId) ?? "—",
      challengedName: nameById.get(c.challengedEntrantId) ?? "—",
    })),
  };
}

/** Ladder standings — entrants ordered by position, with roster size. */
export async function getLadderRows(seasonId: string): Promise<LadderRow[]> {
  const rows = await db
    .select({
      entrantId: competitionEntrants.id,
      rank: competitionEntrants.ladderRank,
      displayName: competitionEntrants.displayName,
      avatar: competitionEntrants.avatar,
      memberCount: sql<number>`(
        select count(*)::int from competition_entrant_members m
        where m.entrant_id = ${competitionEntrants.id}
      )`,
    })
    .from(competitionEntrants)
    .where(eq(competitionEntrants.seasonId, seasonId))
    .orderBy(sql`${competitionEntrants.ladderRank} asc nulls last`);

  return rows.map((r) => ({
    entrantId: r.entrantId,
    rank: r.rank,
    displayName: r.displayName,
    avatar: r.avatar,
    memberCount: Number(r.memberCount),
  }));
}
