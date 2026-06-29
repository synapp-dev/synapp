import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { addPrize } from "@/entities/tournament/lib/admin-ops";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

const schema = z.object({
  placementLow: z.number().int().positive(),
  placementHigh: z.number().int().positive(),
  prizeType: z.enum(["cash", "in_game_item", "platform_points", "physical", "custom"]),
  amount: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
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
  const result = await addPrize({ seasonId: id, ...parsed.data }, userId);
  return Response.json(result);
}
