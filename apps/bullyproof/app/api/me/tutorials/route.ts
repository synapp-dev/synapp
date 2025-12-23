/**
 * Tutorials API route handler.
 *
 * Exposes HTTP endpoints for managing tutorial progress.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/me/tutorials - Get current user's tutorial progress
 * - PATCH /api/me/tutorials - Update tutorial completion status
 *
 * Responses:
 * - 200 OK: Returns tutorial progress data or updated status.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type TutorialProgress = {
  [key: string]: {
    completed: boolean;
    completedAt?: string;
  };
};

/**
 * Handle GET /api/me/tutorials
 *
 * Returns the current user's tutorial progress.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with tutorial progress or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with metadata
    const profiles = await db
      .select({ metadata: userProfile.metadata })
      .from(userProfile)
      .where(eq(userProfile.id, userId))
      .limit(1);

    const profile = profiles[0];
    const tutorials =
      (profile?.metadata as any)?.tutorials || ({} as TutorialProgress);

    return NextResponse.json({ tutorials }, { status: 200 });
  } catch (e: any) {
    console.error("[TUTORIALS GET] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PATCH /api/me/tutorials
 *
 * Updates tutorial completion status for a specific tutorial.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with updated tutorial progress or an error payload.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tutorialKey, completed } = body;

    if (!tutorialKey || typeof tutorialKey !== "string") {
      return NextResponse.json(
        { error: "tutorialKey is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed must be a boolean" },
        { status: 400 }
      );
    }

    // Get current metadata
    const profiles = await db
      .select({ metadata: userProfile.metadata })
      .from(userProfile)
      .where(eq(userProfile.id, userId))
      .limit(1);

    const currentMetadata = (profiles[0]?.metadata as any) || {};
    const currentTutorials = currentMetadata.tutorials || {};

    // Update the specific tutorial
    const updatedTutorials = {
      ...currentTutorials,
      [tutorialKey]: {
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      },
    };

    // Update metadata with merged tutorials
    const updatedMetadata = {
      ...currentMetadata,
      tutorials: updatedTutorials,
    };

    await db
      .update(userProfile)
      .set({
        metadata: updatedMetadata,
      })
      .where(eq(userProfile.id, userId));

    return NextResponse.json(
      { tutorials: updatedTutorials },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[TUTORIALS PATCH] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

