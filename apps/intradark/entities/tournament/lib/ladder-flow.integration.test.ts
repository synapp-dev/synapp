/**
 * Integration test for the ladder vertical slice against the live DB.
 * Proves: challenge → accept → finalizeMatch → swap + Elo + standings.
 * Creates an isolated competition and tears it down. Skipped if no DATABASE_URL.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("ladder vertical slice (integration)", () => {
  let db: typeof import("@/server/db/drizzle").db;
  let schema: typeof import("@/server/db/schema");
  let eq: typeof import("drizzle-orm").eq;
  let createCompetition: typeof import("./service").createCompetition;
  let registerEntrant: typeof import("./service").registerEntrant;
  let createChallenge: typeof import("./challenge").createChallenge;
  let acceptChallenge: typeof import("./challenge").acceptChallenge;
  let finalizeMatch: typeof import("@/entities/match-queue/lib/finalize").finalizeMatch;

  let competitionId: string;
  let seasonId: string;
  let stageId: string;
  const slug = `itest-ladder-${Date.now()}`;
  // Distinct 17-digit steamid64s: "7656119" + 7 ts digits + 3 index digits.
  const SID = (n: number) =>
    `7656119${String(Date.now()).slice(-7)}${String(n).padStart(3, "0")}`;
  const alpha = [SID(1), SID(2)];
  const bravo = [SID(3), SID(4)];
  let alphaEntrant: string;
  let bravoEntrant: string;

  let actorUserId: string;

  beforeAll(async () => {
    ({ db } = await import("@/server/db/drizzle"));
    schema = await import("@/server/db/schema");
    const drizzle = await import("drizzle-orm");
    eq = drizzle.eq;
    ({ createCompetition, registerEntrant } = await import("./service"));
    ({ createChallenge, acceptChallenge } = await import("./challenge"));
    ({ finalizeMatch } = await import("@/entities/match-queue/lib/finalize"));

    // created_by FKs to auth.users — use a real account.
    const users = await db.execute<{ id: string }>(
      drizzle.sql`select id from auth.users limit 1`,
    );
    actorUserId = (users as unknown as { id: string }[])[0]!.id;

    const created = await createCompetition(
      {
        name: "ITest Ladder",
        slug,
        gameMode: "2v2",
        format: "ladder",
        entryType: "open",
        recurrence: "recurring",
        branding: {},
        season: {
          checkInRequired: false,
          eligibilityRules: {},
          mapPool: [],
          matchDefaults: {},
          fundingSource: "internal",
        },
      },
      actorUserId,
    );
    competitionId = created.competitionId;
    seasonId = created.seasonId;
    stageId = created.stageId;

    // Alpha registers first → rank 1; Bravo second → rank 2.
    const a = await registerEntrant(
      { seasonId, displayName: "Alpha", members: alpha.map((s, i) => ({ steamid64: s, isCaptain: i === 0 })) },
      null,
    );
    const b = await registerEntrant(
      { seasonId, displayName: "Bravo", members: bravo.map((s, i) => ({ steamid64: s, isCaptain: i === 0 })) },
      null,
    );
    alphaEntrant = a.entrantId;
    bravoEntrant = b.entrantId;
  }, 30_000);

  afterAll(async () => {
    if (competitionId) {
      await db.delete(schema.competitions).where(eq(schema.competitions.id, competitionId));
    }
    // Clean the throwaway players we created.
    for (const s of [...alpha, ...bravo]) {
      await db.delete(schema.players).where(eq(schema.players.steamid64, s));
    }
  });

  it("seeds ranks bottom-up", async () => {
    const rows = await db
      .select({ id: schema.competitionEntrants.id, rank: schema.competitionEntrants.ladderRank })
      .from(schema.competitionEntrants)
      .where(eq(schema.competitionEntrants.seasonId, seasonId));
    const byId = new Map(rows.map((r) => [r.id, r.rank]));
    expect(byId.get(alphaEntrant)).toBe(1);
    expect(byId.get(bravoEntrant)).toBe(2);
  });

  it("rank 2 challenges rank 1, wins, and swaps to rank 1 with Elo applied", async () => {
    // Bravo (rank 2) challenges Alpha (rank 1) — gap 1, up, within ±3.
    const ch = await createChallenge(stageId, bravoEntrant, alphaEntrant, null);
    expect(ch.ok).toBe(true);

    const accepted = await acceptChallenge(ch.challengeId!, null);
    expect(accepted.ok).toBe(true);
    const matchId = accepted.matchId!;

    // Bravo is home (challenger) = team 1. Bravo wins.
    const summary = await finalizeMatch(matchId, {
      winnerTeam: 1,
      scoreTeam1: 13,
      scoreTeam2: 8,
      map: "de_mirage",
    });
    expect(summary.ok).toBe(true);

    // Positions swapped: Bravo now 1, Alpha now 2.
    const rows = await db
      .select({ id: schema.competitionEntrants.id, rank: schema.competitionEntrants.ladderRank })
      .from(schema.competitionEntrants)
      .where(eq(schema.competitionEntrants.seasonId, seasonId));
    const byId = new Map(rows.map((r) => [r.id, r.rank]));
    expect(byId.get(bravoEntrant)).toBe(1);
    expect(byId.get(alphaEntrant)).toBe(2);

    // Elo applied: Bravo's members gained, Alpha's lost.
    const ratings = await db
      .select({ steamid64: schema.playerRatings.steamid64, rating: schema.playerRatings.rating })
      .from(schema.playerRatings);
    const byPlayer = new Map(ratings.map((r) => [r.steamid64, r.rating]));
    expect(byPlayer.get(bravo[0]!)!).toBeGreaterThan(1000);
    expect(byPlayer.get(alpha[0]!)!).toBeLessThan(1000);

    // Standings reflect the new ladder order.
    const standings = await db
      .select({ entrantId: schema.competitionStandings.entrantId, rank: schema.competitionStandings.rank })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, stageId));
    const sByEntrant = new Map(standings.map((s) => [s.entrantId, s.rank]));
    expect(sByEntrant.get(bravoEntrant)).toBe(1);
    expect(sByEntrant.get(alphaEntrant)).toBe(2);
  }, 30_000);
});
