import { NextRequest } from "next/server";
import { getExerciseHistory } from "@/lib/gym/service";
import { ok, requireUser, serverError } from "@/lib/gym/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { exerciseId } = await params;
  try {
    const history = await getExerciseHistory(auth.supabase, auth.userId, exerciseId);
    return ok(history);
  } catch (err) {
    return serverError(err, "Failed to load history");
  }
}
