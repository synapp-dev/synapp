import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";
import { generateLeagueSchedule } from "@/entities/tournament/lib/league";

/** Generate (or regenerate unplayed) round-robin fixtures for a league stage. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await generateLeagueSchedule(id, userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
