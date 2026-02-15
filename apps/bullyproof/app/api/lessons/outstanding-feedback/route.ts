/**
 * Outstanding feedback lessons API.
 *
 * Returns lessons in "feedback" status owned by the current user.
 * Used to gate starting new lessons until feedback is completed.
 */
import { NextResponse } from "next/server";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lessons = await lessonsService.getOutstandingFeedbackLessons({
      userId,
    });

    return NextResponse.json(lessons, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
