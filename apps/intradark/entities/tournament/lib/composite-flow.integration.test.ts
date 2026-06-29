/**
 * Composite multi-stage (integration): a league group stage → advance top-2 →
 * a playoff bracket seeded with the advancers. Live DB; skipped without DATABASE_URL.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("composite groups → playoffs (integration)", () => {
  let db: typeof import("@/server/db/drizzle").db;
  let schema: typeof import("@/server/db/schema");
  let eq: typeof import("drizzle-orm").eq;
  let asc: typeof import("drizzle-orm").asc;
  let createCompetition: typeof import("./service").createCompetition;
  let registerEntrant: typeof import("./service").registerEntrant;
  let generateLeagueSchedule: typeof import("./league").generateLeagueSchedule;
  let playFixture: typeof import("./league").playFixture;
  let addStage: typeof import("./stages").addStage;
  let advanceStage: typeof import("./stages").advanceStage;
  let finalizeMatch: typeof import("@/entities/match-queue/lib/finalize").finalizeMatch;

  let competitionId: string;
  let seasonId: string;
  let groupStageId: string;
  const slug = `itest-composite-${Date.now()}`;
  const ts = String(Date.now()).slice(-7);
  const sid = (n: number) => `7656550${ts}${String(n).padStart(2, "0")}`;
  const players = [sid(1), sid(2), sid(3), sid(4)];

  beforeAll(async () => {
    ({ db } = await import("@/server/db/drizzle"));
    schema = await import("@/server/db/schema");
    const drizzle = await import("drizzle-orm");
    eq = drizzle.eq;
    asc = drizzle.asc;
    ({ createCompetition, registerEntrant } = await import("./service"));
    ({ generateLeagueSchedule, playFixture } = await import("./league"));
    ({ addStage, advanceStage } = await import("./stages"));
    ({ finalizeMatch } = await import("@/entities/match-queue/lib/finalize"));

    const users = await db.execute<{ id: string }>(
      drizzle.sql`select id from auth.users limit 1`,
    );
    const actor = (users as unknown as { id: string }[])[0]!.id;

    const created = await createCompetition(
      {
        name: "ITest Composite",
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
      },
      actor,
    );
    competitionId = created.competitionId;
    seasonId = created.seasonId;
    groupStageId = created.stageId;

    // Group stage advances its top 2.
    await db
      .update(schema.competitionStages)
      .set({ advancementRule: { topN: 2 } as never })
      .where(eq(schema.competitionStages.id, groupStageId));

    for (let i = 0; i < players.length; i++) {
      await registerEntrant(
        { seasonId, displayName: `Team ${i + 1}`, members: [{ steamid64: players[i]!, isCaptain: true }] },
        actor,
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (competitionId) {
      await db.delete(schema.competitions).where(eq(schema.competitions.id, competitionId));
    }
    for (const p of players) await db.delete(schema.players).where(eq(schema.players.steamid64, p));
  });

  it("plays the group stage, then advances the top 2 into a seeded playoff bracket", async () => {
    // 1) Groups: generate + play every fixture (home wins each).
    expect((await generateLeagueSchedule(groupStageId, null)).ok).toBe(true);
    const groupFixtures = await db
      .select({ id: schema.competitionFixtures.id })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, groupStageId));
    expect(groupFixtures).toHaveLength(6);
    for (const f of groupFixtures) {
      const played = await playFixture(f.id, null);
      await finalizeMatch(played.matchId!, { winnerTeam: 1, scoreTeam1: 13, scoreTeam2: 7 });
    }

    // 2) Add a playoff bracket stage.
    const playoff = await addStage(
      { seasonId, name: "Playoffs", format: "bracket", advancementRule: {} },
      null,
    );
    expect(playoff.ok).toBe(true);

    // Group top 2 (by rank).
    const top = await db
      .select({ entrantId: schema.competitionStandings.entrantId, rank: schema.competitionStandings.rank })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, groupStageId))
      .orderBy(asc(schema.competitionStandings.rank))
      .limit(2);
    const top2 = top.map((t) => t.entrantId);

    // 3) Advance → seeds the playoff stage participants + builds the bracket.
    const adv = await advanceStage(groupStageId, null);
    expect(adv.ok).toBe(true);
    expect(adv.advanced).toBe(2);

    // Playoff stage now has exactly the 2 advancers as participants.
    const participants = await db
      .select({ entrantId: schema.competitionStageEntrants.entrantId })
      .from(schema.competitionStageEntrants)
      .where(eq(schema.competitionStageEntrants.stageId, playoff.stageId!));
    expect(participants.map((p) => p.entrantId).sort()).toEqual([...top2].sort());

    // Bracket of 2 = a single final containing both advancers.
    const playoffFixtures = await db
      .select({
        id: schema.competitionFixtures.id,
        home: schema.competitionFixtures.homeEntrantId,
        away: schema.competitionFixtures.awayEntrantId,
      })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, playoff.stageId!));
    expect(playoffFixtures).toHaveLength(1);
    const final = playoffFixtures[0]!;
    expect([final.home, final.away].sort()).toEqual([...top2].sort());

    // 4) Play the final → champion crowned.
    const playedFinal = await playFixture(final.id, null);
    await finalizeMatch(playedFinal.matchId!, { winnerTeam: 1, scoreTeam1: 13, scoreTeam2: 9 });
    const champ = await db
      .select({ entrantId: schema.competitionStandings.entrantId, placement: schema.competitionStandings.finalPlacement })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, playoff.stageId!));
    expect(champ.find((c) => c.placement === 1)?.entrantId).toBe(final.home);
  }, 60_000);
});
