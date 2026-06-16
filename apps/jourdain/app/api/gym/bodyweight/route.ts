import { z } from "zod";
import { listBodyWeights, logBodyWeight } from "@/lib/gym/service";
import { badRequest, ok, requireUser, serverError } from "@/lib/gym/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    return ok(await listBodyWeights(auth.supabase, auth.userId));
  } catch (err) {
    return serverError(err, "Failed to load bodyweight log");
  }
}

const logSchema = z.object({
  weightKg: z.number().positive().max(499),
  measuredAt: z.string().datetime().optional(),
  bodyFatPct: z.number().min(0).max(100).nullish(),
  muscleMassKg: z.number().min(0).max(499).nullish(),
  bodyWaterPct: z.number().min(0).max(100).nullish(),
  note: z.string().max(200).nullish(),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const parsed = logSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    return ok(await logBodyWeight(auth.supabase, auth.userId, parsed.data));
  } catch (err) {
    return serverError(err, "Failed to log bodyweight");
  }
}
