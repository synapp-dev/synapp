import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { GcClient } from "./gc-client.js";
import { startGcBotHttpServer } from "./http-server.js";
import { parseGcProfile } from "../entities/players/lib/parse-gc.js";
import { recomputeLegitimacy } from "../entities/players/lib/server/recompute-legitimacy.js";

const tokenStorePath = join(
  dirname(fileURLToPath(import.meta.url)),
  ".steam-session.json",
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ADMIN_KEY;
const username = process.env.STEAM_BOT_USERNAME;
const password = process.env.STEAM_BOT_PASSWORD;
const sharedSecret = process.env.STEAM_BOT_SHARED_SECRET;

function assertConfig(): void {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) missing.push("SUPABASE_ADMIN_KEY");
  if (!username) missing.push("STEAM_BOT_USERNAME");
  if (!password) missing.push("STEAM_BOT_PASSWORD");
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

async function main(): Promise<void> {
  assertConfig();

  const admin = createClient(supabaseUrl!, supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const gc = new GcClient({
    username: username!,
    password: password!,
    sharedSecret: sharedSecret || undefined,
    tokenStorePath,
  });
  if (!sharedSecret) {
    console.warn(
      "STEAM_BOT_SHARED_SECRET not set — first login will prompt for your Steam Guard code (email/mobile). A refresh token is then saved for unattended restarts.",
    );
  }
  gc.login();

  async function processSteamId(steamid64: string): Promise<void> {
    const profile = await gc.requestProfile(steamid64);
    const parsed = parseGcProfile(profile);
    const { error } = await admin.from("player_cs2_gc_snapshots").insert({
      steamid64,
      player_level: parsed.player_level,
      cmd_friendly: parsed.cmd_friendly,
      cmd_teaching: parsed.cmd_teaching,
      cmd_leader: parsed.cmd_leader,
      vac_banned: parsed.vac_banned,
      medals: parsed.medals,
      rankings: parsed.rankings,
      raw: profile,
    });
    if (error) throw new Error(error.message);
    void recomputeLegitimacy(steamid64);
  }

  let draining = false;
  async function drain(): Promise<void> {
    if (draining || !gc.isReady()) return;
    draining = true;
    try {
      const { data: jobs } = await admin
        .from("player_cs2_gc_jobs")
        .select("id, steamid64")
        .eq("status", "queued")
        .order("requested_at", { ascending: true })
        .limit(5);

      for (const job of jobs ?? []) {
        await admin
          .from("player_cs2_gc_jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", job.id);
        try {
          await processSteamId(String(job.steamid64));
          await admin
            .from("player_cs2_gc_jobs")
            .update({ status: "done", finished_at: new Date().toISOString() })
            .eq("id", job.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[gc] job ${job.id} failed:`, msg);
          await admin
            .from("player_cs2_gc_jobs")
            .update({
              status: "error",
              error: msg,
              finished_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }
      }
    } finally {
      draining = false;
    }
  }

  const httpSecret = process.env.CS2_GC_BOT_HTTP_SECRET?.trim();
  const httpPort = Number.parseInt(
    process.env.CS2_GC_BOT_HTTP_PORT ?? "3848",
    10,
  );
  if (httpSecret && !Number.isNaN(httpPort)) {
    startGcBotHttpServer({
      port: httpPort,
      secret: httpSecret,
      isReady: () => gc.isReady(),
      onPoke: () => drain(),
    });
  } else {
    console.warn(
      "CS2_GC_BOT_HTTP_SECRET not set — HTTP control disabled (worker will still poll the job queue).",
    );
  }

  // Poll the queue as a backstop in addition to HTTP pokes.
  setInterval(() => {
    drain().catch((e) => console.error("[gc] drain error", e));
  }, 5000);

  console.log("cs2-gc-bot started; waiting for GC connection…");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
