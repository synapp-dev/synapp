import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { isLegitimacyScoringEnabled } from "@/entities/players/lib/server/legitimacy-config";
import {
  getLegitimacyScore,
  recomputeLegitimacy,
} from "@/entities/players/lib/server/recompute-legitimacy";

/**
 * GET /api/players/[id]/legitimacy
 * Returns the current legitimacy row; triggers lazy recompute when missing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid steamid64" },
      { status: 400 },
    );
  }

  if (!isLegitimacyScoringEnabled()) {
    return NextResponse.json({ success: true, enabled: false, data: null });
  }

  let row = await getLegitimacyScore(id);
  if (!row) {
    await recomputeLegitimacy(id);
    row = await getLegitimacyScore(id);
  }

  return NextResponse.json({
    success: true,
    enabled: true,
    data: row,
  });
}
