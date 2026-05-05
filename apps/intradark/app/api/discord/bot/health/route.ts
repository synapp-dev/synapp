import { NextResponse } from "next/server";

const defaultBotUrl = "http://127.0.0.1:3847";

export async function GET() {
  const base =
    process.env.DISCORD_BOT_HTTP_URL?.replace(/\/$/, "") ?? defaultBotUrl;
  try {
    const res = await fetch(`${base}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, ready: false, error: message },
      { status: 503 }
    );
  }
}
