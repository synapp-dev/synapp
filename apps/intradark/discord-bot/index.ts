import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { buildTeamMap } from "./mock-roster.js";
import { startBotHttpServer } from "./http-server.js";
import {
  deletePracticeChannels,
  practiceSession,
  resolveMatchTeamSide,
  startMatchSession,
} from "./match-session.js";

const lobbyChannelId = process.env.DISCORD_LOBBY_VOICE_CHANNEL_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_CLIENT_ID;

function parseAdminAllowlist(): Set<string> | null {
  const raw = process.env.DISCORD_BOT_ADMIN_USER_IDS?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function assertConfig(): void {
  const missing: string[] = [];
  if (!botToken) missing.push("DISCORD_BOT_TOKEN");
  if (!guildId) missing.push("DISCORD_GUILD_ID");
  if (!lobbyChannelId) missing.push("DISCORD_LOBBY_VOICE_CHANNEL_ID");
  if (!applicationId) missing.push("DISCORD_CLIENT_ID");
  if (missing.length > 0) {
    throw new Error(
      `Missing env: ${missing.join(", ")} (DISCORD_CLIENT_ID is the application id used to register slash commands)`
    );
  }
}

async function ensureSlashCommands(rest: REST): Promise<void> {
  const commands = [
    new SlashCommandBuilder()
      .setName("pug-practice-start")
      .setDescription("Create Team A and Team B voice channels for practice"),
    new SlashCommandBuilder()
      .setName("pug-practice-end")
      .setDescription("Delete practice team voice channels"),
  ].map((c) => c.toJSON());

  await rest.put(Routes.applicationGuildCommands(applicationId!, guildId!), {
    body: commands,
  });
}

function canUsePracticeCommands(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild()) return false;
  const allow = parseAdminAllowlist();
  if (!allow) return true;
  return allow.has(interaction.user.id);
}

async function main(): Promise<void> {
  assertConfig();

  const envTeamMap = buildTeamMap(process.env);
  const adminAllowlist = parseAdminAllowlist();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  const rest = new REST({ version: "10" }).setToken(botToken!);

  const httpSecret = process.env.DISCORD_BOT_HTTP_SECRET?.trim();
  const httpPort = Number.parseInt(
    process.env.DISCORD_BOT_HTTP_PORT ?? "3847",
    10
  );
  if (httpSecret && !Number.isNaN(httpPort)) {
    startBotHttpServer(client, { port: httpPort, secret: httpSecret });
  } else {
    console.warn(
      "DISCORD_BOT_HTTP_SECRET not set — HTTP control API disabled (match sandbox Start match will not reach the bot)."
    );
  }

  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    try {
      await ensureSlashCommands(rest);
      console.log("Slash commands registered for guild", guildId);
    } catch (e) {
      console.error("Failed to register slash commands:", e);
    }
    if (adminAllowlist) {
      console.log(
        `Practice commands restricted to ${adminAllowlist.size} allowlisted user(s)`
      );
    } else {
      console.log(
        "Practice commands: any guild member can run (set DISCORD_BOT_ADMIN_USER_IDS to restrict)"
      );
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild() || interaction.guildId !== guildId) return;

    if (
      interaction.commandName !== "pug-practice-start" &&
      interaction.commandName !== "pug-practice-end"
    ) {
      return;
    }

    if (!canUsePracticeCommands(interaction)) {
      await interaction.reply({
        content: "You are not allowed to use this command.",
        ephemeral: true,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "Guild not found.",
        ephemeral: true,
      });
      return;
    }

    try {
      if (interaction.commandName === "pug-practice-end") {
        await interaction.deferReply({ ephemeral: true });
        await deletePracticeChannels(client);
        await interaction.editReply({ content: "Practice team channels removed." });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const { teamAChannelId, teamBChannelId } = await startMatchSession(
        client,
        {
          team1Name: "Team A",
          team2Name: "Team B",
          teamAUserIds: [],
          teamBUserIds: [],
          useEnvRosterOnly: true,
        },
        envTeamMap
      );

      await interaction.editReply({
        content: `Practice session ready. Lobby: \`${lobbyChannelId}\`. Team channels: <#${teamAChannelId}> and <#${teamBChannelId}>.`,
      });
    } catch (e) {
      console.error(interaction.commandName, e);
      const msg = e instanceof Error ? e.message : String(e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `Error: ${msg}`,
        });
      } else {
        await interaction.reply({ content: `Error: ${msg}`, ephemeral: true });
      }
    }
  });

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (newState.guild.id !== guildId) return;
    if (!practiceSession || !lobbyChannelId) return;

    if (newState.channelId !== lobbyChannelId) return;
    if (oldState.channelId === lobbyChannelId) return;

    const member = newState.member;
    if (!member) return;

    const side = resolveMatchTeamSide(member.id, envTeamMap);
    if (!side) {
      console.info(
        `[voice] User ${member.user.tag} (${member.id}) joined lobby but has no team mapping — skipping automove`
      );
      return;
    }

    const targetId =
      side === "A"
        ? practiceSession.teamAChannelId
        : practiceSession.teamBChannelId;

    try {
      await member.voice.setChannel(targetId);
      console.info(
        `[voice] Moved ${member.user.tag} (${member.id}) → Team ${side}`
      );
    } catch (e) {
      console.error(`[voice] Failed to move ${member.id}:`, e);
    }
  });

  await client.login(botToken);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
