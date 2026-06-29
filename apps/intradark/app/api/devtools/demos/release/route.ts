import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDemoRoute } from "@/entities/demos/lib/guard";
import { releaseDemo } from "@/entities/demos/lib/storage";

/**
 * POST /api/devtools/demos/release   body: { token }
 * Deletes the temp demo file. Best-effort cleanup when the harness unloads a
 * demo. Gated by `sandbox.access`.
 */
export const runtime = "nodejs";

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

  try {
    await releaseDemo(token);
  } catch {
    /* invalid token → nothing to release */
  }
  return NextResponse.json({ released: true });
}
