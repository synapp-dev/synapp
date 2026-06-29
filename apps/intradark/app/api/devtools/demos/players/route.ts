import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { demoPathForToken, demoExists } from "@/entities/demos/lib/storage";
import { getDemoPlayers } from "@/entities/demos/lib/players";

/**
 * POST /api/devtools/demos/players   body: { token }
 * Resolve the demo's players to Steam avatar/name/country (DB cache + one
 * batched Steam call, cached to a sidecar). Node runtime; `sandbox.access`.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ token: z.string() });

export async function POST(request: Request) {
  const denied = await guardDemoRoute();
  if (denied) return denied;

  let token: string;
  try {
    token = schema.parse(await request.json()).token;
  } catch {
    return NextResponse.json({ error: "Expected { token }" }, { status: 400 });
  }
  if (!(await demoExists(token))) {
    return NextResponse.json({ error: "Demo not found — re-upload it." }, { status: 404 });
  }

  try {
    const players = await getDemoPlayers(demoPathForToken(token), token);
    return NextResponse.json({ players });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resolve failed" },
      { status: 500 },
    );
  }
}
