import { seedDefaultExercises } from "@/lib/gym/service";
import { ok, requireUser, serverError } from "@/lib/gym/http";

export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const inserted = await seedDefaultExercises(auth.supabase, auth.userId);
    return ok({ inserted }, 201);
  } catch (err) {
    return serverError(err, "Failed to seed exercises");
  }
}
