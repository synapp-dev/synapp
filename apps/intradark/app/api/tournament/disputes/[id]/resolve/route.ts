import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { resolveDispute } from "@/entities/tournament/lib/admin-ops";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

const schema = z.object({
  status: z.enum(["resolved", "rejected", "reviewing"]),
  resolution: z.string().max(2000).nullable().optional(),
});

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
  const result = await resolveDispute(
    id,
    parsed.data.status,
    parsed.data.resolution ?? null,
    userId,
  );
  return Response.json(result);
}
