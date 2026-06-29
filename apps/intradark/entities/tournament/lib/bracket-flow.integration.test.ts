/**
 * Bracket flow (integration): generate a 4-entrant single-elim, play both semis,
 * verify winners auto-advance into the final, then crown a champion. Live DB.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("bracket flow (integration)", () => {
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
  const slug = `itest-bracket-${Date.now()}`;
  const ts = String(Date.now()).slice(-7);
  const sid = (n: number) => `7656440${ts}${String(n).padStart(2, "0")}`;
  const players = [sid(1), sid(2), sid(3), sid(4)];

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
        name: "ITest Bracket",
        slug,
        gameMode: "1v1",
        format: "bracket",
        entryType: "invite_only",
        recurrence: "one_shot",
        branding: {},
        season: {
          checkInRequired: false,
          eligibilityRules: {},
          mapPool: [],
          matchDefaults: {},
          fundingSource: "internal",
        },
        stageConfig: { elimination: "single" },
      },
      actor,
    );
    competitionId = created.competitionId;
    seasonId = created.seasonId;
    stageId = created.stageId;

    // Seed in order → seeds 1..4.
    for (let i = 0; i < players.length; i++) {
      await registerEntrant(
        { seasonId, displayName: `Seed ${i + 1}`, members: [{ steamid64: players[i]!, isCaptain: true }] },
        actor,
      );
    }
    // Assign explicit seeds by registration order.
    const ents = await db
      .select({ id: schema.competitionEntrants.id })
      .from(schema.competitionEntrants)
      .where(eq(schema.competitionEntrants.seasonId, seasonId))
      .orderBy(asc(schema.competitionEntrants.createdAt));
    let s = 1;
    for (const e of ents) {
      await db
        .update(schema.competitionEntrants)
        .set({ seed: s++ })
        .where(eq(schema.competitionEntrants.id, e.id));
    }
  }, 30_000);

  afterAll(async () => {
    if (competitionId) {
      await db.delete(schema.competitions).where(eq(schema.competitions.id, competitionId));
    }
    for (const p of players) await db.delete(schema.players).where(eq(schema.players.steamid64, p));
  });

  it("builds 2 semis + a final", async () => {
    expect((await generateLeagueSchedule(stageId, null)).ok).toBe(true);
    const fixtures = await db
      .select({ round: schema.competitionFixtures.round })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, stageId));
    expect(fixtures.filter((f) => f.round === 1)).toHaveLength(2);
    expect(fixtures.filter((f) => f.round === 2)).toHaveLength(1);
  }, 30_000);

  it("winners auto-advance into the final and a champion is crowned", async () => {
    const semis = await db
      .select({
        id: schema.competitionFixtures.id,
        home: schema.competitionFixtures.homeEntrantId,
      })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, stageId))
      .orderBy(asc(schema.competitionFixtures.round), asc(schema.competitionFixtures.bracketSlot));

    const semiFixtures = semis.slice(0, 2);
    const expectedFinalists: string[] = [];
    for (const semi of semiFixtures) {
      const played = await playFixture(semi.id, null);
      expect(played.ok).toBe(true);
      // home (higher seed) wins each semi.
      await finalizeMatch(played.matchId!, { winnerTeam: 1, scoreTeam1: 13, scoreTeam2: 5 });
      expectedFinalists.push(semi.home!);
    }

    // The final now has both semi winners.
    const [final] = await db
      .select({
        id: schema.competitionFixtures.id,
        home: schema.competitionFixtures.homeEntrantId,
        away: schema.competitionFixtures.awayEntrantId,
      })
      .from(schema.competitionFixtures)
      .where(
        eq(schema.competitionFixtures.stageId, stageId),
      )
      .orderBy(asc(schema.competitionFixtures.round))
      .limit(3);
    const finalFixture = (
      await db
        .select({
          id: schema.competitionFixtures.id,
          home: schema.competitionFixtures.homeEntrantId,
          away: schema.competitionFixtures.awayEntrantId,
          round: schema.competitionFixtures.round,
        })
        .from(schema.competitionFixtures)
        .where(eq(schema.competitionFixtures.stageId, stageId))
    ).find((f) => f.round === 2)!;
    void final;
    expect(finalFixture.home).not.toBeNull();
    expect(finalFixture.away).not.toBeNull();
    expect(expectedFinalists).toContain(finalFixture.home);
    expect(expectedFinalists).toContain(finalFixture.away);

    const playedFinal = await playFixture(finalFixture.id, null);
    await finalizeMatch(playedFinal.matchId!, { winnerTeam: 1, scoreTeam1: 13, scoreTeam2: 11 });

    // Champion = final home, placement 1.
    const standings = await db
      .select({
        entrantId: schema.competitionStandings.entrantId,
        placement: schema.competitionStandings.finalPlacement,
      })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, stageId));
    const champ = standings.find((s) => s.placement === 1);
    expect(champ?.entrantId).toBe(finalFixture.home);
  }, 30_000);
});
