import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { botStartMatch } from "@/lib/discord-bot-client";
import { db } from "@/server/db/drizzle";
import {
  matchPlayers,
  matches,
  players,
  queueEntries,
  userProfiles,
} from "@/server/db/schema";

import { CHANNEL_CLAIM_SENTINEL } from "./staging-constants";
import { teamNamesForSeq } from "./team-names";

/**
 * §5 team allocation (names) + §6 Join-Discord phase. Runs after §4 accept leaves a
 * match `accepted`. Idempotent and safe to call on every match-page load:
 *   1. accepted → staging: stamp generated team names + a 120s staging deadline.
 *   2. once in staging (and channels not yet made): ask the Discord bot to create the
 *      Team A/B voice channels and prime lobby auto-move; persist the channel ids.
 * The bot call is best-effort — if it's down the phase still proceeds without Discord
 * routing (so the sim and UI keep working).
 */

const STAGING_WINDOW_SECONDS = 120;

export async function startStaging(matchId: string): Promise<{ status: string }> {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m) return { status: "not_found" };
  // Nothing to stage before accept or after cancel.
  if (m.status === "pending_accept" || m.status === "cancelled") {
    return { status: m.status };
  }

  let { team1Name, team2Name } = m;

  if (m.status === "accepted") {
    if (!team1Name || !team2Name) {
      const names = teamNamesForSeq(m.seq);
      team1Name = names.team1;
      team2Name = names.team2;
    }
    await db
      .update(matches)
      .set({
        status: "staging",
        team1Name,
        team2Name,
        stagingDeadline: new Date(
          Date.now() + STAGING_WINDOW_SECONDS * 1000,
        ).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(matches.id, matchId), eq(matches.status, "accepted")));

    // The roster is now committed to this match — clear their 'matched' queue entries
    // so the Play page stops treating them as actively queued (no dialog re-pop).
    await db
      .update(queueEntries)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(
        and(eq(queueEntries.matchId, matchId), eq(queueEntries.status, "matched")),
      );
  }

  // Create the voice channels exactly once. /stage is polled every couple seconds, so
  // multiple pokes can race; an atomic claim (NULL → CLAIM_SENTINEL on exactly one
  // caller) guarantees a single bot /match/start per match — otherwise concurrent
  // calls each create a team-channel pair and the duplicates leak in Discord.
  const [cur] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (cur && cur.status === "staging" && cur.team1Name && cur.team2Name) {
    const claimed = await db
      .update(matches)
      .set({
        discordTeam1ChannelId: CHANNEL_CLAIM_SENTINEL,
        discordTeam2ChannelId: CHANNEL_CLAIM_SENTINEL,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.status, "staging"),
          isNull(matches.discordTeam1ChannelId),
        ),
      )
      .returning({ id: matches.id });

    if (claimed.length > 0) {
      const roster = await db
        .select({
          team: matchPlayers.team,
          discordUserId: userProfiles.discordUserId,
        })
        .from(matchPlayers)
        .leftJoin(players, eq(players.steamid64, matchPlayers.steamid64))
        .leftJoin(userProfiles, eq(userProfiles.id, players.userProfileId))
        .where(eq(matchPlayers.matchId, matchId));

      const teamAUserIds = roster
        .filter((r) => r.team === 1 && r.discordUserId)
        .map((r) => r.discordUserId!);
      const teamBUserIds = roster
        .filter((r) => r.team === 2 && r.discordUserId)
        .map((r) => r.discordUserId!);

      const res = await botStartMatch({
        team1Name: cur.team1Name,
        team2Name: cur.team2Name,
        teamAUserIds,
        teamBUserIds,
      });
      if (res.ok) {
        await db
          .update(matches)
          .set({
            discordTeam1ChannelId: res.teamAChannelId,
            discordTeam2ChannelId: res.teamBChannelId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(matches.id, matchId));
      } else {
        // Release the claim so a later poke can retry (e.g. bot was down).
        console.warn("[staging] bot channel creation failed:", res.error);
        await db
          .update(matches)
          .set({
            discordTeam1ChannelId: null,
            discordTeam2ChannelId: null,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(matches.id, matchId),
              eq(matches.discordTeam1ChannelId, CHANNEL_CLAIM_SENTINEL),
            ),
          );
      }
    }
  }

  return { status: "staging" };
}

/**
 * Advance §6 → §7/§8 when every player has joined Discord (or the staging window has
 * elapsed — proceed with whoever joined). Sets the match to `configuring` (map veto /
 * server assignment is the next phase).
 */
export async function resolveStaging(matchId: string): Promise<{ status: string }> {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m || m.status !== "staging") return { status: m?.status ?? "not_found" };

  const roster = await db
    .select({ discordJoined: matchPlayers.discordJoined })
    .from(matchPlayers)
    .where(eq(matchPlayers.matchId, matchId));

  const allJoined =
    roster.length > 0 && roster.every((r) => r.discordJoined);
  const deadlinePassed = m.stagingDeadline
    ? new Date(m.stagingDeadline) <= new Date()
    : false;

  if (allJoined || deadlinePassed) {
    await db
      .update(matches)
      .set({ status: "configuring", updatedAt: new Date().toISOString() })
      .where(and(eq(matches.id, matchId), eq(matches.status, "staging")));
    return { status: "configuring" };
  }
  return { status: "staging" };
}
