import { checkBearer } from "@/lib/cs2-ingest-auth";

/**
 * CS2 Game State Integration (GSI) / MatchZy ingest endpoint.
 * Currently a live-state sink stub; promoted to the real MatchZy event handler in P5
 * (zod, idempotent, per-match token — see docs/pug-match-loop-build-decisions.md §5/§5.1).
 *
 * Auth: `Authorization: Bearer ${CS2_EVENTS_SECRET}`. Fails closed if the secret is unset
 * (no `dev-secret` fallback) and compares in constant time.
 */
export async function POST(req: Request) {
  const auth = checkBearer(
    req.headers.get("authorization"),
    process.env.CS2_EVENTS_SECRET,
  );
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  console.log("Intradark CS2 EVENT:", JSON.stringify(body, null, 2));

  return Response.json({ ok: true });
}
