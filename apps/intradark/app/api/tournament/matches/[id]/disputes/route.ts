import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { listDisputes, raiseDispute } from "@/entities/tournament/lib/admin-ops";

const schema = z.object({
  type: z.string().min(1).max(32),
  description: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  demoObjectPath: z.string().optional(),
});

/** Raise a dispute on a match (any signed-in user). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { id } = await params;
  const result = await raiseDispute({ matchId: id, raisedByUser: userId, ...parsed.data });
  return Response.json(result);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  return Response.json({ disputes: await listDisputes(id) });
}
