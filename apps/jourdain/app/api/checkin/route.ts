import { ok, requireUser, serverError } from "@/lib/gym/http";
import {
  expireMissedTasksForUser,
  getCheckinReview,
} from "@/lib/checkin/service";
import type { CheckinReview } from "@/entities/checkin/model/types";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    // Lock in stale occurrences first so the review list is authoritative.
    await expireMissedTasksForUser(auth.userId);
    const review = await getCheckinReview(auth.supabase, auth.userId);
    return ok<CheckinReview>(review);
  } catch (err) {
    return serverError(err, "Failed to load check-in");
  }
}
