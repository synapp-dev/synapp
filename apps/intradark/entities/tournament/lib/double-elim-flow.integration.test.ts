/**
 * Double-elim flow (integration, n=4): a team that loses in the winners bracket
 * runs back through the losers bracket and wins the grand final. Verifies loser
 * routing WB→LB→GF end to end. Live DB; skipped without DATABASE_URL.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("double-elim flow (integration)", () => {
  let db: typeof import("@/server/db/drizzle").db;
  let schema: typeof import("@/server/db/schema");
  let eq: typeof import("drizzle-orm").eq;
  let and: typeof import("drizzle-orm").and;
  let asc: typeof import("drizzle-orm").asc;
  let createCompetition: typeof import("./service").createCompetition;
  let registerEntrant: typeof import("./service").registerEntrant;
  let generateLeagueSchedule: typeof import("./league").generateLeagueSchedule;
  let playFixture: typeof import("./league").playFixture;
  let finalizeMatch: typeof import("@/entities/match-queue/lib/finalize").finalizeMatch;

  let competitionId: string;
  let seasonId: string;
  let stageId: string;
  const slug = `itest-de-${Date.now()}`;
  const ts = String(Date.now()).slice(-7);
  const sid = (n: number) => `7656660${ts}${String(n).padStart(2, "0")}`;
  const players = [sid(1), sid(2), sid(3), sid(4)];

  const fixBySlot = async (key: string) => {
    const [f] = await db
      .select({
        id: schema.competitionFixtures.id,
        home: schema.competitionFixtures.homeEntrantId,
        away: schema.competitionFixtures.awayEntrantId,
      })
      .from(schema.competitionFixtures)
      .where(
        and(
          eq(schema.competitionFixtures.stageId, stageId),
          eq(schema.competitionFixtures.bracketSlot, key),
        ),
      )
      .limit(1);
    return f!;
  };

  const play = async (key: string, winnerTeam: 1 | 2) => {
    const f = await fixBySlot(key);
    const played = await playFixture(f.id, null);
    await finalizeMatch(played.matchId!, {
      winnerTeam,
      scoreTeam1: winnerTeam === 1 ? 13 : 7,
      scoreTeam2: winnerTeam === 2 ? 13 : 7,
    });
    return f;
  };

  beforeAll(async () => {
    ({ db } = await import("@/server/db/drizzle"));
    schema = await import("@/server/db/schema");
    const drizzle = await import("drizzle-orm");
    eq = drizzle.eq;
    and = drizzle.and;
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
        name: "ITest DE",
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
        stageConfig: { elimination: "double" },
      },
      actor,
    );
    competitionId = created.competitionId;
    seasonId = created.seasonId;
    stageId = created.stageId;

    for (let i = 0; i < players.length; i++) {
      await registerEntrant(
        { seasonId, displayName: `Seed ${i + 1}`, members: [{ steamid64: players[i]!, isCaptain: true }] },
        actor,
      );
    }
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

  it("builds WB(3) + LB(2) + GF(1)", async () => {
    expect((await generateLeagueSchedule(stageId, null)).ok).toBe(true);
    const f = await db
      .select({ bracket: schema.competitionFixtures.bracket })
      .from(schema.competitionFixtures)
      .where(eq(schema.competitionFixtures.stageId, stageId));
    expect(f.filter((x) => x.bracket === "wb")).toHaveLength(3);
    expect(f.filter((x) => x.bracket === "lb")).toHaveLength(2);
    expect(f.filter((x) => x.bracket === "gf")).toHaveLength(1);
  }, 30_000);

  it("a winners-bracket loser wins it all through the losers bracket", async () => {
    // WB round 1: home wins both → seeds 3 & 2 (0-based 2,3-ish) drop to LB.
    await play("wb-1-0", 1);
    await play("wb-1-1", 1);

    // WB final: home wins → the AWAY team drops to the LB final.
    const wbFinal = await fixBySlot("wb-2-0");
    const wbFinalLoser = wbFinal.away;
    await play("wb-2-0", 1);

    // LB round 1: home wins (one team eliminated).
    await play("lb-1-0", 1);

    // LB final: the WB-final loser (away) beats the LB survivor → reaches GF.
    const lbFinal = await fixBySlot("lb-2-0");
    expect(lbFinal.away).toBe(wbFinalLoser); // WB-final loser dropped here
    await play("lb-2-0", 2);

    // Grand final: the losers-bracket team (away) wins it all.
    const gf = await fixBySlot("gf");
    expect(gf.away).toBe(wbFinalLoser);
    await play("gf", 2);

    const standings = await db
      .select({ entrantId: schema.competitionStandings.entrantId, placement: schema.competitionStandings.finalPlacement })
      .from(schema.competitionStandings)
      .where(eq(schema.competitionStandings.stageId, stageId));
    const champ = standings.find((c) => c.placement === 1);
    expect(champ?.entrantId).toBe(wbFinalLoser);
  }, 60_000);
});
