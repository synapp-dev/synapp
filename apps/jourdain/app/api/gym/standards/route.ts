import { getAllStandards } from "@/lib/gym/service";
import { ok, requireUser, serverError } from "@/lib/gym/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    return ok(await getAllStandards(auth.supabase));
  } catch (err) {
    return serverError(err, "Failed to load strength standards");
  }
}
