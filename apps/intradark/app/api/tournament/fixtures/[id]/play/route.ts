import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";
import { playFixture } from "@/entities/tournament/lib/league";

/** Turn a scheduled fixture into a real match (rosters → engine). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await playFixture(id, userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, matchId: result.matchId });
}
