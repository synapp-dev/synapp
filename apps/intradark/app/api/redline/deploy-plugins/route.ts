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
  let resetConfig = false;
  let reloadOnly = false;
  let writeStatsConfig = false;
  try {
    const body = (await request.json()) as
      | { plugins?: unknown; resetConfig?: unknown; reloadOnly?: unknown; writeStatsConfig?: unknown }
      | null;
    if (Array.isArray(body?.plugins)) plugins = body.plugins.filter((p): p is string => typeof p === "string");
    resetConfig = body?.resetConfig === true;
    reloadOnly = body?.reloadOnly === true;
    writeStatsConfig = body?.writeStatsConfig === true;
  } catch {
    /* no body → deploy both */
  }

  const result = await deployPluginsToLive({ plugins, resetConfig, reloadOnly, writeStatsConfig });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
