import { NextResponse } from "next/server";

import { listSimBots } from "@/entities/match-queue/lib/sim";

/** GET /api/sim/bots → seeded pro bots available to the PUG loop simulator (dev only). */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bots = await listSimBots();
  return NextResponse.json({ bots });
}
