/**
 * Class Progress API route handler.
 *
 * POST /api/lessons/class-progress - per-class curriculum position (level and
 * next lesson) for the lesson wizard's class-selection step.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await lessonsService.getClassProgress({ userId }, body);

    return NextResponse.json({ classes: result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal error";

    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("[POST /api/lessons/class-progress]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
