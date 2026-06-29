/**
 * Format-driver contract. Each competition format (ladder / league / bracket /
 * queue, and future Swiss/GSL) implements this. The schema is format-agnostic;
 * format-specific behaviour lives behind this interface and is selected by slug
 * via the registry. Adding a format = a new driver + register() — no migration.
 *
 * See docs/tournaments/plan.md §3.
 */
import type { ZodTypeAny } from "zod";

/** Context for a stage the driver operates on. */
export interface StageCtx {
  stageId: string;
  seasonId: string;
  competitionId: string;
  /** Validated format_config for this stage. */
  config: Record<string, unknown>;
}

/** Context handed to the driver when a match attributed to the stage completes. */
export interface MatchCompletedCtx {
  matchId: string;
  stageId: string;
  seasonId: string;
  homeEntrantId: string | null;
  awayEntrantId: string | null;
  /** Winning entrant id (null = draw / no entrant attribution). */
  winnerEntrantId: string | null;
  /** Winning team number (1 = home, 2 = away) — used by player-ranked formats. */
  winnerTeam: 1 | 2 | null;
  scoreHome: number;
  scoreAway: number;
}

/** Result of a pre-match legality check (ladder ±range, illegal pairing, etc.). */
export interface GateResult {
  allowed: boolean;
  reason?: string;
}

export interface CanCreateMatchArgs {
  stage: StageCtx;
  challengerEntrantId: string;
  challengedEntrantId: string;
}

export interface FormatDriver {
  /** Stable slug stored in competitions.format / competition_stages.format. */
  slug: string;
  label: string;
  description: string;
  /** True = ranks entrants (league/bracket/ladder); false = ranks players (queue). */
  teamBased: boolean;
  /** Zod schema validating format_config. */
  configSchema: ZodTypeAny;
  /** Default config used when a stage of this format is created. */
  defaultConfig(): Record<string, unknown>;

  /** Create fixtures / bracket slots / seed the ladder. No-op for queue. */
  generateSchedule?(ctx: StageCtx): Promise<void>;
  /** Advance bracket / update fixture / recompute standings on a finished match. */
  onMatchCompleted?(ctx: MatchCompletedCtx): Promise<void>;
  /** Recompute and persist the stage's competition_standings rows. */
  computeStandings?(ctx: StageCtx): Promise<void>;
  /** Gate match creation (ladder ±range, illegal pairing). Defaults to allowed. */
  canCreateMatch?(args: CanCreateMatchArgs): Promise<GateResult>;
}
