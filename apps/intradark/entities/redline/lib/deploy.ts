import "server-only";

import path from "node:path";
import SftpClient from "ssh2-sftp-client";

import { rconExec } from "./rcon";
import { getActiveDeployTarget, type DeployTarget } from "./deploy-targets";

/**
 * Push the locally-built plugin DLLs to the live Redline server over SFTP, then
 * hot-reload them via RCON. "Deploy exactly what I tested locally": files are
 * read from the local CS2 server's plugin folder (populated by
 * `pnpm deploy:cs2-local`). Server-only; driven by /api/redline/deploy-plugins.
 *
 * The SFTP/RCON target (per-server, since the Pelican SFTP user suffix and game
 * IP change each recreate) comes from the active row in `redline_deploy_targets`
 * (managed in the UI — no env reloads). Only CS2_LOCAL_SERVER_DIR stays in env.
 */

const KNOWN_PLUGINS = ["IntradarkDeathmatch", "IntradarkDmStats"];
const REMOTE_PLUGINS_DIR = "/game/csgo/addons/counterstrikesharp/plugins";
const REMOTE_CONFIGS_DIR = "/game/csgo/addons/counterstrikesharp/configs/plugins";
// Configs safe to wipe-and-regen on push (no secrets). IntradarkDmStats is
// deliberately EXCLUDED — its config holds the prod ApiBaseUrl + Secret, which
// regenerating would reset to localhost/dev-secret and break the leaderboard.
const CONFIG_RESETTABLE = new Set(["IntradarkDeathmatch"]);

export type DeployStep = { step: string; ok: boolean; detail?: string };
export type DeployResult = { ok: boolean; steps: DeployStep[] };

/**
 * Build the IntradarkDmStats config that points the plugin at the leaderboard.
 * Secret comes from env (never the client); ServerId from the deploy target.
 */
function buildDmStatsConfigJson(target: DeployTarget): string {
  const secret = process.env.CS2_DM_EVENTS_SECRET?.trim();
  if (!secret) throw new Error("CS2_DM_EVENTS_SECRET not set in .env.local");
  return JSON.stringify(
    {
      ApiBaseUrl: process.env.CS2_DM_API_BASE_URL?.trim() || "https://intradark.com",
      IngestPath: "/api/cs2/deathmatch/events",
      Secret: secret,
      ServerId: target.redline_server_id?.trim() || target.label || "dm-unnamed",
      FlushIntervalSeconds: Number(process.env.CS2_DM_FLUSH_SECONDS) || 30,
      MaxBatch: 500,
      CaptureHurtEvents: false,
      ConfigVersion: 1,
    },
    null,
    2,
  );
}

export type DeployOptions = {
  plugins?: string[];
  /** Delete the (resettable) plugin config so it regenerates from defaults on reload. */
  resetConfig?: boolean;
  /** Skip the SFTP upload — just RCON-reload (for applying a hand-edited config). */
  reloadOnly?: boolean;
  /** Overwrite IntradarkDmStats.json so the plugin points at the leaderboard. */
  writeStatsConfig?: boolean;
};

export async function deployPluginsToLive(opts?: DeployOptions): Promise<DeployResult> {
  const steps: DeployStep[] = [];
  const reloadOnly = opts?.reloadOnly ?? false;
  const resetConfig = opts?.resetConfig ?? false;
  const writeStatsConfig = opts?.writeStatsConfig ?? false;

  const localBase = process.env.CS2_LOCAL_SERVER_DIR?.trim();
  if (!reloadOnly && !localBase) {
    return { ok: false, steps: [{ step: "config", ok: false, detail: "CS2_LOCAL_SERVER_DIR not set in .env.local" }] };
  }

  const target = await getActiveDeployTarget();
  if (!target) {
    return {
      ok: false,
      steps: [{ step: "config", ok: false, detail: "No active deploy target — add one and mark it active." }],
    };
  }

  const plugins = (opts?.plugins?.length ? opts.plugins : KNOWN_PLUGINS).filter((p) =>
    KNOWN_PLUGINS.includes(p),
  );
  if (!plugins.length) {
    return { ok: false, steps: [{ step: "config", ok: false, detail: "no known plugins selected" }] };
  }

  const localPluginsRoot = localBase
    ? path.join(localBase, "game", "csgo", "addons", "counterstrikesharp", "plugins")
    : "";

  // ── SFTP: upload DLLs and/or write configs ───────────────────────────────
  if (!reloadOnly || resetConfig || writeStatsConfig) {
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: target.sftp_host,
        port: target.sftp_port,
        username: target.sftp_user,
        password: target.sftp_password,
      });
      steps.push({ step: `SFTP connect ${target.sftp_host}:${target.sftp_port}`, ok: true });

      if (!reloadOnly) {
        for (const name of plugins) {
          const local = path.join(localPluginsRoot, name);
          const remote = `${REMOTE_PLUGINS_DIR}/${name}`;
          await sftp.mkdir(remote, true).catch(() => {});
          await sftp.uploadDir(local, remote);
          steps.push({ step: `upload ${name}`, ok: true, detail: remote });
        }
      }

      if (resetConfig) {
        for (const name of plugins) {
          if (!CONFIG_RESETTABLE.has(name)) {
            steps.push({ step: `reset config ${name}`, ok: true, detail: "skipped (holds secrets)" });
            continue;
          }
          const cfg = `${REMOTE_CONFIGS_DIR}/${name}/${name}.json`;
          try {
            await sftp.delete(cfg);
            steps.push({ step: `reset config ${name}`, ok: true, detail: "deleted → regenerates on reload" });
          } catch {
            steps.push({ step: `reset config ${name}`, ok: true, detail: "no existing config (already default)" });
          }
        }
      }

      if (writeStatsConfig) {
        const dir = `${REMOTE_CONFIGS_DIR}/IntradarkDmStats`;
        await sftp.mkdir(dir, true).catch(() => {});
        await sftp.put(Buffer.from(buildDmStatsConfigJson(target), "utf8"), `${dir}/IntradarkDmStats.json`);
        steps.push({ step: "write DmStats config", ok: true, detail: "pointed at the leaderboard (secret written, not shown)" });
      }
    } catch (err) {
      steps.push({ step: "SFTP", ok: false, detail: err instanceof Error ? err.message : String(err) });
      await sftp.end().catch(() => {});
      return { ok: false, steps };
    }
    await sftp.end().catch(() => {});
  }

  // ── RCON hot-reload ──────────────────────────────────────────────────────
  try {
    const output = await rconExec({
      host: target.rcon_host,
      port: target.rcon_port,
      password: target.rcon_password,
      commands: plugins.map((n) => `css_plugins reload ${n}`),
    });
    steps.push({ step: "RCON reload", ok: true, detail: output || "(reloaded; no console output)" });
  } catch (err) {
    steps.push({ step: "RCON reload", ok: false, detail: err instanceof Error ? err.message : String(err) });
    return { ok: false, steps };
  }

  return { ok: true, steps };
}
