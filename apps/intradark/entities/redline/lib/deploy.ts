import "server-only";

import path from "node:path";
import SftpClient from "ssh2-sftp-client";

import { rconExec } from "./rcon";
import { getActiveDeployTarget } from "./deploy-targets";

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

export type DeployStep = { step: string; ok: boolean; detail?: string };
export type DeployResult = { ok: boolean; steps: DeployStep[] };

export async function deployPluginsToLive(opts?: { plugins?: string[] }): Promise<DeployResult> {
  const steps: DeployStep[] = [];

  const localBase = process.env.CS2_LOCAL_SERVER_DIR?.trim();
  if (!localBase) {
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

  const localPluginsRoot = path.join(localBase, "game", "csgo", "addons", "counterstrikesharp", "plugins");

  // ── SFTP upload ──────────────────────────────────────────────────────────
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: target.sftp_host,
      port: target.sftp_port,
      username: target.sftp_user,
      password: target.sftp_password,
    });
    steps.push({ step: `SFTP connect ${target.sftp_host}:${target.sftp_port}`, ok: true });
    for (const name of plugins) {
      const local = path.join(localPluginsRoot, name);
      const remote = `${REMOTE_PLUGINS_DIR}/${name}`;
      await sftp.mkdir(remote, true).catch(() => {});
      await sftp.uploadDir(local, remote);
      steps.push({ step: `upload ${name}`, ok: true, detail: remote });
    }
  } catch (err) {
    steps.push({ step: "SFTP upload", ok: false, detail: err instanceof Error ? err.message : String(err) });
    await sftp.end().catch(() => {});
    return { ok: false, steps };
  }
  await sftp.end().catch(() => {});

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
