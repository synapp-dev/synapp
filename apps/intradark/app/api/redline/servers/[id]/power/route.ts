import { NextResponse } from "next/server";
import { z } from "zod";

import { redline } from "@/entities/redline/lib/client";
import { guardRedlineRoute, redlineErrorResponse } from "@/entities/redline/lib/guard";

/**
 * POST /api/redline/servers/[id]/power  body: { signal: start | stop | restart }
 */
const bodySchema = z.object({
  signal: z.enum(["start", "stop", "restart"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  const { id } = await params;

  let signal: "start" | "stop" | "restart";
  try {
    signal = bodySchema.parse(await request.json()).signal;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : err },
      { status: 400 },
    );
  }

  try {
    await redline.power(id, signal);
    return NextResponse.json({ ok: true, id, signal });
  } catch (err) {
    return redlineErrorResponse(err);
  }
}
