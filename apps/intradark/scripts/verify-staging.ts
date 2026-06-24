/**
 * Verifies §5/§6 staging against the live DB: accept → accepted → staging (team names
 * generated, queue entries cleared, Discord channel attempt) → all join → configuring.
 *
 * Run: pnpm --filter intradark exec dotenv -e .env.local -- tsx --tsconfig tsconfig.verify.json scripts/verify-staging.ts
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { matchPlayers, matches, players, queueEntries } from "@/server/db/schema";
import { setAcceptDecision } from "@/entities/match-queue/lib/accept";
import { resolveStaging, startStaging } from "@/entities/match-queue/lib/staging";
import {
  SIM_BOT_STEAMIDS,
  queueBots,
  resetSim,
  setBotDecisions,
} from "@/entities/match-queue/lib/sim";

const USER = "76561197998479808";
const LEAGUE = "champions" as const;
const BOTS = SIM_BOT_STEAMIDS.slice(0, 9);

let pass = 0;
let fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const status = async (id: string) =>
  (await db.select().from(matches).where(eq(matches.id, id)).limit(1))[0];

async function main() {
  await resetSim(USER);
  await db.update(queueEntries).set({ status: "cancelled" })
    .where(and(eq(queueEntries.league, LEAGUE), eq(queueEntries.status, "searching")));
  await db.insert(players).values({ steamid64: USER }).onConflictDoNothing();
  await db.insert(queueEntries).values({ steamid64: USER, league: LEAGUE, status: "searching", rating: 1500 });
  const { matchId } = await queueBots(LEAGUE, BOTS);
  if (!matchId) throw new Error("no match formed");

  console.log("Accept → accepted");
  await setBotDecisions(matchId, BOTS, []);
  await setAcceptDecision(matchId, USER, "accept");
  check("status = accepted", (await status(matchId))?.status === "accepted");

  console.log("\nstartStaging → staging");
  await startStaging(matchId);
  const m = await status(matchId);
  check("status = staging", m?.status === "staging");
  check("team1Name generated", Boolean(m?.team1Name));
  check("team2Name generated", Boolean(m?.team2Name));
  check("team names differ", m?.team1Name !== m?.team2Name);
  check("staging deadline set", Boolean(m?.stagingDeadline));
  const activeQ = await db.select().from(queueEntries)
    .where(and(inArray(queueEntries.steamid64, [USER, ...BOTS]), inArray(queueEntries.status, ["searching", "matched"])));
  check("roster queue entries cleared", activeQ.length === 0);
  console.log(`  · team names: ${m?.team1Name} vs ${m?.team2Name}`);
  console.log(`  · discord channels: ${m?.discordTeam1ChannelId ? "created (bot up)" : "none (bot down — expected)"}`);

  console.log("\nDiscord joins → configuring");
  // Not all joined yet → stays staging.
  await db.update(matchPlayers).set({ discordJoined: true })
    .where(and(eq(matchPlayers.matchId, matchId), inArray(matchPlayers.steamid64, BOTS.slice(0, 5))));
  await resolveStaging(matchId);
  check("still staging (partial joins)", (await status(matchId))?.status === "staging");
  // Everyone joins → configuring.
  await db.update(matchPlayers).set({ discordJoined: true })
    .where(eq(matchPlayers.matchId, matchId));
  await resolveStaging(matchId);
  check("status = configuring (all joined)", (await status(matchId))?.status === "configuring");

  // Clean up.
  await db.update(matches).set({ status: "cancelled", cancelReason: "verify_cleanup" }).where(eq(matches.id, matchId));
  await resetSim(USER);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
