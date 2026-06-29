/**
 * Maps a PUG queue league (champions/stellaris/genesis/open) to its current
 * live competition season + stage, so matchmaker-formed matches are attributed
 * to the season and accrue steal-points standings via the queue driver.
 * See docs/tournaments/plan.md §10 (P3).
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionSeasons,
  competitionStages,
  competitions,
} from "@/server/db/schema";

export interface QueueSeasonStage {
  seasonId: string;
  stageId: string;
}

const slugForLeague = (league: string) => `pug-${league}`;

/** Resolve the live season + first stage for a PUG league, or null if unseeded. */
export async function getQueueSeasonStage(
  league: string,
): Promise<QueueSeasonStage | null> {
  const [row] = await db
    .select({ seasonId: competitionSeasons.id, stageId: competitionStages.id })
    .from(competitions)
    .innerJoin(
      competitionSeasons,
      and(
        eq(competitionSeasons.competitionId, competitions.id),
        eq(competitionSeasons.status, "live"),
      ),
    )
    .innerJoin(competitionStages, eq(competitionStages.seasonId, competitionSeasons.id))
    .where(eq(competitions.slug, slugForLeague(league)))
    .orderBy(competitionStages.sortOrder)
    .limit(1);
  return row ?? null;
}

const QUEUE_COMPETITIONS: { slug: string; name: string; cohort: string }[] = [
  { slug: "pug-champions", name: "Champions League", cohort: "champions" },
  { slug: "pug-stellaris", name: "Stellaris League", cohort: "stellaris" },
  { slug: "pug-genesis", name: "Genesis League", cohort: "genesis" },
  { slug: "pug-open", name: "Open Queue", cohort: "open" },
];

/** Idempotently create the PUG queue competitions (for fresh environments). */
export async function seedQueueCompetitions(): Promise<void> {
  for (const def of QUEUE_COMPETITIONS) {
    const [existing] = await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, def.slug))
      .limit(1);
    if (existing) continue;

    await db.transaction(async (tx) => {
      const [comp] = await tx
        .insert(competitions)
        .values({
          slug: def.slug,
          name: def.name,
          gameMode: "5v5",
          format: "queue",
          entryType: "open",
          recurrence: "recurring",
          description: "PUG cohort — matchmaker-fed, steal-points seasons.",
        })
        .returning({ id: competitions.id });
      if (!comp) throw new Error("seed: competition insert failed");

      const [season] = await tx
        .insert(competitionSeasons)
        .values({ competitionId: comp.id, seasonNumber: 1, name: "Season 1", status: "live" })
        .returning({ id: competitionSeasons.id });
      if (!season) throw new Error("seed: season insert failed");

      await tx.insert(competitionStages).values({
        seasonId: season.id,
        sortOrder: 0,
        name: "Season 1",
        format: "queue",
        formatConfig: { stealPoints: true, cohort: def.cohort } as never,
        status: "active",
      });
    });
  }
}
