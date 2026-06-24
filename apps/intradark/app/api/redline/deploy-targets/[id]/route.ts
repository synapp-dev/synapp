import { NextResponse } from "next/server";
import { z } from "zod";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";
import { deleteDeployTarget, updateDeployTarget } from "@/entities/redline/lib/deploy-targets";

export const runtime = "nodejs";

/**
 * PATCH  /api/redline/deploy-targets/[id]  → update (blank passwords keep existing)
 * DELETE /api/redline/deploy-targets/[id]  → remove
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  const { id } = await params;
  let parsed;
  try {
    parsed = inputSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: err instanceof Error ? err.message : err }, { status: 400 });
  }
  try {
    return NextResponse.json({ target: await updateDeployTarget(id, parsed) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  const { id } = await params;
  try {
    await deleteDeployTarget(id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
