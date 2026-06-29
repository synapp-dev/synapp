import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { demoPathForToken, demoExists } from "@/entities/demos/lib/storage";
import { getRoundTrails } from "@/entities/demos/lib/trails";

/**
 * POST /api/devtools/demos/trails   body: { token, round }
 * Grenade flight trails for one round. The first call for a demo runs the
 * (slow) `parseGrenades` pass and caches the result to a sidecar; later calls
 * read the cache. Native parser → Node runtime. Gated by `sandbox.access`.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  token: z.string(),
  round: z.number().int().positive(),
});

export async function POST(request: Request) {
  const denied = await guardDemoRoute();
  if (denied) return denied;

  let body;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Expected { token, round }" }, { status: 400 });
  }
  if (!(await demoExists(body.token))) {
    return NextResponse.json({ error: "Demo not found — re-upload it." }, { status: 404 });
  }

  try {
    const result = await getRoundTrails(demoPathForToken(body.token), body.token, body.round);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Trail build failed" },
      { status: 500 },
    );
  }
}
