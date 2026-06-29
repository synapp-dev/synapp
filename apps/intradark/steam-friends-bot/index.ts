import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { BotDb, createDb, type DmJob } from "./db.js";
import { SteamClient } from "./steam-client.js";
import { Sender, PRIORITY_NORMAL } from "./sender.js";
import { startFriendsBotHttpServer } from "./http-server.js";
import { resolveBroadcast } from "./audience.js";
import { runMatchCountdown } from "./match-countdown.js";
import * as msg from "./messages.js";

const tokenStorePath = join(
  dirname(fileURLToPath(import.meta.url)),
  ".steam-session.json",
);

// In-memory sessions for the `!dm` demo flow: steamid64 → expiry (ms).
const dmSessions = new Map<string, number>();
const DM_SESSION_MS = 120_000;

const username = process.env.STEAM_FRIENDS_BOT_USERNAME;
const password = process.env.STEAM_FRIENDS_BOT_PASSWORD;
const sharedSecret = process.env.STEAM_FRIENDS_BOT_SHARED_SECRET;
const httpSecret = process.env.STEAM_FRIENDS_BOT_HTTP_SECRET?.trim();
const httpPort = Number.parseInt(process.env.STEAM_FRIENDS_BOT_HTTP_PORT ?? "3849", 10);

function assertConfig(): void {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_ADMIN_KEY) missing.push("SUPABASE_ADMIN_KEY");
  if (!username) missing.push("STEAM_FRIENDS_BOT_USERNAME");
  if (!password) missing.push("STEAM_FRIENDS_BOT_PASSWORD");
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
}

async function main(): Promise<void> {
  assertConfig();

  const db = new BotDb(createDb());
  const steam = new SteamClient({
    username: username!,
    password: password!,
    sharedSecret: sharedSecret || undefined,
    tokenStorePath,
    gameName: "Intradark — intradark.com",
  });
  const sender = new Sender((sid, text) => steam.send(sid, text));

  if (!sharedSecret) {
    console.warn(
      "STEAM_FRIENDS_BOT_SHARED_SECRET not set — first login prompts for a Steam Guard code, then persists a refresh token for unattended restarts.",
    );
  }

  // --- Friend lifecycle ------------------------------------------------------

  steam.onFriendRequest = async (steamid64) => {
    try {
      const userId = await db.linkedUserId(steamid64);
      await db.upsertFriend(steamid64, userId);
      if (userId) {
        await db.ensurePrefs(userId);
        await sender.enqueue(steamid64, msg.welcomeLinked(), PRIORITY_NORMAL);
      } else {
        await sender.enqueue(steamid64, msg.onboardingUnlinked(), PRIORITY_NORMAL);
      }
    } catch (e) {
      console.error("[friends] onFriendRequest failed", e);
    }
  };

  steam.onFriendMessage = async (steamid64, message) => {
    try {
      const text = message.trim();

      // !dm — mock matchmaking flow over chat.
      if (text.toLowerCase() === "!dm") {
        dmSessions.set(steamid64, Date.now() + DM_SESSION_MS);
        await sender.enqueue(steamid64, msg.dmMapPrompt(), PRIORITY_NORMAL);
        return;
      }

      // A real match accept/decline always takes priority over any demo session.
      const decision = msg.parseReply(text);
      if (decision) {
        const outcome = await acceptByBot(steamid64, decision);
        await sender.enqueue(steamid64, replyForOutcome(decision, outcome), PRIORITY_NORMAL);
        return;
      }

      // Mid !dm flow: interpret a map choice (1/2).
      const expiry = dmSessions.get(steamid64);
      if (expiry && expiry > Date.now()) {
        const map = msg.parseDmMapChoice(text);
        if (map) {
          dmSessions.delete(steamid64);
          await sender.enqueue(steamid64, msg.dmConnectString(map), PRIORITY_NORMAL);
        } else {
          await sender.enqueue(steamid64, msg.dmReprompt(), PRIORITY_NORMAL);
        }
        return;
      }
      dmSessions.delete(steamid64); // clear any expired session

      // Otherwise, help / onboarding.
      const linked = await db.linkedUserId(steamid64);
      await sender.enqueue(
        steamid64,
        linked ? msg.replyHelp() : msg.onboardingUnlinked(),
        PRIORITY_NORMAL,
      );
    } catch (e) {
      console.error("[friends] onFriendMessage failed", e);
    }
  };

  steam.login();

  // --- Job draining ----------------------------------------------------------

  let draining = false;
  async function drain(): Promise<void> {
    if (!steam.isReady() || draining) return;
    draining = true;
    try {
      const jobs = await db.queuedJobs(20);
      for (const job of jobs) {
        if (await db.claimJob(job.id)) void dispatch(job);
      }
    } catch (e) {
      console.error("[drain] error", e);
    } finally {
      draining = false;
    }
  }

  async function dispatch(job: DmJob): Promise<void> {
    try {
      if (job.kind === "direct" && job.category === "match") {
        await runMatchCountdown({ db, sender }, job);
      } else if (job.kind === "direct") {
        await handleDirectMessage(job);
      } else if (job.kind === "broadcast") {
        await handleBroadcast(job);
      } else {
        throw new Error(`unsupported job ${job.kind}/${job.category}`);
      }
      await db.finishJob(job.id, true);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      console.error(`[dispatch] job ${job.id} failed:`, m);
      await db.finishJob(job.id, false, m);
    }
  }

  async function handleDirectMessage(job: DmJob): Promise<void> {
    const sid = job.steamid64 ?? String(job.payload.steamid64 ?? "");
    const text = String(job.payload.text ?? "");
    if (!sid || !text) throw new Error("direct message missing steamid64/text");
    await sender.enqueue(sid, text, PRIORITY_NORMAL);
    await db.recordDelivery(job.id, sid);
  }

  async function handleBroadcast(job: DmJob): Promise<void> {
    const resolved = await resolveBroadcast(db, job);
    if (!resolved) return;
    const already = await db.existingDeliveries(job.id);
    const targets = resolved.recipients.filter((s) => !already.has(s));
    console.log(
      `[broadcast] job ${job.id} (${job.payload.audience}) → ${targets.length} recipient(s)`,
    );
    await Promise.all(
      targets.map(async (sid) => {
        try {
          await sender.enqueue(sid, resolved.text, PRIORITY_NORMAL);
          await db.recordDelivery(job.id, sid);
        } catch (e) {
          console.error(`[broadcast] send to ${sid} failed`, e);
        }
      }),
    );
  }

  await db.recoverStaleJobs();

  if (httpSecret && !Number.isNaN(httpPort)) {
    startFriendsBotHttpServer({
      port: httpPort,
      secret: httpSecret,
      isReady: () => steam.isReady(),
      onPoke: () => drain(),
    });
  } else {
    console.warn(
      "STEAM_FRIENDS_BOT_HTTP_SECRET not set — HTTP poke disabled (worker still polls every 5s).",
    );
  }

  setInterval(() => {
    drain().catch((e) => console.error("[drain] interval error", e));
  }, 5000);

  console.log("steam-friends-bot started; waiting for Steam login…");
}

/** Two-way accept: write goes through Next so setAcceptDecision logic is reused. */
async function acceptByBot(
  steamid64: string,
  decision: "accept" | "decline",
): Promise<AcceptOutcome> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/match/accept-by-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${httpSecret ?? ""}`,
      },
      body: JSON.stringify({ steamid64, decision }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { found: false };
    return (await res.json()) as AcceptOutcome;
  } catch (e) {
    console.error("[accept-by-bot] call failed", e);
    return { found: false };
  }
}

interface AcceptOutcome {
  found: boolean;
  status?: string;
}

function replyForOutcome(
  decision: "accept" | "decline",
  outcome: AcceptOutcome,
): string {
  if (!outcome.found) return msg.noPendingMatch();
  if (decision === "decline") return msg.matchDeclined();
  return msg.matchAccepted();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
