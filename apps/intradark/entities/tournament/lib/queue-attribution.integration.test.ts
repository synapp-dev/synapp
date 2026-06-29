/**
 * Integration test: a queue (PUG) match attributed to a league season accrues
 * steal-points standings + Elo via finalizeMatch. Runs against the live DB using
 * the seeded `pug-champions` competition. Skipped if no DATABASE_URL.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("queue steal-points attribution (integration)", () => {
  let db: typeof import("@/server/db/drizzle").db;
  let schema: typeof import("@/server/db/schema");
  let eq: typeof import("drizzle-orm").eq;
  let inArray: typeof import("drizzle-orm").inArray;
  let getQueueSeasonStage: typeof import("./queue-attribution").getQueueSeasonStage;
  let finalizeMatch: typeof import("@/entities/match-queue/lib/finalize").finalizeMatch;

  const ts = String(Date.now()).slice(-7);
  const sid = (n: number) => `7656220${ts}${String(n).padStart(2, "0")}`;
  const winners = [sid(1), sid(2)];
  const losers = [sid(3), sid(4)];
  const all = [...winners, ...losers];
  let matchId: string;
  let stageId: string;

  beforeAll(async () => {
    ({ db } = await import("@/server/db/drizzle"));
    schema = await import("@/server/db/schema");
    const drizzle = await import("drizzle-orm");
    eq = drizzle.eq;
    inArray = drizzle.inArray;
    ({ getQueueSeasonStage } = await import("./queue-attribution"));
    ({ finalizeMatch } = await import("@/entities/match-queue/lib/finalize"));

    const attribution = await getQueueSeasonStage("champions");
    if (!attribution) throw new Error("pug-champions not seeded");
    stageId = attribution.stageId;

    for (const s of all) {
      await db.insert(schema.players).values({ steamid64: s }).onConflictDoNothing();
    }

    const [m] = await db
      .insert(schema.matches)
      .values({
        league: "champions",
        status: "configuring",
        matchSource: "queue",
        seasonId: attribution.seasonId,
        stageId: attribution.stageId,
      })
      .returning({ id: schema.matches.id });
    matchId = m!.id;

    await db.insert(schema.matchPlayers).values([
      ...winners.map((s) => ({ matchId, steamid64: s, team: 1 })),
      ...losers.map((s) => ({ matchId, steamid64: s, team: 2 })),
    ]);
  }, 30_000);

  afterAll(async () => {
    if (matchId) await db.delete(schema.matches).where(eq(schema.matches.id, matchId));
    // Deleting players cascades player_ratings + competition_standings rows.
    await db.delete(schema.players).where(inArray(schema.players.steamid64, all));
  });

  it("awards steal points (+8 winners / -2 losers at margin 7) and Elo", async () => {
    const summary = await finalizeMatch(matchId, {
      winnerTeam: 1,
      scoreTeam1: 13,
      scoreTeam2: 6,
      map: "de_inferno",
    });
    expect(summary.ok).toBe(true);

    const standings = await db
      .select({
        steamid64: schema.competitionStandings.steamid64,
        points: schema.competitionStandings.points,
        rank: schema.competitionStandings.rank,
      })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, stageId));
    const byPlayer = new Map(standings.map((s) => [s.steamid64, s]));

    for (const w of winners) expect(Number(byPlayer.get(w)!.points)).toBe(8);
    for (const l of losers) expect(Number(byPlayer.get(l)!.points)).toBe(-2);

    // Winners outrank losers on the leaderboard.
    for (const w of winners)
      for (const l of losers)
        expect(byPlayer.get(w)!.rank!).toBeLessThan(byPlayer.get(l)!.rank!);

    const ratings = await db
      .select({ steamid64: schema.playerRatings.steamid64, rating: schema.playerRatings.rating })
      .from(schema.playerRatings)
      .where(inArray(schema.playerRatings.steamid64, all));
    const r = new Map(ratings.map((x) => [x.steamid64, x.rating]));
    for (const w of winners) expect(r.get(w)!).toBeGreaterThan(1000);
    for (const l of losers) expect(r.get(l)!).toBeLessThan(1000);
  }, 30_000);
});
