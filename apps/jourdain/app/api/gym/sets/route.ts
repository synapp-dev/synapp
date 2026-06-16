import { NextRequest } from "next/server";
import { z } from "zod";
import { logSet } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const schema = z.object({
  sessionExerciseId: z.string().uuid(),
  // Bodyweight moves log *added* weight — negative when assisted (e.g. -22.5 kg
  // on an assisted chin-up), so weight can go below zero.
  weight: z.number().min(-10000).max(10000).nullish(),
  reps: z.number().int().min(0).max(1000).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  isWarmup: z.boolean().optional(),
  kind: z.enum(["warmup", "working", "drop"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid body");
  }

  try {
    const set = await logSet(auth.supabase, auth.userId, parsed.data);
    return ok(set, 201);
  } catch (err) {
    return serverError(err, "Failed to log set");
  }
}
