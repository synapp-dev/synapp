/**
 * End-to-end verification of the PUG accept/ready-check loop against the live DB,
 * calling the SAME functions the API routes call. Drives every scenario:
 *   A. everyone accepts            → match accepted
 *   B. you accept, 2 bots decline  → cancelled, decliners cooled down, you requeued
 *   C. bots accept, you decline    → cancelled, YOU cooled down
 *   D. accept window times out     → cancelled, the no-show cooled down
 *
 * Run: pnpm --filter intradark exec dotenv -e .env.local -- tsx scripts/verify-pug-sim.ts
 */
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { matchPlayers, matches, players, queueEntries } from "@/server/db/schema";
import {
  getMatchView,
  resolveAcceptPhase,
  setAcceptDecision,
} from "@/entities/match-queue/lib/accept";
import { getActiveCooldownUntil } from "@/entities/match-queue/lib/queries";
import {
  SIM_BOT_STEAMIDS,
  queueBots,
  resetSim,
  setBotDecisions,
} from "@/entities/match-queue/lib/sim";

const USER = "76561197998479808"; // jourdain (real linked user)
const LEAGUE = "champions" as const;
const BOTS = SIM_BOT_STEAMIDS.slice(0, 9);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
  }
}

/** Clean slate + put the user in queue, then trickle the 9 bots in to pop a match. */
async function freshMatch(): Promise<string> {
  await resetSim(USER);
  // Also clear any other champions searchers so tryFormMatch only grabs our 10.
  await db
    .update(queueEntries)
    .set({ status: "cancelled" })
    .where(and(eq(queueEntries.league, LEAGUE), eq(queueEntries.status, "searching")));
  await db
    .insert(players)
    .values({ steamid64: USER })
    .onConflictDoNothing();
  await db
    .insert(queueEntries)
    .values({ steamid64: USER, league: LEAGUE, status: "searching", rating: 1500 });
  const { matchId } = await queueBots(LEAGUE, BOTS);
  if (!matchId) throw new Error("match did not form (expected 10 in pool)");
  return matchId;
}

async function matchStatus(id: string) {
  const [m] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return m;
}
async function userQueueStatus() {
  const [q] = await db
    .select()
    .from(queueEntries)
    .where(eq(queueEntries.steamid64, USER))
    .orderBy(desc(queueEntries.updatedAt));
  return q?.status;
}

async function main() {
  console.log("Scenario A — everyone accepts");
  {
    const id = await freshMatch();
    const view = await getMatchView(id, USER);
    check("match formed with 10 players", view?.counts.total === 10);
    check("you are on a team", view?.you?.team === 1 || view?.you?.team === 2);
    check(
      "roster carries names + avatars",
      Boolean(view?.roster.every((r) => r.name) &&
        view?.roster.some((r) => r.avatarUrl?.includes("/players/pro/"))),
    );
    await setBotDecisions(id, BOTS, []);
    await setAcceptDecision(id, USER, "accept");
    const m = await matchStatus(id);
    check("match status = accepted", m?.status === "accepted");
    check("you have no cooldown", (await getActiveCooldownUntil(USER)) === null);
  }

  console.log("\nScenario B — you accept, 2 bots decline");
  {
    const id = await freshMatch();
    await setAcceptDecision(id, USER, "accept");
    const decliners = BOTS.slice(0, 2);
    const accepters = BOTS.slice(2);
    await setBotDecisions(id, accepters, decliners);
    const m = await matchStatus(id);
    check("match status = cancelled", m?.status === "cancelled");
    check("cancel reason = accept_failed", m?.cancelReason === "accept_failed");
    const d0 = await getActiveCooldownUntil(decliners[0]!);
    const d1 = await getActiveCooldownUntil(decliners[1]!);
    check("decliner #1 cooled down", d0 !== null);
    check("decliner #2 cooled down", d1 !== null);
    check("YOU have no cooldown (you accepted)", (await getActiveCooldownUntil(USER)) === null);
    check("you were returned to the queue", (await userQueueStatus()) === "searching");
  }

  console.log("\nScenario C — bots accept, you decline");
  {
    const id = await freshMatch();
    await setBotDecisions(id, BOTS, []);
    let m = await matchStatus(id);
    check("still pending while you decide", m?.status === "pending_accept");
    await setAcceptDecision(id, USER, "decline");
    m = await matchStatus(id);
    check("match status = cancelled", m?.status === "cancelled");
    check("YOU are cooled down (you dodged)", (await getActiveCooldownUntil(USER)) !== null);
    check(
      "a bot accepter was requeued",
      (
        await db
          .select()
          .from(queueEntries)
          .where(and(eq(queueEntries.steamid64, BOTS[0]!), eq(queueEntries.status, "searching")))
      ).length === 1,
    );
  }

  console.log("\nScenario D — accept window times out");
  {
    const id = await freshMatch();
    await setAcceptDecision(id, USER, "accept");
    // All bots but one accept; force the deadline into the past.
    await setBotDecisions(id, BOTS.slice(1), []);
    await db
      .update(matches)
      .set({ acceptDeadline: new Date(Date.now() - 1000).toISOString() })
      .where(eq(matches.id, id));
    await resolveAcceptPhase(id);
    const m = await matchStatus(id);
    check("match status = cancelled", m?.status === "cancelled");
    const [noShow] = await db
      .select()
      .from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, id), eq(matchPlayers.steamid64, BOTS[0]!)));
    check("no-show marked timeout", noShow?.acceptStatus === "timeout");
    check("no-show cooled down", (await getActiveCooldownUntil(BOTS[0]!)) !== null);
  }

  console.log("\nScenario E — cooldown blocks a fresh decision write");
  {
    // From D, BOTS[0] is on cooldown. Verify getActiveCooldownUntil reflects it,
    // which is exactly what eligibility (§2) gates a re-queue on.
    const until = await getActiveCooldownUntil(BOTS[0]!);
    check("cooldown has a future expiry", until !== null && until.getTime() > Date.now());
  }

  // Leave the DB clean.
  await resetSim(USER);
  await db
    .update(queueEntries)
    .set({ status: "cancelled" })
    .where(and(eq(queueEntries.league, LEAGUE), eq(queueEntries.status, "searching")));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
