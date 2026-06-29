import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { createChallenge } from "@/entities/tournament/lib/challenge";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";
import { createChallengeSchema } from "@/entities/tournament/lib/schemas";

export async function POST(req: Request) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const parsed = createChallengeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const userId = await getSessionUserId();
  const result = await createChallenge(
    parsed.data.stageId,
    parsed.data.challengerEntrantId,
    parsed.data.challengedEntrantId,
    userId,
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, challengeId: result.challengeId });
}
