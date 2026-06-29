import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { forfeitChallenge } from "@/entities/tournament/lib/challenge";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

/** Declining a mandatory ladder challenge = forfeit (challenger wins, swap). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await forfeitChallenge(id, userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
