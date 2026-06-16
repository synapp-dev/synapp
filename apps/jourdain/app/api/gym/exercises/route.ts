import { NextRequest } from "next/server";
import { z } from "zod";
import { createExercise, listExercises } from "@/lib/gym/service";
import { MUSCLE_SUBGROUPS, STATIONS } from "@/entities/gym/model/types";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subgroup: z.enum(MUSCLE_SUBGROUPS),
  station: z.enum(STATIONS),
  secondarySubgroups: z.array(z.enum(MUSCLE_SUBGROUPS)).max(6).optional(),
  isUnilateral: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullish(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const sp = request.nextUrl.searchParams;
  const subgroupParam = sp.get("subgroup");
  const stationParam = sp.get("station");
  const subgroup = MUSCLE_SUBGROUPS.find((m) => m === subgroupParam);
  const station = STATIONS.find((s) => s === stationParam);

  try {
    const exercises = await listExercises(auth.supabase, auth.userId, {
      subgroup,
      station,
      includeArchived: sp.get("includeArchived") === "1",
    });
    return ok(exercises);
  } catch (err) {
    return serverError(err, "Failed to list exercises");
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
    const exercise = await createExercise(auth.supabase, auth.userId, parsed.data);
    return ok(exercise, 201);
  } catch (err) {
    return serverError(err, "Failed to create exercise");
  }
}
