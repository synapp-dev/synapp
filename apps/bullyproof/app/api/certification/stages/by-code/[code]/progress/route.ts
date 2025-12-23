/**
 * Certification Stage Progress API route handler.
 *
 * Exposes HTTP endpoints for fetching all topic progress for a certification stage.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read their own progress data.
 *
 * Endpoints:
 * - GET /api/certification/stages/by-code/[code]/progress - Get all topic progress for a stage
 *
 * Responses:
 * - 200 OK: Returns array of topic progress data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when stage is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { certificationTopicProgressRepo } from "@/server/certification-topic-progress/certification-topic-progress.repo";
import { certificationStages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle GET /api/certification/stages/by-code/[code]/progress
 *
 * Returns all topic progress for a specific certification stage by code.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage code.
 * @returns A JSON `NextResponse` with the progress data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Get stage by code to get stageId
    const stage = await db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.code, code))
      .limit(1);

    if (!stage[0]) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const stageId = stage[0].id;

    // Get all topic progress for this user/stage
    // This returns all attempts, but we only want the latest for each topic
    const allProgress = await certificationTopicProgressRepo.getByStage(
      user.id,
      stageId
    );

    // Group by topicId and keep only the latest attempt for each topic
    const progressMap = new Map<string, typeof allProgress[0]>();
    for (const progress of allProgress) {
      const existing = progressMap.get(progress.topicId);
      if (!existing || progress.attemptNumber > existing.attemptNumber) {
        progressMap.set(progress.topicId, progress);
      }
    }

    // Convert map to array
    const latestProgress = Array.from(progressMap.values());

    return NextResponse.json({ progress: latestProgress }, { status: 200 });
  } catch (e: any) {
    console.error("Error fetching stage progress:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

