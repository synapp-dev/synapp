/**
 * Match-pop countdown engine. A `direct`/`match` job carries {match_id, steamid64,
 * accept_deadline}. We DM the player a "match found" alert, then a couple of urgency
 * pings (Steam DMs can't be edited, so it's repeated messages — kept to ~3 total),
 * stopping the instant they're no longer `pending` (accepted/declined on Steam OR
 * on-site, or the match resolved). All sends use the match priority lane.
 */

import { BotDb, type DmJob } from "./db.js";
import { Sender, PRIORITY_MATCH, sleep } from "./sender.js";
import * as msg from "./messages.js";

export interface CountdownDeps {
  db: BotDb;
  sender: Sender;
}

// Seconds-remaining checkpoints for the urgency pings (after the initial alert).
const PING_CHECKPOINTS = [15, 5];

export async function runMatchCountdown(deps: CountdownDeps, job: DmJob): Promise<void> {
  const { db, sender } = deps;
  const matchId = String(job.payload.match_id ?? "");
  const steamid64 = job.steamid64 ?? String(job.payload.steamid64 ?? "");
  const deadlineIso = String(job.payload.accept_deadline ?? "");
  if (!matchId || !steamid64 || !deadlineIso) {
    throw new Error("match job missing match_id/steamid64/accept_deadline");
  }

  // Respect friendship + notify_match at send time.
  if (!(await db.isEligible(steamid64, "notify_match"))) return;

  const deadline = new Date(deadlineIso).getTime();
  const secsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000));
  if (secsLeft <= 0) return; // window already gone

  // Initial alert.
  await sender.enqueue(steamid64, msg.matchFound(secsLeft), PRIORITY_MATCH);
  await db.recordDelivery(job.id, steamid64);

  // Urgency pings, each gated on the player still being pending.
  for (const cp of PING_CHECKPOINTS) {
    const fireAt = deadline - cp * 1000;
    const wait = fireAt - Date.now();
    if (wait < 250) continue; // checkpoint already passed
    await sleep(wait);

    const state = await db.acceptState(matchId, steamid64);
    if (isTerminal(state)) {
      await sender.enqueue(steamid64, terminalLine(state), PRIORITY_MATCH);
      return;
    }
    await sender.enqueue(steamid64, msg.matchPing(cp), PRIORITY_MATCH);
  }

  // Final outcome at the deadline.
  const tail = deadline - Date.now();
  if (tail > 0) await sleep(tail);
  // Give the resolver a beat to flip statuses.
  await sleep(1200);
  const finalState = await db.acceptState(matchId, steamid64);
  await sender.enqueue(steamid64, terminalLine(finalState), PRIORITY_MATCH);
}

function isTerminal(state: {
  matchStatus: string | null;
  playerStatus: string | null;
}): boolean {
  if (state.playerStatus && state.playerStatus !== "pending") return true;
  if (state.matchStatus && state.matchStatus !== "pending_accept") return true;
  return false;
}

function terminalLine(state: {
  matchStatus: string | null;
  playerStatus: string | null;
}): string {
  if (state.playerStatus === "accepted") {
    return state.matchStatus === "cancelled" ? msg.matchCancelled() : msg.matchAccepted();
  }
  if (state.playerStatus === "declined") return msg.matchDeclined();
  if (state.playerStatus === "timeout") return msg.matchExpired();
  // Player still pending but the match moved on (someone else dodged) → cancelled;
  // otherwise the window simply expired.
  if (state.matchStatus === "cancelled") return msg.matchCancelled();
  return msg.matchExpired();
}
