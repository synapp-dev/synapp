import "server-only";

import { redline } from "./client";
import type {
  CreateServerInput,
  RedlineServerDetail,
  RedlinePowerSignal,
} from "./types";

/**
 * High-level provisioning helpers over the raw {@link redline} client.
 *
 * Plugin delivery: Redline downloads & caches an HTTP zip per host and unzips
 * it into the server's main folder (Metamod + CounterStrikeSharp + our DLLs in
 * `addons/`). The zip URL is passed as an egg environment variable. The exact
 * env key is egg-specific — discover it from `redline.listEggs()` (look at the
 * cs2 egg's `variables`) and set REDLINE_PLUGINS_ZIP_ENV accordingly.
 */

/**
 * Env key the cs2 egg uses to receive the plugins zip URL. Confirmed via
 * `GET /v1/eggs` (2026-06-24): the cs2 egg's variable is `ZIP_URL`. Override
 * with REDLINE_PLUGINS_ZIP_ENV if a future egg differs.
 */
export const PLUGINS_ZIP_ENV = process.env.REDLINE_PLUGINS_ZIP_ENV ?? "ZIP_URL";

/** States the panel reports once an install has finished one way or another. */
const TERMINAL_INSTALL_STATES = new Set([
  "running",
  "offline",
  "stopped",
  "install_failed",
  "reinstall_failed",
]);

export type ProvisionServerOptions = {
  name: string;
  egg: string;
  location: string;
  /** Public HTTP(S) URL of the plugins zip; omitted for vanilla servers. */
  pluginsZipUrl?: string;
  /** Extra egg env vars (map name, mode config, our app callback key, …). */
  environment?: Record<string, string>;
  startOnCompletion?: boolean;
};

/** Build the create payload, folding the plugins zip URL into `environment`. */
export function buildCreateInput(opts: ProvisionServerOptions): CreateServerInput {
  const environment: Record<string, string> = { ...(opts.environment ?? {}) };
  if (opts.pluginsZipUrl) environment[PLUGINS_ZIP_ENV] = opts.pluginsZipUrl;

  return {
    name: opts.name,
    egg: opts.egg,
    location: opts.location,
    environment,
    start_on_completion: opts.startOnCompletion ?? true,
  };
}

/** Create a server (pug or community) with plugins wired in. */
export async function provisionServer(opts: ProvisionServerOptions) {
  return redline.createServer(buildCreateInput(opts));
}

export type WaitOptions = {
  /** Stop after this many ms (default 5 min — installs can be slow). */
  timeoutMs?: number;
  /** Delay between polls (default 4s). */
  intervalMs?: number;
};

/**
 * Poll `getServer` until the install reaches a terminal state (running /
 * offline / *_failed) or the timeout elapses. Returns the final detail so the
 * caller can read `address` / `tv_address` and hand connect info to players.
 */
export async function waitForInstall(
  serverId: string,
  { timeoutMs = 5 * 60_000, intervalMs = 4_000 }: WaitOptions = {},
): Promise<RedlineServerDetail> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const detail = await redline.getServer(serverId);
    const state = detail.current_state ?? detail.status;
    if (state && TERMINAL_INSTALL_STATES.has(state)) return detail;
    if (Date.now() >= deadline) {
      throw new Error(
        `Redline server ${serverId} did not finish installing within ${Math.round(
          timeoutMs / 1000,
        )}s (last state: ${state ?? "unknown"})`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** Ephemeral pug teardown: stop then force-delete. Safe to call post-match. */
export async function teardownServer(serverId: string) {
  try {
    await redline.power(serverId, "stop");
  } catch {
    // server may already be offline / gone — proceed to delete regardless.
  }
  await redline.deleteServer(serverId, true);
}

export async function power(serverId: string, signal: RedlinePowerSignal) {
  return redline.power(serverId, signal);
}
