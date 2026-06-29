import "server-only";

import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Demos are large (tens–hundreds of MB), so the harness uploads a file once to
 * a throwaway temp file and then references it by token for each insight — no
 * re-upload per button. Localhost devtools only; gated by `sandbox.access`.
 */
const DIR = join(tmpdir(), "intradark-demos");
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Resolve a token to its temp path, rejecting anything that isn't a UUID. */
export function demoPathForToken(token: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid demo token");
  return join(DIR, `${token}.dem`);
}

/** Path to a token-scoped sidecar file (e.g. the cached grenade trails). */
export function demoSidecarPath(token: string, ext: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid demo token");
  return join(DIR, `${token}.${ext}`);
}

/** Persist an uploaded demo and return its reuse token. */
export async function storeDemo(bytes: Uint8Array): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const token = randomUUID();
  await writeFile(join(DIR, `${token}.dem`), bytes);
  return token;
}

export async function demoExists(token: string): Promise<boolean> {
  try {
    await stat(demoPathForToken(token));
    return true;
  } catch {
    return false;
  }
}

export async function releaseDemo(token: string): Promise<void> {
  await Promise.all([
    unlink(demoPathForToken(token)).catch(() => {}),
    unlink(demoSidecarPath(token, "grenades.json")).catch(() => {}),
    unlink(demoSidecarPath(token, "grenades.v2.json")).catch(() => {}),
    unlink(demoSidecarPath(token, "players.json")).catch(() => {}),
  ]);
}
