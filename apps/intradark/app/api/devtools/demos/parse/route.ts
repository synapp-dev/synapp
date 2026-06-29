import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { demoPathForToken, demoExists } from "@/entities/demos/lib/storage";
import { runInsight, isKnownInsight } from "@/entities/demos/lib/insights";

/**
 * POST /api/devtools/demos/parse   body: { token, insight }
 * Runs one curated insight against an already-uploaded demo (see `load`). Native
 * parser → Node runtime. Gated by `sandbox.access`.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  token: z.string(),
  insight: z.string(),
});

export async function POST(request: Request) {
  const denied = await guardDemoRoute();
  if (denied) return denied;

  let body;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Expected { token, insight }" }, { status: 400 });
  }

  if (!isKnownInsight(body.insight)) {
    return NextResponse.json({ error: `Unknown insight: ${body.insight}` }, { status: 400 });
  }
  if (!(await demoExists(body.token))) {
    return NextResponse.json(
      { error: "Demo not found — re-upload it (the temp file may have been cleared)." },
      { status: 404 },
    );
  }

  const startedAt = Date.now();
  try {
    const result = runInsight(body.insight, demoPathForToken(body.token));
    return NextResponse.json({ result, tookMs: Date.now() - startedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 },
    );
  }
}
