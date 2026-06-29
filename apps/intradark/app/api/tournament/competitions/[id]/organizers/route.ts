import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { addOrganizer, removeOrganizer } from "@/entities/tournament/lib/admin-ops";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

const addSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "moderator"]),
});
const removeSchema = z.object({ userId: z.string().uuid() });

/** Delegate a per-competition organizer (platform admin only). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { id } = await params;
  const actor = await getSessionUserId();
  return Response.json(
    await addOrganizer(id, parsed.data.userId, parsed.data.role, actor),
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;
  const parsed = removeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }
  const { id } = await params;
  const actor = await getSessionUserId();
  return Response.json(await removeOrganizer(id, parsed.data.userId, actor));
}
