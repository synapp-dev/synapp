import "server-only";

/**
 * Single source of truth for the CS2 RCON password.
 *
 * The password lives ONLY in `REDLINE_RCON_PASSWORD` (env, server-side) — never
 * sent from the browser and never required in the DB deploy target. It is used
 * in two places, both server-side:
 *   1. Spin-up: injected as the egg's RCON env var ({@link RCON_PW_ENV_KEY}) so
 *      every provisioned server comes up with this known password.
 *   2. Push-to-live: the RCON auth for `css_plugins reload` (see deploy.ts).
 */

/** Egg env var key the cs2 egg uses for the server's RCON password. */
export const RCON_PW_ENV_KEY = "SRCDS_RCONPW";

/** The shared RCON password from env, or null when unset. Server-only. */
export function getRconPasswordFromEnv(): string | null {
  return process.env.REDLINE_RCON_PASSWORD?.trim() || null;
}
