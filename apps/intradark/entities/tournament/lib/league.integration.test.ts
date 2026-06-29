/**
 * League: pure round-robin pairing checks + a live-DB flow (generate schedule →
 * play a fixture → finalize → table recompute). Skipped if no DATABASE_URL.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { roundRobinPairings } from "./formats/round-robin";

config({ path: ".env.local" });

describe("roundRobinPairings (pure)", () => {
  it("single round-robin: every pair once", () => {
    const ids = ["a", "b", "c", "d"];
    const p = roundRobinPairings(ids, false);
    expect(p).toHaveLength(6); // C(4,2)
    const pairs = new Set(p.map((m) => [m.home, m.away].sort().join("-")));
    expect(pairs.size).toBe(6);
    expect(Math.max(...p.map((m) => m.round))).toBe(3);
  });

  it("odd field gets byes (3 teams → 3 matches)", () => {
    const p = roundRobinPairings(["a", "b", "c"], false);
    expect(p).toHaveLength(3);
  });

  it("double round-robin doubles the fixtures", () => {
    expect(roundRobinPairings(["a", "b", "c", "d"], true)).toHaveLength(12);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("league flow (integration)", () => {
  let db: typeof import("@/server/db/drizzle").db;
  let schema: typeof import("@/server/db/schema");
  let eq: typeof import("drizzle-orm").eq;
  let asc: typeof import("drizzle-orm").asc;
  let createCompetition: typeof import("./service").createCompetition;
  let registerEntrant: typeof import("./service").registerEntrant;
  let generateLeagueSchedule: typeof import("./league").generateLeagueSchedule;
  let playFixture: typeof import("./league").playFixture;
  let finalizeMatch: typeof import("@/entities/match-queue/lib/finalize").finalizeMatch;

  let competitionId: string;
  let seasonId: string;
  let stageId: string;
  const slug = `itest-league-${Date.now()}`;
  const ts = String(Date.now()).slice(-7);
  const sid = (n: number) => `7656330${ts}${String(n).padStart(2, "0")}`;
  const players = [sid(1), sid(2), sid(3), sid(4)];
  const entrantIds: string[] = [];

  beforeAll(async () => {
    ({ db } = await import("@/server/db/drizzle"));
    schema = await import("@/server/db/schema");
    const drizzle = await import("drizzle-orm");
    eq = drizzle.eq;
    asc = drizzle.asc;
    ({ createCompetition, registerEntrant } = await import("./service"));
    ({ generateLeagueSchedule, playFixture } = await import("./league"));
    ({ finalizeMatch } = await import("@/entities/match-queue/lib/finalize"));

    const users = await db.execute<{ id: string }>(
      drizzle.sql`select id from auth.users limit 1`,
    );
    const actor = (users as unknown as { id: string }[])[0]!.id;

    const created = await createCompetition(
      {
        name: "ITest League",
        slug,
        gameMode: "1v1",
        format: "league",
        entryType: "open",
        recurrence: "one_shot",
        branding: {},
        season: {
          checkInRequired: false,
          eligibilityRules: {},
          mapPool: [],
          matchDefaults: {},
          fundingSource: "internal",
        },
        stageConfig: { roundRobin: "single", pointsWin: 3, pointsDraw: 1, pointsLoss: 0 },
      },
      actor,
    );
    competitionId = created.competitionId;
    seasonId = created.seasonId;
    stageId = created.stageId;

    for (let i = 0; i < players.length; i++) {
      const r = await registerEntrant(
        { seasonId, displayName: `Team ${i + 1}`, members: [{ steamid64: players[i]!, isCaptain: true }] },
        actor,
      );
      entrantIds.push(r.entrantId);
    }
  }, 30_000);

  afterAll(async () => {
    if (competitionId) {
      await db.delete(schema.competitions).where(eq(schema.competitions.id, competitionId));
    }
    for (const s of players) await db.delete(schema.players).where(eq(schema.players.steamid64, s));
  });

  it("generates a 6-fixture single round-robin", async () => {
    const res = await generateLeagueSchedule(stageId, null);
    expect(res.ok).toBe(true);
    const fixtures = await db
      .select({ id: schema.competitionFixtures.id })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, stageId));
    expect(fixtures).toHaveLength(6);
  }, 30_000);

  it("playing + finalizing a fixture updates the table", async () => {
    const [fixture] = await db
      .select({ id: schema.competitionFixtures.id, home: schema.competitionFixtures.homeEntrantId })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, stageId))
      .orderBy(asc(schema.competitionFixtures.round))
      .limit(1);

    const played = await playFixture(fixture!.id, null);
    expect(played.ok).toBe(true);

    await finalizeMatch(played.matchId!, { winnerTeam: 1, scoreTeam1: 13, scoreTeam2: 7 });

    const standings = await db
      .select({
        entrantId: schema.competitionStandings.entrantId,
        points: schema.competitionStandings.points,
        rank: schema.competitionStandings.rank,
      })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, stageId));
    const byEntrant = new Map(standings.map((s) => [s.entrantId, s]));

    // Home entrant won → 3 pts, rank 1.
    const winner = byEntrant.get(fixture!.home!);
    expect(Number(winner!.points)).toBe(3);
    expect(winner!.rank).toBe(1);
    // All 4 entrants have a standings row.
    expect(standings).toHaveLength(4);
  }, 30_000);
});
