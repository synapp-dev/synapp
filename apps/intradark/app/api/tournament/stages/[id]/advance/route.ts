import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";
import { advanceStage } from "@/entities/tournament/lib/stages";

/** Advance the top-N of this stage into the next stage (groups → playoffs). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await advanceStage(id, userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, nextStageId: result.nextStageId, advanced: result.advanced });
}
