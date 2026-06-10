/**
 * CS2 Game State Integration (GSI) ingest endpoint.
 * Kept as a future live-state sink (not the badge source — badges come from the
 * Game Coordinator bot worker). Authorized via CS2_EVENTS_SECRET.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CS2_EVENTS_SECRET ?? "dev-secret";

  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  console.log("Intradark CS2 EVENT:", JSON.stringify(body, null, 2));

  return Response.json({ ok: true });
}
