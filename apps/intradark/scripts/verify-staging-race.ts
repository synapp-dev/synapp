/**
 * Reproduces the duplicate-channel race: drive a match into `staging` with no channels
 * yet, then fire many concurrent startStaging() calls (what the /stage poll does). The
 * atomic claim must let exactly ONE call reach the bot → one channel pair.
 *
 * Run: pnpm --filter intradark exec dotenv -e .env.local -- tsx --tsconfig tsconfig.verify.json scripts/verify-staging-race.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { matches, players, queueEntries } from "@/server/db/schema";
import { setAcceptDecision } from "@/entities/match-queue/lib/accept";
import { startStaging } from "@/entities/match-queue/lib/staging";
import {
  SIM_BOT_STEAMIDS,
  queueBots,
  resetSim,
  setBotDecisions,
} from "@/entities/match-queue/lib/sim";

const USER = "76561197998479808";
const LEAGUE = "champions" as const;
const BOTS = SIM_BOT_STEAMIDS.slice(0, 9);

async function main() {
  await resetSim(USER);
  await db.update(queueEntries).set({ status: "cancelled" })
    .where(and(eq(queueEntries.league, LEAGUE), eq(queueEntries.status, "searching")));
  await db.insert(players).values({ steamid64: USER }).onConflictDoNothing();
  await db.insert(queueEntries).values({ steamid64: USER, league: LEAGUE, status: "searching", rating: 1500 });
  const { matchId } = await queueBots(LEAGUE, BOTS);
  if (!matchId) throw new Error("no match");
  await setBotDecisions(matchId, BOTS, []);
  await setAcceptDecision(matchId, USER, "accept");

  // Put it in staging with names but NO channels, then race the poll.
  await db.update(matches).set({
    status: "staging",
    team1Name: "Echo",
    team2Name: "Sentinel",
    discordTeam1ChannelId: null,
    discordTeam2ChannelId: null,
    stagingDeadline: new Date(Date.now() + 120_000).toISOString(),
  }).where(eq(matches.id, matchId));

  await Promise.all(Array.from({ length: 6 }, () => startStaging(matchId)));

  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  console.log("MATCH_ID=" + matchId);
  console.log("TEAM1_CH=" + m?.discordTeam1ChannelId);
  console.log("TEAM2_CH=" + m?.discordTeam2ChannelId);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
