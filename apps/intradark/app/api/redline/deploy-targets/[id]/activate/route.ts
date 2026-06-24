import { NextResponse } from "next/server";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";
import { activateDeployTarget } from "@/entities/redline/lib/deploy-targets";

export const runtime = "nodejs";

/** POST /api/redline/deploy-targets/[id]/activate → make this the deploy target. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  const { id } = await params;
  try {
    await activateDeployTarget(id);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
