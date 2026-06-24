import { NextResponse } from "next/server";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";
import { listGsltRefs } from "@/entities/redline/lib/gslt";

/**
 * GET /api/redline/steam-accounts
 * Lists the named GSLT references for the provision UI's dropdown. Returns only
 * id/label/description/configured — never the token. Selecting one sends its id
 * as `steamAccountRef` on create; the server resolves the token from its env var.
 * Gated by the same `sandbox.access` capability as the rest of /api/redline/*.
 */
export async function GET() {
  const denied = await guardRedlineRoute();
  if (denied) return denied;
  return NextResponse.json({ accounts: listGsltRefs() });
}
