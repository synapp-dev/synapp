import { NextResponse } from "next/server";

import { ingestCs2News } from "@/entities/news/lib/server/ingest-cs2-news";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled CS2 news ingest. Protected by `CRON_SECRET` — Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically when the env var is set.
 * Also callable manually with the same header for testing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await ingestCs2News();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[news] ingestCs2News", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
