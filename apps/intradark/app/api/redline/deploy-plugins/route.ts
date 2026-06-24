import { NextResponse } from "next/server";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";
import { deployPluginsToLive } from "@/entities/redline/lib/deploy";

/**
 * POST /api/redline/deploy-plugins   body: { plugins?: string[] }
 * Pushes the locally-built plugin DLLs to the live server (SFTP) and hot-reloads
 * them (RCON). Localhost-dev tool — needs the built DLLs + SFTP/RCON network, so
 * it doesn't function deployed. Gated by `sandbox.access`.
 */

// SFTP/RCON over raw TCP — must run on the Node runtime, not edge.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  let plugins: string[] | undefined;
  try {
    const body = (await request.json()) as { plugins?: unknown } | null;
    if (Array.isArray(body?.plugins)) plugins = body.plugins.filter((p): p is string => typeof p === "string");
  } catch {
    /* no body → deploy both */
  }

  const result = await deployPluginsToLive({ plugins });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
