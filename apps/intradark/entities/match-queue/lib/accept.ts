import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  matchPlayers,
  matches,
  players,
  playerQueueCooldowns,
  queueEntries,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

import { CHANNEL_CLAIM_SENTINEL } from "./staging-constants";

/**
 * §4 accept / ready-check phase. The matchmaker (§3) leaves a match in
 * `pending_accept` with a per-player `accept_status` of `pending`; this module owns
 * the transition out of that state:
 *   - all 10 accept            → match `accepted`
 *   - anyone declines          → match `cancelled`, decliner(s) cooled down,
 *                                accepters returned to the queue
 *   - deadline passes          → outstanding `pending` become `timeout` (same as a
 *                                decline for penalty purposes)
 *
 * There is no background worker yet, so resolution is *lazy*: every read/write of a
 * match drives `resolveAcceptPhase`, which is a no-op once the match has left
 * `pending_accept`. The Play UI polls ~1s, so a deadline is acted on within a tick.
 */

/** Escalating dodge cooldown by strike count (minutes). Capped at the last entry. */
const COOLDOWN_MINUTES_BY_STRIKE = [5, 15, 30, 60] as const;

type AcceptStatus = "pending" | "accepted" | "declined" | "timeout";

export type RosterPlayer = {
  steamid64: string;
  team: number | null;
  name: string;
  realName: string | null;
  avatarUrl: string | null;
  country: string | null;
  rating: number | null;
  acceptStatus: AcceptStatus;
  isYou: boolean;
  /** §6 staging: has this player joined a Discord team voice channel. */
  discordJoined: boolean;
  /** §9: has this player connected to the game server. */
  connected: boolean;
  /** Whether the player has a linked Discord account (real auto-move is possible). */
  discordLinked: boolean;
};

export type MatchView = {
  matchId: string;
  seq: number;
  status: string;
  league: string;
  acceptDeadline: string | null;
  stagingDeadline: string | null;
  cancelReason: string | null;
  team1Name: string | null;
  team2Name: string | null;
  discordTeam1ChannelId: string | null;
  discordTeam2ChannelId: string | null;
  /** Deep link to the Discord lobby voice channel players join first (§6). */
  discordLobbyUrl: string | null;
  you: { steamid64: string; acceptStatus: AcceptStatus; team: number | null } | null;
  counts: {
    accepted: number;
    declined: number;
    pending: number;
    total: number;
    discordJoined: number;
    connected: number;
  };
  roster: RosterPlayer[];
};

export type ResolveResult = {
  status: string;
  dodgers: string[];
  keepers: string[];
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Write a dodge cooldown for `steamid64`, escalating the duration by how many
 * cooldowns are still active for them (1st = 5m, 2nd = 15m, …).
 */
async function applyCooldown(
  tx: Tx,
  steamid64: string,
  matchId: string,
  reason: "accept_dodge" | "accept_timeout",
): Promise<void> {
  const [prev] = await tx
    .select({ strikes: playerQueueCooldowns.strikes })
    .from(playerQueueCooldowns)
    .where(
      and(
        eq(playerQueueCooldowns.steamid64, steamid64),
        sql`${playerQueueCooldowns.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(playerQueueCooldowns.strikes))
    .limit(1);

  const strikes = (prev?.strikes ?? 0) + 1;
  const minutes =
    COOLDOWN_MINUTES_BY_STRIKE[
      Math.min(strikes, COOLDOWN_MINUTES_BY_STRIKE.length) - 1
    ] ?? COOLDOWN_MINUTES_BY_STRIKE[0];
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();

  await tx.insert(playerQueueCooldowns).values({
    steamid64,
    reason,
    matchId,
    strikes,
    expiresAt,
  });
}

/**
 * Drive the §4 state machine for one match. Locks the match row so concurrent
 * ticks/decisions can't double-resolve. No-op unless the match is `pending_accept`.
 */
export async function resolveAcceptPhase(
  matchId: string,
): Promise<ResolveResult> {
  return db.transaction(async (tx) => {
    const [match] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .for("update");

    if (!match) return { status: "not_found", dodgers: [], keepers: [] };
    if (match.status !== "pending_accept") {
      return { status: match.status, dodgers: [], keepers: [] };
    }

    const roster = await tx
      .select({
        steamid64: matchPlayers.steamid64,
        acceptStatus: matchPlayers.acceptStatus,
      })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId));

    const now = new Date();
    const deadlinePassed = match.acceptDeadline
      ? new Date(match.acceptDeadline) <= now
      : false;

    // Promote outstanding `pending` → `timeout` once the accept window closes.
    if (deadlinePassed) {
      const stillPending = roster.filter((p) => p.acceptStatus === "pending");
      if (stillPending.length > 0) {
        await tx
          .update(matchPlayers)
          .set({ acceptStatus: "timeout" })
          .where(
            and(
              eq(matchPlayers.matchId, matchId),
              eq(matchPlayers.acceptStatus, "pending"),
            ),
          );
        for (const p of stillPending) p.acceptStatus = "timeout";
      }
    }

    const allAccepted = roster.every((p) => p.acceptStatus === "accepted");
    const hasFailure = roster.some(
      (p) => p.acceptStatus === "declined" || p.acceptStatus === "timeout",
    );

    // Still waiting on someone, nobody bailed, window open → leave it pending.
    if (!allAccepted && !hasFailure) {
      return { status: "pending_accept", dodgers: [], keepers: [] };
    }

    if (allAccepted) {
      await tx
        .update(matches)
        .set({
          status: "accepted",
          acceptedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .where(eq(matches.id, matchId));
      return {
        status: "accepted",
        dodgers: [],
        keepers: roster.map((p) => p.steamid64),
      };
    }

    // Failure path: cancel the match, penalise dodgers, requeue everyone else.
    const dodgers = roster.filter(
      (p) => p.acceptStatus === "declined" || p.acceptStatus === "timeout",
    );
    const keepers = roster.filter(
      (p) => p.acceptStatus === "accepted" || p.acceptStatus === "pending",
    );

    await tx
      .update(matches)
      .set({
        status: "cancelled",
        cancelReason: "accept_failed",
        updatedAt: now.toISOString(),
      })
      .where(eq(matches.id, matchId));

    for (const d of dodgers) {
      await applyCooldown(
        tx,
        d.steamid64,
        matchId,
        d.acceptStatus === "declined" ? "accept_dodge" : "accept_timeout",
      );
    }

    // Dodgers leave the pool; accepters go back to searching for a fresh pop.
    if (dodgers.length > 0) {
      await tx
        .update(queueEntries)
        .set({ status: "cancelled", matchId: null, updatedAt: now.toISOString() })
        .where(
          and(
            eq(queueEntries.matchId, matchId),
            inArray(
              queueEntries.steamid64,
              dodgers.map((d) => d.steamid64),
            ),
          ),
        );
    }
    if (keepers.length > 0) {
      await tx
        .update(queueEntries)
        .set({ status: "searching", matchId: null, updatedAt: now.toISOString() })
        .where(
          and(
            eq(queueEntries.matchId, matchId),
            inArray(
              queueEntries.steamid64,
              keepers.map((k) => k.steamid64),
            ),
          ),
        );
    }

    return {
      status: "cancelled",
      dodgers: dodgers.map((d) => d.steamid64),
      keepers: keepers.map((k) => k.steamid64),
    };
  });
}

/**
 * Record one player's accept/decline, then re-drive resolution. Ignored (returns
 * the current state) if the match has already left `pending_accept`.
 */
export async function setAcceptDecision(
  matchId: string,
  steamid64: string,
  decision: "accept" | "decline",
): Promise<ResolveResult> {
  const [match] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return { status: "not_found", dodgers: [], keepers: [] };
  if (match.status !== "pending_accept") {
    return { status: match.status, dodgers: [], keepers: [] };
  }

  await db
    .update(matchPlayers)
    .set({
      acceptStatus: decision === "accept" ? "accepted" : "declined",
      acceptedAt: decision === "accept" ? new Date().toISOString() : null,
    })
    .where(
      and(
        eq(matchPlayers.matchId, matchId),
        eq(matchPlayers.steamid64, steamid64),
        eq(matchPlayers.acceptStatus, "pending"),
      ),
    );

  return resolveAcceptPhase(matchId);
}

/**
 * Full match snapshot for the accept dialog: roster (name/avatar/country/rating from
 * players ⨝ steam_profiles), per-player accept status, and the viewer's own row.
 * Lazily resolves an expired accept window before reading.
 */
export async function getMatchView(
  matchId: string,
  viewerSteamid64: string | null,
): Promise<MatchView | null> {
  const [head] = await db
    .select({ status: matches.status, acceptDeadline: matches.acceptDeadline })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!head) return null;

  // Drive a lazy timeout resolution if the window has elapsed.
  if (
    head.status === "pending_accept" &&
    head.acceptDeadline &&
    new Date(head.acceptDeadline) <= new Date()
  ) {
    await resolveAcceptPhase(matchId);
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return null;

  const rows = await db
    .select({
      steamid64: matchPlayers.steamid64,
      team: matchPlayers.team,
      acceptStatus: matchPlayers.acceptStatus,
      rating: matchPlayers.ratingAtQueue,
      discordJoined: matchPlayers.discordJoined,
      connected: matchPlayers.connected,
      personaname: steamProfiles.personaname,
      realname: steamProfiles.realname,
      avatarfull: steamProfiles.avatarfull,
      loccountrycode: steamProfiles.loccountrycode,
      steamVanity: players.steamVanity,
      countryFlag: players.countryFlag,
      discordUserId: userProfiles.discordUserId,
    })
    .from(matchPlayers)
    .leftJoin(players, eq(players.steamid64, matchPlayers.steamid64))
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, matchPlayers.steamid64))
    .leftJoin(userProfiles, eq(userProfiles.id, players.userProfileId))
    .where(eq(matchPlayers.matchId, matchId));

  const roster: RosterPlayer[] = rows
    .map((r) => ({
      steamid64: r.steamid64,
      team: r.team,
      name: r.personaname ?? r.steamVanity ?? "Player",
      realName: r.realname ?? null,
      avatarUrl: r.avatarfull ?? null,
      country: r.countryFlag ?? r.loccountrycode ?? null,
      rating: r.rating ?? null,
      acceptStatus: r.acceptStatus as AcceptStatus,
      isYou: viewerSteamid64 != null && r.steamid64 === viewerSteamid64,
      discordJoined: Boolean(r.discordJoined),
      connected: Boolean(r.connected),
      discordLinked: Boolean(r.discordUserId),
    }))
    .sort((a, b) => {
      if ((a.team ?? 9) !== (b.team ?? 9)) return (a.team ?? 9) - (b.team ?? 9);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

  const you = roster.find((r) => r.isYou) ?? null;

  const guildId = process.env.DISCORD_GUILD_ID;
  const lobbyChannelId = process.env.DISCORD_LOBBY_VOICE_CHANNEL_ID;
  const discordLobbyUrl =
    guildId && lobbyChannelId
      ? `https://discord.com/channels/${guildId}/${lobbyChannelId}`
      : null;

  return {
    matchId: match.id,
    seq: match.seq,
    status: match.status,
    league: match.league,
    acceptDeadline: match.acceptDeadline,
    stagingDeadline: match.stagingDeadline,
    cancelReason: match.cancelReason,
    team1Name: match.team1Name,
    team2Name: match.team2Name,
    // Hide the in-progress claim sentinel — clients only see real ids or null.
    discordTeam1ChannelId:
      match.discordTeam1ChannelId === CHANNEL_CLAIM_SENTINEL
        ? null
        : match.discordTeam1ChannelId,
    discordTeam2ChannelId:
      match.discordTeam2ChannelId === CHANNEL_CLAIM_SENTINEL
        ? null
        : match.discordTeam2ChannelId,
    discordLobbyUrl,
    you: you
      ? { steamid64: you.steamid64, acceptStatus: you.acceptStatus, team: you.team }
      : null,
    counts: {
      accepted: roster.filter((r) => r.acceptStatus === "accepted").length,
      declined: roster.filter(
        (r) => r.acceptStatus === "declined" || r.acceptStatus === "timeout",
      ).length,
      pending: roster.filter((r) => r.acceptStatus === "pending").length,
      total: roster.length,
      discordJoined: roster.filter((r) => r.discordJoined).length,
      connected: roster.filter((r) => r.connected).length,
    },
    roster,
  };
}
