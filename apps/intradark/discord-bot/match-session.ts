import type { Client, Guild, GuildChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { sanitizeDiscordChannelName } from "./channel-utils.js";

export type PracticeSession = {
  teamAChannelId: string;
  teamBChannelId: string;
};

export let practiceSession: PracticeSession | null = null;

/** When set (HTTP/API match start), voice automove uses this roster instead of env-only map. */
export let rosterOverride: Map<string, "A" | "B"> | null = null;

const guildId = () => process.env.DISCORD_GUILD_ID!;
const categoryId = () => process.env.DISCORD_MATCH_CATEGORY_ID;
const lobbyChannelId = () => process.env.DISCORD_LOBBY_VOICE_CHANNEL_ID;

/** Same roster resolution as voice automove: sandbox roster when set, else env-based map. */
export function resolveMatchTeamSide(
  userId: string,
  envTeamMap: Map<string, "A" | "B">
): "A" | "B" | undefined {
  const map = rosterOverride ?? envTeamMap;
  return map.get(userId);
}

/**
 * Move users already connected to the lobby into their team channels after match creation.
 */
export async function sweepLobbyMembersToTeams(
  client: Client,
  envTeamMap: Map<string, "A" | "B">
): Promise<void> {
  const session = practiceSession;
  const lobbyId = lobbyChannelId()?.trim();
  if (!session || !lobbyId) return;

  const guild = await client.guilds.fetch(guildId());
  const lobby = await guild.channels.fetch(lobbyId).catch(() => null);
  if (!lobby?.isVoiceBased()) {
    console.warn("[match-session] sweep: lobby channel missing or not voice");
    return;
  }

  for (const member of lobby.members.values()) {
    const side = resolveMatchTeamSide(member.id, envTeamMap);
    if (!side) continue;

    const targetId =
      side === "A" ? session.teamAChannelId : session.teamBChannelId;

    try {
      await member.voice.setChannel(targetId);
      console.info(
        `[voice] Sweep: moved ${member.user.tag} (${member.id}) from lobby → Team ${side}`
      );
    } catch (e) {
      console.error(`[voice] Sweep failed for ${member.id}:`, e);
    }
  }
}

/**
 * Place team voice channels directly under the lobby in the channel list (same category).
 * Requires lobby VC to live under DISCORD_MATCH_CATEGORY_ID.
 */
async function orderChannelsBelowLobby(
  guild: Guild,
  categorySnowflake: string,
  lobbySnowflake: string,
  teamA: GuildChannel,
  teamB: GuildChannel
): Promise<void> {
  const lobby = await guild.channels.fetch(lobbySnowflake).catch(() => null);
  if (!lobby?.isVoiceBased()) {
    console.warn(
      "[match-session] Could not fetch lobby channel or it is not voice — skipping position ordering."
    );
    return;
  }
  if (lobby.parentId !== categorySnowflake) {
    console.warn(
      `[match-session] Lobby parent (${lobby.parentId}) ≠ DISCORD_MATCH_CATEGORY_ID (${categorySnowflake}). Move the lobby into that category so match channels can sit below it.`
    );
    return;
  }

  const base = lobby.position;
  await teamA.setPosition(base + 1, { relative: false });
  await teamB.setPosition(base + 2, { relative: false });
}

async function moveVoiceChannelMembersToLobby(
  guild: Guild,
  voiceChannelId: string,
  lobbySnowflake: string
): Promise<void> {
  const ch = await guild.channels.fetch(voiceChannelId).catch(() => null);
  if (!ch?.isVoiceBased()) return;

  for (const member of ch.members.values()) {
    try {
      await member.voice.setChannel(lobbySnowflake);
      console.info(
        `[voice] End match: moved ${member.user.tag} (${member.id}) → lobby`
      );
    } catch (e) {
      console.warn(
        `[voice] End match: could not move ${member.id} to lobby before delete`,
        e
      );
    }
  }
}

export async function deletePracticeChannels(client: Client): Promise<void> {
  if (!practiceSession) {
    rosterOverride = null;
    return;
  }
  const guild = await client.guilds.fetch(guildId());
  const sessionIds = practiceSession;
  const lobbyId = lobbyChannelId()?.trim();

  if (lobbyId) {
    await moveVoiceChannelMembersToLobby(
      guild,
      sessionIds.teamAChannelId,
      lobbyId
    );
    await moveVoiceChannelMembersToLobby(
      guild,
      sessionIds.teamBChannelId,
      lobbyId
    );
  } else {
    console.warn(
      "[match-session] DISCORD_LOBBY_VOICE_CHANNEL_ID missing — skipping lobby move before channel delete"
    );
  }

  for (const id of [sessionIds.teamAChannelId, sessionIds.teamBChannelId]) {
    try {
      const ch = await guild.channels.fetch(id);
      if (ch?.isVoiceBased()) await ch.delete("intradark match end");
    } catch (e) {
      console.warn(`Could not delete channel ${id}:`, e);
    }
  }
  practiceSession = null;
  rosterOverride = null;
}

export type StartMatchOptions = {
  team1Name: string;
  team2Name: string;
  /** Discord snowflakes on team A (voice channel 1). */
  teamAUserIds: string[];
  /** Discord snowflakes on team B (voice channel 2). */
  teamBUserIds: string[];
  /**
   * When true (slash commands), keep lobby automove driven only by env DISCORD_PRACTICE_TEAM_*.
   * When false, set rosterOverride from teamAUserIds / teamBUserIds.
   */
  useEnvRosterOnly: boolean;
};

export async function startMatchSession(
  client: Client,
  opts: StartMatchOptions,
  envTeamMap: Map<string, "A" | "B">
): Promise<{ teamAChannelId: string; teamBChannelId: string }> {
  const guild = await client.guilds.fetch(guildId());

  if (practiceSession) {
    await deletePracticeChannels(client);
  }

  const parent = categoryId()?.trim() || undefined;
  const lobbyId = lobbyChannelId()?.trim();
  const n1 = sanitizeDiscordChannelName(opts.team1Name, "team-1");
  const n2 = sanitizeDiscordChannelName(opts.team2Name, "team-2");

  const teamA = await guild.channels.create({
    name: n1,
    type: ChannelType.GuildVoice,
    parent,
  });
  const teamB = await guild.channels.create({
    name: n2,
    type: ChannelType.GuildVoice,
    parent,
  });

  if (parent && lobbyId) {
    await orderChannelsBelowLobby(guild, parent, lobbyId, teamA, teamB);
  } else if (!parent) {
    console.warn(
      "[match-session] Set DISCORD_MATCH_CATEGORY_ID so match voice channels are created under your category."
    );
  }

  practiceSession = {
    teamAChannelId: teamA.id,
    teamBChannelId: teamB.id,
  };

  if (opts.useEnvRosterOnly) {
    rosterOverride = null;
  } else {
    const m = new Map<string, "A" | "B">();
    for (const id of opts.teamAUserIds) {
      const x = id.trim();
      if (/^\d{17,20}$/.test(x)) m.set(x, "A");
    }
    for (const id of opts.teamBUserIds) {
      const x = id.trim();
      if (/^\d{17,20}$/.test(x)) m.set(x, "B");
    }
    rosterOverride = m;
  }

  await sweepLobbyMembersToTeams(client, envTeamMap);

  return {
    teamAChannelId: teamA.id,
    teamBChannelId: teamB.id,
  };
}
