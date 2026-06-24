import { NextResponse } from "next/server";

import { redline } from "@/entities/redline/lib/client";
import { guardRedlineRoute, redlineErrorResponse } from "@/entities/redline/lib/guard";
import { redactEnvironment } from "@/entities/redline/lib/redact";

/**
 * GET    /api/redline/servers/[id]            → full detail (state, address, resources)
 * DELETE /api/redline/servers/[id]?force=true → delete the server
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  const { id } = await params;
  try {
    const data = await redline.getServer(id);
    // Redline echoes STEAM_ACC in plaintext — redact before it reaches the client.
    return NextResponse.json({ ...data, environment: redactEnvironment(data.environment) });
  } catch (err) {
    return redlineErrorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";
  try {
    await redline.deleteServer(id, force);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return redlineErrorResponse(err);
  }
}
