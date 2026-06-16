import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteSet, updateSet } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const schema = z
  .object({
    // Bodyweight moves log *added* weight — negative when assisted.
    weight: z.number().min(-10000).max(10000).nullish(),
    reps: z.number().int().min(0).max(1000).nullish(),
    rpe: z.number().min(1).max(10).nullish(),
    isWarmup: z.boolean().optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty update" });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { setId } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    return ok(await updateSet(auth.supabase, setId, parsed.data));
  } catch (err) {
    return serverError(err, "Failed to update set");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { setId } = await params;
  try {
    await deleteSet(auth.supabase, setId);
    return ok({ id: setId });
  } catch (err) {
    return serverError(err, "Failed to delete set");
  }
}
