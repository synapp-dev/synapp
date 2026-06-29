/** Shared tournament types for components + queries. */
import type {
  competitionEntrants,
  competitionSeasons,
  competitionStages,
  competitions,
} from "@/server/db/schema";

export type Competition = typeof competitions.$inferSelect;
export type CompetitionSeason = typeof competitionSeasons.$inferSelect;
export type CompetitionStage = typeof competitionStages.$inferSelect;
export type CompetitionEntrant = typeof competitionEntrants.$inferSelect;

/** Hub list row: a competition + its current season summary. */
export interface CompetitionSummary {
  id: string;
  slug: string;
  name: string;
  format: string;
  gameMode: string;
  entryType: string;
  recurrence: string;
  branding: Record<string, unknown>;
  currentSeasonId: string | null;
  currentSeasonStatus: string | null;
  prizePool: string | null;
  prizeCurrency: string | null;
  entrantCount: number;
}

export interface LadderRow {
  entrantId: string;
  rank: number | null;
  displayName: string;
  avatar: string | null;
  memberCount: number;
}

/** A single ranked player in a league's top-5 leaderboard. */
export interface LeagueLeader {
  rank: number;
  name: string;
  avatar: string | null;
  points: string;
}

/** Everything the full-bleed hero carousel needs for one PUG league. */
export interface FeaturedLeague {
  slug: string;
  name: string;
  description: string | null;
  gameMode: string;
  status: string | null;
  prizePool: string | null;
  prizeCurrency: string | null;
  entrantCount: number;
  leaders: LeagueLeader[];
}
