/**
 * Lesson Recommendations API route handler.
 *
 * POST /api/lessons/recommendations — topic recommendations for selected classes.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getRecommendationsSchema } from "@/server/lessons/lessons.validators";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classIds } = getRecommendationsSchema.parse(body);

    const result = await lessonsService.getRecommendations(
      { userId },
      { classIds }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal error";

    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes("not found") || message.includes("required")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/lessons/recommendations]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
