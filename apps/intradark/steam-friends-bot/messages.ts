/**
 * Message composition + reply parsing for the Steam friends bot.
 * Steam friend chat is plaintext; URLs unfurl client-side. Deep links are built
 * from NEXT_PUBLIC_APP_URL.
 */

// User-facing deep links always point at production — never the dev localhost.
// Override only if the public domain ever changes.
function baseUrl(): string {
  return (process.env.STEAM_FRIENDS_BOT_PUBLIC_URL ?? "https://intradark.com").replace(/\/$/, "");
}

export function matchUrl(): string {
  return `${baseUrl()}/play`;
}
export function newsUrl(slug: string): string {
  return `${baseUrl()}/news/${slug}`;
}
export function scrimsUrl(): string {
  return `${baseUrl()}/scrims`;
}
export function settingsUrl(): string {
  return `${baseUrl()}/settings`;
}

// --- Match pop (two-way) -----------------------------------------------------

export function matchFound(secondsLeft: number): string {
  return [
    "🎮 Match found!",
    `Reply "accept" in the next ~${secondsLeft}s to lock your spot, or open ${matchUrl()}`,
    `(reply "decline" to drop — note: declining is a dodge and triggers a cooldown.)`,
  ].join("\n");
}

export function matchPing(secondsLeft: number): string {
  return `⏳ ~${secondsLeft}s left to accept your match — reply "accept" or open ${matchUrl()}`;
}

export function matchAccepted(): string {
  return `✅ You're in — get ready: ${matchUrl()}`;
}

export function matchDeclined(): string {
  return `❌ You declined the match. A dodge cooldown now applies.`;
}

export function matchExpired(): string {
  return `⌛ Too late — the accept window closed. You've been returned to the queue / cooled down.`;
}

export function matchCancelled(): string {
  return `❌ That match was cancelled (a player didn't accept). You're back in the queue.`;
}

// --- Two-way reply handling --------------------------------------------------

export function noPendingMatch(): string {
  return `You don't have a match waiting right now. Queue up at ${matchUrl()}`;
}

export function replyHelp(): string {
  return [
    `I'm the Intradark notification bot. I'll DM you match pops, news, and scrim activity.`,
    `When a match pops, reply "accept" or "decline" right here.`,
    `Try "!dm" to spin up a quick matchmaking flow.`,
    `Manage what I send you: ${settingsUrl()}`,
  ].join("\n");
}

export type ParsedReply = "accept" | "decline" | null;

export function parseReply(message: string): ParsedReply {
  const m = message.trim().toLowerCase();
  if (["accept", "a", "yes", "y", "ready", "✅"].includes(m)) return "accept";
  if (["decline", "no", "n", "drop", "deny", "❌"].includes(m)) return "decline";
  return null;
}

// --- Onboarding / friendship -------------------------------------------------

export function welcomeLinked(): string {
  return [
    `👋 You're connected to Intradark!`,
    ``,
    `Here's what I'll keep you posted on:`,
    ``,
    `🎮  Match pops — reply "accept" right here to join instantly`,
    `📰  News — new articles the moment they're published`,
    `🆚  Scrims — listings in your region, challenges & accepted matches`,
    `📣  Announcements — the occasional important update`,
    ``,
    `Manage what I send anytime: ${settingsUrl()}`,
  ].join("\n");
}

export function onboardingUnlinked(): string {
  return [
    `👋 Thanks for adding the Intradark bot!`,
    ``,
    `Once you link this Steam account to your Intradark profile, I'll DM you:`,
    ``,
    `🎮  Match pops — accept right from Steam`,
    `📰  News articles`,
    `🆚  Scrim activity`,
    `📣  Announcements`,
    ``,
    `Link up to get started: ${settingsUrl()}`,
  ].join("\n");
}

// --- News --------------------------------------------------------------------

export function newsArticle(title: string, excerpt: string | null, slug: string): string {
  const lines = [`📰 ${title}`];
  if (excerpt && excerpt.trim()) lines.push(excerpt.trim());
  lines.push(newsUrl(slug));
  return lines.join("\n");
}

// --- Scrims ------------------------------------------------------------------

export function scrimListing(teamName: string, timeslot: string | null): string {
  const when = timeslot ? ` for ${formatTime(timeslot)}` : "";
  return `🆚 ${teamName} just posted a scrim${when} that matches your region. Challenge them: ${scrimsUrl()}`;
}

export function scrimChallengeReceived(challengerName: string): string {
  return `📨 ${challengerName} challenged your scrim listing. Review & accept: ${scrimsUrl()}`;
}

export function scrimAccepted(opponentName: string, matchTime: string | null): string {
  const when = matchTime ? ` (${formatTime(matchTime)})` : "";
  return `🤝 ${opponentName} accepted your challenge${when}! Details: ${scrimsUrl()}`;
}

// --- !dm demo flow (mock matchmaking over chat) ------------------------------

export type DmMap = "dust2" | "mirage";

interface DmServer {
  name: string;
  ip: string;
  players: number;
  maxPlayers: number;
  /** The user's deathmatch points on this server (dummy). */
  points: number;
  /** The user's leaderboard position on this server (dummy). */
  rank: number;
}

const DM_SERVERS: Record<DmMap, DmServer> = {
  dust2: {
    name: "Dust II",
    ip: "103.214.108.21:27015",
    players: 11,
    maxPlayers: 16,
    points: 2480,
    rank: 14,
  },
  mirage: {
    name: "Mirage",
    ip: "103.214.108.34:27015",
    players: 9,
    maxPlayers: 16,
    points: 1120,
    rank: 37,
  },
};

export function dmMapPrompt(): string {
  const d = DM_SERVERS.dust2;
  const m = DM_SERVERS.mirage;
  return [
    `🎯  Intradark Deathmatch — Sydney`,
    ``,
    `1️⃣   Dust II  ·  ${d.players}/${d.maxPlayers} players`,
    `      Your points: ${d.points.toLocaleString()}  ·  Rank #${d.rank}`,
    ``,
    `2️⃣   Mirage  ·  ${m.players}/${m.maxPlayers} players`,
    `      Your points: ${m.points.toLocaleString()}  ·  Rank #${m.rank}`,
    ``,
    `Reply 1 or 2 for a connect link.`,
  ].join("\n");
}

export function parseDmMapChoice(message: string): DmMap | null {
  const m = message.trim().toLowerCase();
  if (["1", "dust2", "dust ii", "dust", "d2"].includes(m)) return "dust2";
  if (["2", "mirage", "mrg"].includes(m)) return "mirage";
  return null;
}

export function dmReprompt(): string {
  return `Reply 1 for Dust II or 2 for Mirage.`;
}

export function dmConnectString(map: DmMap): string {
  const s = DM_SERVERS[map];
  return [
    `✅  ${s.name} deathmatch — ${s.players}/${s.maxPlayers} in, jump on:`,
    ``,
    `🔗  Click to connect:  steam://connect/${s.ip}`,
    `🖥️  Or in console:  connect ${s.ip}; password intradark`,
    ``,
    `GLHF 🎮`,
  ].join("\n");
}

// --- Admin broadcast ---------------------------------------------------------

export function broadcast(body: string, link: string | null): string {
  return link ? `📣 ${body}\n${link}` : `📣 ${body}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-AU", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
