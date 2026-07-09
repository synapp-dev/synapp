import { NextRequest } from "next/server";
import { z } from "zod";
import { previewAdhocPlan } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";
import { MUSCLE_SUBGROUPS } from "@/entities/gym/model/types";

const bodySchema = z.object({
  subgroups: z.array(z.enum(MUSCLE_SUBGROUPS)).min(1),
  size: z.number().int().min(1).max(12),
});

/** The exercise list an ad-hoc session would start with, without persisting. */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const preview = await previewAdhocPlan(
      auth.supabase,
      auth.userId,
      parsed.data.subgroups,
      parsed.data.size
    );
    return ok(preview);
  } catch (err) {
    return serverError(err, "Failed to preview session");
  }
}
