import { NextResponse } from "next/server";

const defaultBotUrl = "http://127.0.0.1:3847";

export async function POST() {
  const secret = process.env.DISCORD_BOT_HTTP_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "DISCORD_BOT_HTTP_SECRET not configured on web app" },
      { status: 503 }
    );
  }

  const base =
    process.env.DISCORD_BOT_HTTP_URL?.replace(/\/$/, "") ?? defaultBotUrl;

  try {
    const res = await fetch(`${base}/match/end`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(30_000),
    });

    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
