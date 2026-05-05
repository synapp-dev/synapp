import { NextResponse } from "next/server";

const defaultBotUrl = "http://127.0.0.1:3847";

export async function POST(request: Request) {
  const secret = process.env.DISCORD_BOT_HTTP_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "DISCORD_BOT_HTTP_SECRET not configured on web app" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const base =
    process.env.DISCORD_BOT_HTTP_URL?.replace(/\/$/, "") ?? defaultBotUrl;

  try {
    const res = await fetch(`${base}/match/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
