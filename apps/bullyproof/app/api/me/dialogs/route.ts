/**
 * Dialogs API route handler.
 *
 * Exposes HTTP endpoints for managing dialog dismissal status.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - PATCH /api/me/dialogs - Update dialog dismissal status
 *
 * Responses:
 * - 200 OK: Returns updated dialog status.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle PATCH /api/me/dialogs
 *
 * Updates dialog dismissal status for a specific dialog.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with updated dialog progress or an error payload.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dialogKey, dismissed } = body;

    if (!dialogKey || typeof dialogKey !== "string") {
      return NextResponse.json(
        { error: "dialogKey is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof dismissed !== "boolean") {
      return NextResponse.json(
        { error: "dismissed must be a boolean" },
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
    const currentDialogs = currentMetadata.dialogs || {};

    // Update the specific dialog
    const updatedDialogs = {
      ...currentDialogs,
      [dialogKey]: {
        dismissed,
        dismissedAt: dismissed ? new Date().toISOString() : undefined,
      },
    };

    // Update metadata with merged dialogs
    const updatedMetadata = {
      ...currentMetadata,
      dialogs: updatedDialogs,
    };

    await db
      .update(userProfile)
      .set({
        metadata: updatedMetadata,
      })
      .where(eq(userProfile.id, userId));

    return NextResponse.json(
      { dialogs: updatedDialogs },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[DIALOGS PATCH] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
