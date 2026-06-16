import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteProgram, getProgram, updateProgram } from "@/lib/gym/service";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS } from "@/entities/gym/model/types";
import { badRequest, notFound, ok, requireUser, serverError } from "@/lib/gym/http";

const programExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  targetSets: z.number().int().min(1).max(20).optional(),
  targetRepMin: z.number().int().min(1).max(100).optional(),
  targetRepMax: z.number().int().min(1).max(100).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullish(),
    muscleSubgroups: z.array(z.enum(MUSCLE_SUBGROUPS)).max(MUSCLE_SUBGROUPS.length).optional(),
    muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).max(MUSCLE_GROUPS.length).optional(),
    isSmart: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullish(),
    orderIndex: z.number().int().min(0).optional(),
    exercises: z.array(programExerciseSchema).max(40).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty update" });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { programId } = await params;
  try {
    const program = await getProgram(auth.supabase, programId);
    return program ? ok(program) : notFound();
  } catch (err) {
    return serverError(err, "Failed to load program");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { programId } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const program = await updateProgram(auth.supabase, auth.userId, programId, parsed.data);
    return ok(program);
  } catch (err) {
    return serverError(err, "Failed to update program");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { programId } = await params;
  try {
    await deleteProgram(auth.supabase, programId);
    return ok({ id: programId });
  } catch (err) {
    return serverError(err, "Failed to delete program");
  }
}
