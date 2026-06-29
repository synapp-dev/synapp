import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";
import { addStage } from "@/entities/tournament/lib/stages";

const schema = z.object({
  name: z.string().min(1).max(120),
  format: z.string().min(1),
  formatConfig: z.record(z.string(), z.unknown()).optional(),
  advancementRule: z.record(z.string(), z.unknown()).optional(),
});

/** Add a stage to a season (composite events: e.g. a playoff bracket after groups). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await addStage({ seasonId: id, ...parsed.data }, userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, stageId: result.stageId });
}
