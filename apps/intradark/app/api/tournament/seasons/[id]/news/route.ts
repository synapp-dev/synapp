import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { linkNewsArticle, unlinkNewsArticle } from "@/entities/tournament/lib/admin-ops";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

const linkSchema = z.object({
  articleId: z.string().uuid(),
  relationType: z
    .enum(["announcement", "preview", "recap", "result", "general"])
    .default("general"),
});

/** Link a news article to this season (announcement/preview/recap/result). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;
  const parsed = linkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { id } = await params;
  const actor = await getSessionUserId();
  return Response.json(
    await linkNewsArticle(parsed.data.articleId, id, parsed.data.relationType, actor),
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;
  const body = (await req.json().catch(() => null)) as { articleId?: string } | null;
  if (!body?.articleId) return Response.json({ error: "articleId required" }, { status: 400 });
  const { id } = await params;
  return Response.json(await unlinkNewsArticle(body.articleId, id));
}
