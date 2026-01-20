/**
 * Lesson Recommendations API route handler.
 *
 * Exposes HTTP POST endpoint for getting topic recommendations based on class progress.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only get recommendations for classes in their schools.
 *
 * Request body:
 * - classIds: Array of class UUIDs (required, 1-10 classes)
 *
 * Responses:
 * - 200 OK: Returns recommendation data.
 * - 400 Bad Request: `{ error: string }` when validation fails.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/lessons/recommendations
 *
 * Returns topic recommendations for the specified classes.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with recommendation data or an error payload.
 */
export async function POST(request: Request) {
  const requestId = `[REC-${Date.now()}]`;
  console.log(`${requestId} [ROUTE] POST /api/lessons/recommendations - Request received`);
  
  try {
    console.log(`${requestId} [ROUTE] Step 1: Extracting userId from request`);
    const userId = await getUserIdFromRequest(request);
    console.log(`${requestId} [ROUTE] Step 1: userId extracted:`, userId ? `"${userId}"` : "null");

    if (!userId) {
      console.log(`${requestId} [ROUTE] ERROR: No userId found - returning 401`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`${requestId} [ROUTE] Step 2: Parsing request body`);
    let body;
    try {
      body = await request.json();
      console.log(`${requestId} [ROUTE] Step 2: Request body parsed successfully:`, JSON.stringify(body));
    } catch (e: any) {
      console.error(`${requestId} [ROUTE] ERROR: Failed to parse JSON:`, e.message);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { classIds } = body;
    console.log(`${requestId} [ROUTE] Step 3: Extracted classIds:`, classIds);

    if (!classIds || !Array.isArray(classIds)) {
      console.log(`${requestId} [ROUTE] ERROR: classIds is not an array - returning 400`);
      return NextResponse.json(
        { error: "classIds must be an array" },
        { status: 400 }
      );
    }

    if (classIds.length === 0) {
      console.log(`${requestId} [ROUTE] ERROR: classIds array is empty - returning 400`);
      return NextResponse.json(
        { error: "At least one classId is required" },
        { status: 400 }
      );
    }

    if (classIds.length > 10) {
      console.log(`${requestId} [ROUTE] ERROR: Too many classIds (${classIds.length}) - returning 400`);
      return NextResponse.json(
        { error: "Maximum 10 classIds allowed" },
        { status: 400 }
      );
    }

    // Validate all classIds are strings
    const invalidIds = classIds.filter((id) => typeof id !== "string" || id.trim().length === 0);
    if (invalidIds.length > 0) {
      console.log(`${requestId} [ROUTE] ERROR: Invalid classIds found:`, invalidIds);
      return NextResponse.json(
        { error: "All classIds must be non-empty strings" },
        { status: 400 }
      );
    }

    const trimmedClassIds = classIds.map((id) => id.trim());
    console.log(`${requestId} [ROUTE] Step 4: Validated and trimmed classIds:`, trimmedClassIds);
    console.log(`${requestId} [ROUTE] Step 5: Calling lessonsService.getRecommendations`);

    const result = await lessonsService.getRecommendations(
      { userId },
      { classIds: trimmedClassIds }
    );

    console.log(`${requestId} [ROUTE] Step 6: Service returned result:`, result ? "success" : "null");

    if (!result) {
      console.error(`${requestId} [ROUTE] ERROR: Service returned null - returning 500`);
      return NextResponse.json(
        { error: "Failed to get recommendations" },
        { status: 500 }
      );
    }

    console.log(`${requestId} [ROUTE] SUCCESS: Returning recommendations with status 200`);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error(`${requestId} [ROUTE] EXCEPTION: Error caught in route handler:`, e);
    console.error(`${requestId} [ROUTE] EXCEPTION: Error message:`, e.message);
    console.error(`${requestId} [ROUTE] EXCEPTION: Error stack:`, e.stack);
    
    if (e.message?.includes("Unauthorized")) {
      console.log(`${requestId} [ROUTE] EXCEPTION: Unauthorized error - returning 403`);
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    
    if (e.message?.includes("not found") || e.message?.includes("required")) {
      console.log(`${requestId} [ROUTE] EXCEPTION: Not found/required error - returning 400`);
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    console.log(`${requestId} [ROUTE] EXCEPTION: Generic error - returning 500`);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
