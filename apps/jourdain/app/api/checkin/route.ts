import { NextRequest } from "next/server";
import { ok, requireUser, serverError } from "@/lib/gym/http";
import { getCheckinReview } from "@/lib/checkin/service";
import type { CheckinReview } from "@/entities/checkin/model/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const dateParam = request.nextUrl.searchParams.get("date");
  const clientDate = dateParam && DATE_RE.test(dateParam) ? dateParam : undefined;

  try {
    const review = await getCheckinReview(auth.supabase, auth.userId, clientDate);
    return ok<CheckinReview>(review);
  } catch (err) {
    return serverError(err, "Failed to load check-in");
  }
}
