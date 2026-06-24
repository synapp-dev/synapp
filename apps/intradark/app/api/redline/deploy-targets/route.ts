import { NextResponse } from "next/server";
import { z } from "zod";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";
import { createDeployTarget, listDeployTargets } from "@/entities/redline/lib/deploy-targets";

export const runtime = "nodejs";

/**
 * GET  /api/redline/deploy-targets  → list targets (secrets redacted)
 * POST /api/redline/deploy-targets  → create a target
 * The SFTP/RCON creds for the Push-to-live deploy. RLS-locked table; secrets
 * never returned to the client. Gated by `sandbox.access`.
 */

const inputSchema = z.object({
  label: z.string().min(1).max(120),
  redlineServerId: z.string().max(64).nullish(),
  sftpHost: z.string().min(1),
  sftpPort: z.number().int().positive().optional(),
  sftpUser: z.string().min(1),
  sftpPassword: z.string().optional(),
  rconHost: z.string().min(1),
  rconPort: z.number().int().positive().optional(),
  rconPassword: z.string().optional(),
});

export async function GET() {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  try {
    return NextResponse.json({ targets: await listDeployTargets() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  let parsed;
  try {
    parsed = inputSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: err instanceof Error ? err.message : err }, { status: 400 });
  }
  try {
    return NextResponse.json({ target: await createDeployTarget(parsed) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
