import { NextRequest } from "next/server";
import { z } from "zod";
import { createProgram, listPrograms } from "@/lib/gym/service";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS } from "@/entities/gym/model/types";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const programExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  targetSets: z.number().int().min(1).max(20).optional(),
  targetRepMin: z.number().int().min(1).max(100).optional(),
  targetRepMax: z.number().int().min(1).max(100).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dayOfWeek: z.number().int().min(0).max(6).nullish(),
  muscleSubgroups: z.array(z.enum(MUSCLE_SUBGROUPS)).max(MUSCLE_SUBGROUPS.length).optional(),
  muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).max(MUSCLE_GROUPS.length).optional(),
  isSmart: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullish(),
  exercises: z.array(programExerciseSchema).max(40).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    return ok(await listPrograms(auth.supabase, auth.userId));
  } catch (err) {
    return serverError(err, "Failed to list programs");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const program = await createProgram(auth.supabase, auth.userId, parsed.data);
    return ok(program, 201);
  } catch (err) {
    return serverError(err, "Failed to create program");
  }
}
