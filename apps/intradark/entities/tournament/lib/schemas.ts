/** Zod validators for tournament organizer operations. */
import { z } from "zod";

import {
  ENTRY_TYPES,
  FORMAT_SLUGS,
  GAME_MODES,
  RECURRENCES,
} from "./constants";

const slug = z
  .string()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-with-dashes only");

/** Create a competition + its first season + an initial stage (the wizard payload). */
export const createCompetitionSchema = z.object({
  name: z.string().min(2).max(255),
  slug,
  gameMode: z.enum(GAME_MODES),
  format: z.enum(FORMAT_SLUGS),
  entryType: z.enum(ENTRY_TYPES).default("open"),
  recurrence: z.enum(RECURRENCES).default("one_shot"),
  description: z.string().max(5000).optional(),
  branding: z.record(z.string(), z.unknown()).default({}),
  season: z
    .object({
      name: z.string().max(255).optional(),
      registrationOpensAt: z.string().datetime().optional(),
      registrationClosesAt: z.string().datetime().optional(),
      rosterLockAt: z.string().datetime().optional(),
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      maxEntrants: z.number().int().positive().optional(),
      minRoster: z.number().int().positive().optional(),
      maxRoster: z.number().int().positive().optional(),
      checkInRequired: z.boolean().default(false),
      checkInOpensAt: z.string().datetime().optional(),
      eligibilityRules: z.record(z.string(), z.unknown()).default({}),
      mapPool: z.array(z.string()).default([]),
      matchDefaults: z.record(z.string(), z.unknown()).default({}),
      prizePool: z.number().nonnegative().optional(),
      prizeCurrency: z.string().max(8).optional(),
      fundingSource: z.enum(["internal", "sponsor", "entry_fees"]).default("internal"),
      entryFee: z.number().nonnegative().optional(),
    })
    .prefault({}),
  /** Optional override for the initial stage's format_config. */
  stageConfig: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;

export const updateSeasonStatusSchema = z.object({
  seasonId: z.string().uuid(),
  status: z.enum([
    "draft",
    "announced",
    "registration_open",
    "registration_closed",
    "seeding",
    "live",
    "completed",
    "archived",
  ]),
  reason: z.string().max(500).optional(),
});

export type UpdateSeasonStatusInput = z.infer<typeof updateSeasonStatusSchema>;

/** Register an entrant into a season (team-backed, crew, or solo). */
export const registerEntrantSchema = z.object({
  seasonId: z.string().uuid(),
  displayName: z.string().min(1).max(255),
  teamId: z.string().uuid().optional(),
  avatar: z.string().url().optional(),
  members: z
    .array(
      z.object({
        steamid64: z.string().min(1),
        isCaptain: z.boolean().default(false),
      }),
    )
    .min(1),
});

export type RegisterEntrantInput = z.infer<typeof registerEntrantSchema>;

/** Ladder: issue a challenge. */
export const createChallengeSchema = z.object({
  stageId: z.string().uuid(),
  challengerEntrantId: z.string().uuid(),
  challengedEntrantId: z.string().uuid(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
