import { NextResponse } from "next/server";

import { isRedlineConfigured, redline } from "@/entities/redline/lib/client";
import { guardRedlineRoute, redlineErrorResponse } from "@/entities/redline/lib/guard";

/**
 * GET /api/redline/eggs
 * Lists eggs the API key may deploy (with their variable allow-lists and
 * locations). The single most useful call for discovery — it tells us which
 * env var carries the plugins zip URL. Returns `configured: false` (200) when
 * no key is set, so the sandbox can render a friendly "waiting for key" state.
 */
export async function GET() {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  if (!isRedlineConfigured()) {
    return NextResponse.json({ configured: false, eggs: [] });
  }

  try {
    const data = await redline.listEggs();
    return NextResponse.json({ configured: true, ...data });
  } catch (err) {
    return redlineErrorResponse(err);
  }
}
