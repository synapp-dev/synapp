/**
 * Certification Course Results API route handler.
 *
 * Exposes HTTP endpoints for fetching course completion statistics (admin only).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin permissions (403 if not admin).
 *
 * Endpoints:
 * - GET /api/certification/courses/[id]/results - Get course completion statistics
 *
 * Responses:
 * - 200 OK: Returns course completion statistics.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { courseProgressRepo } from "@/server/course-progress/course-progress.repo";
import { eq } from "drizzle-orm";
import { courseProgress } from "@/server/db/schema";
import { db } from "@/server/db/drizzle";

/**
 * Handle GET /api/certification/courses/[id]/results
 *
 * Returns comprehensive course completion statistics including user counts, completion rates,
 * average progress, and completion time analysis. Only accessible to platform admins.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with course completion statistics or an error payload.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "/ap-certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;

    // Fetch all course progress records for this course
    const allProgress = await db
      .select()
      .from(courseProgress)
      .where(eq(courseProgress.courseId, courseId));

    // Calculate statistics
    const totalUsers = allProgress.length;
    const notStarted = allProgress.filter((p) => p.status === "not_started").length;
    const inProgress = allProgress.filter((p) => p.status === "in_progress").length;
    const completed = allProgress.filter((p) => p.status === "completed").length;

    // Calculate average progress percentage
    const avgProgress =
      totalUsers > 0
        ? Math.round(
            allProgress.reduce((sum, p) => sum + p.progressPercentage, 0) /
              totalUsers
          )
        : 0;

    // Calculate average completed topics
    const avgCompletedTopics =
      totalUsers > 0
        ? Math.round(
            allProgress.reduce((sum, p) => sum + p.completedTopics, 0) /
              totalUsers
          )
        : 0;

    // Get completion times (for completed courses)
    const completedCourses = allProgress.filter(
      (p) => p.status === "completed" && p.startedAt && p.completedAt
    );
    const completionTimes = completedCourses.map((p) => {
      const start = new Date(p.startedAt!).getTime();
      const end = new Date(p.completedAt!).getTime();
      return end - start; // milliseconds
    });
    const avgCompletionTimeMs =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : null;

    // Format average completion time
    let avgCompletionTimeFormatted: string | null = null;
    if (avgCompletionTimeMs !== null) {
      const days = Math.floor(avgCompletionTimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (avgCompletionTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      if (days > 0) {
        avgCompletionTimeFormatted = `${days} day${days !== 1 ? "s" : ""}${hours > 0 ? ` ${hours} hour${hours !== 1 ? "s" : ""}` : ""}`;
      } else if (hours > 0) {
        avgCompletionTimeFormatted = `${hours} hour${hours !== 1 ? "s" : ""}`;
      } else {
        const minutes = Math.floor(
          (avgCompletionTimeMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        avgCompletionTimeFormatted = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
    }

    // Group completions by date (for backward compatibility)
    const completionDatesMap = new Map<string, number>();
    completedCourses.forEach((p) => {
      if (p.completedAt) {
        const date = new Date(p.completedAt);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format
        completionDatesMap.set(
          dateKey,
          (completionDatesMap.get(dateKey) || 0) + 1
        );
      }
    });

    // Convert to array and sort by date
    const completionDates = Array.from(completionDatesMap.entries())
      .map(([date, completions]) => ({ date, completions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Also return raw completion timestamps for granularity grouping on frontend
    const completionTimestamps = completedCourses
      .filter((p) => p.completedAt)
      .map((p) => p.completedAt!)
      .sort();

    return NextResponse.json(
      {
        totalUsers,
        notStarted,
        inProgress,
        completed,
        completionRate: totalUsers > 0 ? Math.round((completed / totalUsers) * 100) : 0,
        avgProgress,
        avgCompletedTopics,
        avgCompletionTime: avgCompletionTimeFormatted,
        totalTopics: allProgress[0]?.totalTopics ?? 0,
        completionDates,
        completionTimestamps,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching course results:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
