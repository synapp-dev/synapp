import "server-only";

/**
 * Thin server-side client for the Discord bot's local HTTP control API
 * (apps/intradark/discord-bot/http-server.ts). The bot creates/teardown match voice
 * channels and auto-moves linked members from the lobby into their team channel.
 * Calls are best-effort: if the bot isn't running the caller continues without
 * channels (the staging phase still works, just without real Discord routing).
 */

const BOT_URL = process.env.DISCORD_BOT_HTTP_URL || "http://127.0.0.1:3847";
const SECRET = process.env.DISCORD_BOT_HTTP_SECRET;

async function botFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BOT_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export type BotStartResult =
  | { ok: true; teamAChannelId: string; teamBChannelId: string }
  | { ok: false; error: string };

/** Ask the bot to create Team A/B voice channels and prime lobby auto-move. */
export async function botStartMatch(args: {
  team1Name: string;
  team2Name: string;
  teamAUserIds: string[];
  teamBUserIds: string[];
}): Promise<BotStartResult> {
  if (!SECRET) return { ok: false, error: "bot HTTP secret not configured" };
  try {
    const res = await botFetch("/match/start", {
      method: "POST",
      body: JSON.stringify(args),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      teamAChannelId?: string;
      teamBChannelId?: string;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.teamAChannelId || !data.teamBChannelId) {
      return { ok: false, error: data.error ?? `bot responded ${res.status}` };
    }
    return {
      ok: true,
      teamAChannelId: data.teamAChannelId,
      teamBChannelId: data.teamBChannelId,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Tear down the current match's voice channels. */
export async function botEndMatch(): Promise<{ ok: boolean; error?: string }> {
  if (!SECRET) return { ok: false, error: "bot HTTP secret not configured" };
  try {
    const res = await botFetch("/match/end", { method: "POST" });
    if (!res.ok) return { ok: false, error: `bot responded ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function botHealth(): Promise<{ ok: boolean; ready: boolean; tag?: string }> {
  try {
    const res = await botFetch("/health", { timeoutMs: 4000 });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      ready?: boolean;
      tag?: string;
    };
    return { ok: Boolean(data.ok), ready: Boolean(data.ready), tag: data.tag };
  } catch {
    return { ok: false, ready: false };
  }
}
