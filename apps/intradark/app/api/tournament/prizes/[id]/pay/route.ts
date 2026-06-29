import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { setPrizePaid } from "@/entities/tournament/lib/admin-ops";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

const schema = z.object({ recipientEntrantId: z.string().uuid().nullable().optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const parsed = schema.safeParse((await req.json().catch(() => ({}))) ?? {});
  const { id } = await params;
  const userId = await getSessionUserId();
  const result = await setPrizePaid(
    id,
    parsed.success ? parsed.data.recipientEntrantId ?? null : null,
    userId,
  );
  return Response.json(result);
}
