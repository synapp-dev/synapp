import { NextRequest } from "next/server";
import { z } from "zod";
import { updateExercise } from "@/lib/gym/service";
import { MUSCLE_SUBGROUPS, STATIONS } from "@/entities/gym/model/types";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    subgroup: z.enum(MUSCLE_SUBGROUPS).optional(),
    station: z.enum(STATIONS).optional(),
    secondarySubgroups: z.array(z.enum(MUSCLE_SUBGROUPS)).max(6).optional(),
    strengthLevelSlug: z.string().trim().max(120).nullish(),
    isUnilateral: z.boolean().optional(),
    isFavourite: z.boolean().optional(),
    notes: z.string().trim().max(1000).nullish(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty update" });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { exerciseId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const exercise = await updateExercise(auth.supabase, exerciseId, parsed.data);
    return ok(exercise);
  } catch (err) {
    return serverError(err, "Failed to update exercise");
  }
}

/** Soft-delete: archive the exercise so logged history keeps referencing it. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { exerciseId } = await params;
  try {
    const exercise = await updateExercise(auth.supabase, exerciseId, { archived: true });
    return ok(exercise);
  } catch (err) {
    return serverError(err, "Failed to archive exercise");
  }
}
