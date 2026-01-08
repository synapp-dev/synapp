/**
 * Topic Slides Bulk Save API route handler.
 *
 * Handles bulk operations: create, update, delete, reorder slides and upload files.
 * Files are uploaded server-side after slides are created (to get UUIDs).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - POST /api/topic-slides/bulk-save - Bulk save all slide changes
 *
 * Request Body (multipart/form-data):
 * - operations: JSON string with structure:
 *   {
 *     topicId: string;
 *     creates: Array<{ orderIndex: number; kind: "text" | "image" | "video"; ... }>;
 *     updates: Array<{ id: string; kind?: string; ... }>;
 *     deletes: string[];
 *     reorder: string[];
 *   }
 * - files: File objects keyed by tempId (e.g., "file_temp_123" for temp slide ID "temp_123")
 *
 * Responses:
 * - 200 OK: Returns success object with updated topic and slides.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsRepo } from "@/server/topics/topics.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { db } from "@/server/db/drizzle";
import { topicSlides } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  console.log("[bulk-save] Starting bulk save request");

  try {
    console.log("[bulk-save] Getting userId from request...");
    const userId = await getUserIdFromRequest(request);
    console.log(
      "[bulk-save] userId:",
      userId ? `Found: ${userId}` : "NOT FOUND"
    );

    if (!userId) {
      console.error("[bulk-save] ERROR: No userId found - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions ONCE at the beginning for the entire bulk operation
    console.log("[bulk-save] Checking user permissions...");
    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      console.error(
        "[bulk-save] ERROR: User does not have PLATFORM_ADMIN role - returning 403"
      );
      return NextResponse.json(
        { error: "Unauthorized to manage topics" },
        { status: 403 }
      );
    }
    console.log("[bulk-save] Permission check passed - user is PLATFORM_ADMIN");

    console.log("[bulk-save] Parsing form data...");
    const formData = await request.formData();
    const operationsJson = formData.get("operations") as string;
    console.log(
      "[bulk-save] operationsJson:",
      operationsJson ? `Found (${operationsJson.length} chars)` : "NOT FOUND"
    );

    if (!operationsJson) {
      console.error(
        "[bulk-save] ERROR: Missing operations data - returning 400"
      );
      return NextResponse.json(
        { error: "Missing operations data" },
        { status: 400 }
      );
    }

    console.log("[bulk-save] Parsing operations JSON...");
    let parsedOperations;
    try {
      parsedOperations = JSON.parse(operationsJson);
      console.log("[bulk-save] Parsed operations:", {
        topicId: parsedOperations.topicId,
        createsCount: parsedOperations.creates?.length || 0,
        updatesCount: parsedOperations.updates?.length || 0,
        deletesCount: parsedOperations.deletes?.length || 0,
        reorderCount: parsedOperations.reorder?.length || 0,
      });
    } catch (parseError) {
      console.error(
        "[bulk-save] ERROR: Failed to parse operations JSON:",
        parseError
      );
      return NextResponse.json(
        { error: "Invalid operations JSON" },
        { status: 400 }
      );
    }

    const { topicId, creates, updates, deletes, reorder } = parsedOperations;

    if (!topicId) {
      console.error("[bulk-save] ERROR: Missing topicId - returning 400");
      return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
    }

    // Step 1: Delete slides first (with file cleanup)
    console.log("[bulk-save] Step 1: Processing deletions...");
    const deletedSlideIds = new Set<string>();
    const supabase = await createServerClient();

    if (deletes && Array.isArray(deletes) && deletes.length > 0) {
      console.log(
        `[bulk-save] Found ${deletes.length} slide(s) to delete:`,
        deletes
      );

      // Get slide data for all slides to be deleted (for file cleanup)
      const slidesToDelete = await Promise.all(
        deletes.map((slideId) =>
          topicsRepo.getSlideWithTopicAndStage(slideId).catch(() => null)
        )
      );

      // Delete files first, then database records
      for (let i = 0; i < deletes.length; i++) {
        const slideId = deletes[i];
        const slideData = slidesToDelete[i];

        console.log(`[bulk-save] Attempting to delete slide: ${slideId}`);

        // Delete file if it exists
        if (
          slideData?.slide.imageUrl &&
          slideData.stage &&
          slideData.topic.stageOrder !== null &&
          slideData.topic.stageOrder !== undefined
        ) {
          try {
            const stageNumberMatch = slideData.stage.code.match(/^S(\d+)$/);
            if (stageNumberMatch) {
              const stageNumber = parseInt(stageNumberMatch[1], 10);
              const topicNumber = slideData.topic.stageOrder;

              let fileExtension = "jpg";
              const urlMatch = slideData.slide.imageUrl.match(
                /\.([a-zA-Z0-9]+)(?:\?|$)/
              );
              if (urlMatch) {
                fileExtension = urlMatch[1];
              }

              const fileName = `${slideId}.${fileExtension}`;
              const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

              await supabase.storage.from("content").remove([filePath]);
            }
          } catch (error) {
            // File deletion is best effort - log but don't fail
            console.warn(`Failed to delete file for slide ${slideId}:`, error);
          }
        }

        // Delete from database
        try {
          await topicsRepo.deleteSlide(slideId);
          console.log(`[bulk-save] Successfully deleted slide: ${slideId}`);
          deletedSlideIds.add(slideId);
        } catch (error: any) {
          console.error(
            `[bulk-save] ERROR: Failed to delete slide ${slideId}:`,
            {
              error: error,
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
            }
          );
          // Continue with other deletions even if one fails
        }
      }
      console.log(
        `[bulk-save] Completed deletions. Successfully deleted ${deletedSlideIds.size} slide(s)`
      );
    } else {
      console.log("[bulk-save] No slides to delete");
    }

    // Step 2: Get current slides to determine max orderIndex
    console.log("[bulk-save] Step 2: Getting current topic data...");
    console.log(
      `[bulk-save] Calling topicsRepo.getWithDetails with topicId: ${topicId}`
    );
    let currentTopicData;
    try {
      currentTopicData = await topicsRepo.getWithDetails(topicId);
      console.log(
        `[bulk-save] Successfully retrieved topic data. Slides count: ${currentTopicData?.slides?.length || 0}`
      );
    } catch (error: any) {
      console.error("[bulk-save] ERROR: Failed to get topic data:", {
        error: error,
        message: error?.message,
        stack: error?.stack,
      });
      throw error;
    }

    const maxOrderIndex =
      currentTopicData?.slides && currentTopicData.slides.length > 0
        ? Math.max(...currentTopicData.slides.map((s) => s.orderIndex))
        : -1;
    console.log(`[bulk-save] Max orderIndex: ${maxOrderIndex}`);

    // Step 3: Create new slides with temporary high orderIndex to avoid conflicts
    console.log("[bulk-save] Step 3: Creating new slides...");
    // Store mapping of tempId -> created slide ID for file uploads
    const tempIdToSlideIdMap = new Map<string, string>();
    const createdSlideIds: string[] = [];
    if (creates && Array.isArray(creates) && creates.length > 0) {
      console.log(`[bulk-save] Found ${creates.length} slide(s) to create`);
      for (let i = 0; i < creates.length; i++) {
        const slideData = creates[i];
        const tempId = slideData.tempId; // Store tempId from client
        // Use a temporary high orderIndex to avoid unique constraint violations
        // We'll reorder everything after all operations
        const tempOrderIndex = maxOrderIndex + 1000 + i;

        // Ensure textHtml is set for text slides
        const textHtml =
          slideData.kind === "text"
            ? slideData.textHtml || ""
            : slideData.textHtml;

        // Create slide WITHOUT imageUrl first (we'll upload file and update after)
        const createPayload = {
          topicId,
          orderIndex: tempOrderIndex,
          kind: slideData.kind,
          imageUrl: null, // Don't set imageUrl yet, we'll upload file first
          videoUrl: slideData.videoUrl || null,
          textHtml: textHtml || null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
        };

        console.log(
          `[bulk-save] Creating slide ${i + 1}/${creates.length} with tempId: ${tempId}`
        );
        try {
          const result = await topicsRepo.createSlide(createPayload);
          if (result?.[0]?.id) {
            const slideId = result[0].id;
            console.log(
              `[bulk-save] Successfully created slide with ID: ${slideId}`
            );
            createdSlideIds.push(slideId);
            if (tempId) {
              tempIdToSlideIdMap.set(tempId, slideId);
            }
          } else {
            console.warn(`[bulk-save] Created slide but no ID returned`);
          }
        } catch (error: any) {
          console.error(`[bulk-save] ERROR: Failed to create slide ${i + 1}:`, {
            error: error,
            message: error?.message,
            stack: error?.stack,
          });
          throw error;
        }
      }
      console.log(
        `[bulk-save] Completed creating ${createdSlideIds.length} slide(s)`
      );
    } else {
      console.log("[bulk-save] No slides to create");
    }

    // Step 3.5: Upload files for newly created slides using their UUIDs
    const uploadedUrls: Record<string, string> = {}; // slideId -> publicUrl

    // Get topic info for file paths
    const topicData = await topicsRepo.getWithDetails(topicId);
    if (!topicData) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const stage = topicData.stage;
    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    // Extract stage number from stage.code (e.g., "S1" -> 1)
    const stageNumberMatch = stage.code.match(/^S(\d+)$/);
    if (!stageNumberMatch) {
      return NextResponse.json(
        { error: "Invalid stage code format" },
        { status: 400 }
      );
    }
    const stageNumber = parseInt(stageNumberMatch[1], 10);
    const topicNumber = topicData.stageOrder;
    if (topicNumber === null || topicNumber === undefined) {
      return NextResponse.json(
        { error: "Topic stageOrder is missing" },
        { status: 400 }
      );
    }

    // Process file uploads for new slides
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const tempId = key.replace("file_", "");
        const file = value;
        const slideId = tempIdToSlideIdMap.get(tempId);

        if (slideId) {
          // Get file extension
          const fileExtension = file.name.split(".").pop() || "jpg";
          const fileName = `${slideId}.${fileExtension}`;
          const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

          // Convert File to ArrayBuffer for server-side upload
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Upload file
          const { error: uploadError } = await supabase.storage
            .from("content")
            .upload(filePath, buffer, {
              cacheControl: "3600",
              upsert: true,
              contentType: file.type,
            });

          if (uploadError) {
            console.error(
              `Failed to upload file for slide ${slideId}:`,
              uploadError
            );
            return NextResponse.json(
              {
                error: `Failed to upload file for slide ${slideId}: ${uploadError.message}`,
              },
              { status: 500 }
            );
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("content").getPublicUrl(filePath);

          if (publicUrl) {
            uploadedUrls[slideId] = publicUrl;
          }
        }
      }
    }

    // Step 3.6: Update newly created slides with imageUrl if files were uploaded
    for (const [slideId, imageUrl] of Object.entries(uploadedUrls)) {
      await topicsRepo.updateSlide(slideId, { imageUrl });
    }

    // Step 3.7: Upload files for existing slides that have pending uploads
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const slideId = key.replace("file_", "");
        // Skip if this is a tempId (already handled above)
        if (slideId.startsWith("temp_")) continue;

        const file = value;

        // Get file extension
        const fileExtension = file.name.split(".").pop() || "jpg";
        const fileName = `${slideId}.${fileExtension}`;
        const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

        // Convert File to ArrayBuffer for server-side upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from("content")
          .upload(filePath, buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          console.error(
            `Failed to upload file for slide ${slideId}:`,
            uploadError
          );
          return NextResponse.json(
            {
              error: `Failed to upload file for slide ${slideId}: ${uploadError.message}`,
            },
            { status: 500 }
          );
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("content").getPublicUrl(filePath);

        if (publicUrl) {
          uploadedUrls[slideId] = publicUrl;
        }
      }
    }

    // Step 4: Update existing slides (but don't update orderIndex here)
    console.log("[bulk-save] Step 4: Updating existing slides...");
    if (updates && Array.isArray(updates) && updates.length > 0) {
      console.log(`[bulk-save] Found ${updates.length} slide(s) to update`);
      for (const slideData of updates) {
        console.log(`[bulk-save] Updating slide: ${slideData.id}`);
        const updateData: any = { ...slideData };
        delete updateData.id; // Remove id from update data
        delete updateData.orderIndex; // Don't update orderIndex here, reorder handles it

        // If there's an uploaded file for this slide, use its URL
        if (uploadedUrls[slideData.id]) {
          updateData.imageUrl = uploadedUrls[slideData.id];
        }

        try {
          await topicsRepo.updateSlide(slideData.id, updateData);
          console.log(
            `[bulk-save] Successfully updated slide: ${slideData.id}`
          );
        } catch (error: any) {
          console.error(
            `[bulk-save] ERROR: Failed to update slide ${slideData.id}:`,
            {
              error: error,
              message: error?.message,
              stack: error?.stack,
            }
          );
          throw error;
        }
      }
      console.log(`[bulk-save] Completed updating ${updates.length} slide(s)`);
    } else {
      console.log("[bulk-save] No slides to update");
    }

    // Step 5: Reorder slides (this will normalize orderIndex and handle all slides)
    console.log("[bulk-save] Step 5: Reordering slides...");
    // Build the final order: merge existing slides (from reorder) with new slides (from creates)
    if (reorder && Array.isArray(reorder) && reorder.length > 0) {
      console.log(`[bulk-save] Reorder array has ${reorder.length} slide(s)`);
      // Filter out deleted slide IDs from reorder array
      const validReorderIds = reorder.filter(
        (slideId) => !deletedSlideIds.has(slideId)
      );
      console.log(
        `[bulk-save] After filtering deleted slides, ${validReorderIds.length} slide(s) remain`
      );

      // Create pairs of [orderIndex, slideId] for new slides
      const newSlidePositions: Array<[number, string]> = [];
      if (creates && Array.isArray(creates) && createdSlideIds.length > 0) {
        creates.forEach((createData: any, index: number) => {
          if (index < createdSlideIds.length) {
            newSlidePositions.push([
              createData.orderIndex,
              createdSlideIds[index],
            ]);
          }
        });
        // Sort by orderIndex
        newSlidePositions.sort((a, b) => a[0] - b[0]);
      }

      // Build final order by inserting new slides at their intended positions
      // The orderIndex values from creates represent the final position in the sorted array
      // The reorder array contains existing slide IDs in the order they appear in the frontend's sorted array
      // The frontend has already calculated the correct order, so we just need to merge them correctly

      // Calculate total number of slides in final order
      const totalSlides = validReorderIds.length + newSlidePositions.length;

      const finalOrder: string[] = [];
      let existingIndex = 0;
      let newSlideIndex = 0;

      // Build final order by going through each position
      for (
        let currentPosition = 0;
        currentPosition < totalSlides;
        currentPosition++
      ) {
        // Check if a new slide should be inserted at this position
        if (
          newSlideIndex < newSlidePositions.length &&
          newSlidePositions[newSlideIndex][0] === currentPosition
        ) {
          // Insert new slide at this position
          finalOrder.push(newSlidePositions[newSlideIndex][1]);
          newSlideIndex++;
        } else if (existingIndex < validReorderIds.length) {
          // This position should be filled by an existing slide
          // The reorder array contains existing slides in their final order
          // We place them sequentially, skipping positions where new slides go
          finalOrder.push(validReorderIds[existingIndex]);
          existingIndex++;
        }
      }

      console.log(`[bulk-save] Final order has ${finalOrder.length} slide(s)`);

      // Validate that all slides belong to this topic (security check)
      if (finalOrder.length > 0) {
        console.log(
          "[bulk-save] Validating slide ownership before reordering..."
        );

        // Get current slides after creates/deletes to validate ownership
        // Use a targeted query to check only the slides in finalOrder
        const slidesToValidate = await db
          .select({ id: topicSlides.id })
          .from(topicSlides)
          .where(
            and(
              eq(topicSlides.topicId, topicId),
              inArray(topicSlides.id, finalOrder)
            )
          );

        const validSlideIds = new Set(slidesToValidate.map((s) => s.id));

        // Check if all slides in finalOrder belong to this topic
        const invalidSlideIds = finalOrder.filter(
          (slideId) => !validSlideIds.has(slideId)
        );

        if (invalidSlideIds.length > 0) {
          console.error(
            `[bulk-save] ERROR: Found ${invalidSlideIds.length} slide(s) that do not belong to topic ${topicId}:`,
            invalidSlideIds
          );
          return NextResponse.json(
            {
              error: `Some slides do not belong to this topic: ${invalidSlideIds.join(", ")}`,
            },
            { status: 400 }
          );
        }

        // Verify that finalOrder length matches expected count (existing + new - deleted)
        // We already have currentTopicData from earlier, but need to account for creates/deletes
        const expectedCount =
          (currentTopicData?.slides?.length || 0) +
          createdSlideIds.length -
          deletedSlideIds.size;

        if (finalOrder.length !== expectedCount) {
          console.warn(
            `[bulk-save] WARNING: Final order count (${finalOrder.length}) does not match expected count (${expectedCount}). Proceeding anyway.`
          );
        }

        console.log(
          "[bulk-save] Validation passed - all slides belong to topic"
        );
      }

      console.log(
        `[bulk-save] Calling topicsRepo.reorderSlides with topicId: ${topicId}`
      );
      try {
        await topicsRepo.reorderSlides(topicId, finalOrder);
        console.log("[bulk-save] Successfully reordered slides");
      } catch (error: any) {
        console.error("[bulk-save] ERROR: Failed to reorder slides:", {
          error: error,
          message: error?.message,
          stack: error?.stack,
        });
        throw error;
      }
    } else {
      // If no explicit reorder provided, normalize order based on current state
      console.log(
        "[bulk-save] No explicit reorder provided, normalizing order..."
      );
      try {
        const topicDataAfterOps = await topicsRepo.getWithDetails(topicId);
        if (topicDataAfterOps?.slides && topicDataAfterOps.slides.length > 0) {
          const slideIds = topicDataAfterOps.slides
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => s.id);
          console.log(
            `[bulk-save] Normalizing order for ${slideIds.length} slide(s)`
          );
          await topicsRepo.reorderSlides(topicId, slideIds);
          console.log("[bulk-save] Successfully normalized slide order");
        }
      } catch (error: any) {
        console.error("[bulk-save] ERROR: Failed to normalize order:", {
          error: error,
          message: error?.message,
          stack: error?.stack,
        });
        throw error;
      }
    }

    // Step 6: Return updated topic with slides
    console.log("[bulk-save] Step 6: Fetching final topic data...");
    console.log(
      `[bulk-save] Calling topicsRepo.getWithDetails with topicId: ${topicId}`
    );
    let finalTopicData;
    try {
      finalTopicData = await topicsRepo.getWithDetails(topicId);
      console.log(
        `[bulk-save] Successfully retrieved final topic data. Slides count: ${finalTopicData?.slides?.length || 0}`
      );
    } catch (error: any) {
      console.error("[bulk-save] ERROR: Failed to get final topic data:", {
        error: error,
        message: error?.message,
        stack: error?.stack,
      });
      throw error;
    }

    console.log("[bulk-save] SUCCESS: Returning response");
    return NextResponse.json(
      { success: true, topic: finalTopicData },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[bulk-save] FATAL ERROR:", {
      error: e,
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
      userId: e?.userId,
    });

    // Check if this is an authorization error
    if (e?.message?.includes("Unauthorized") || e?.message?.includes("401")) {
      console.error("[bulk-save] Authorization error detected - returning 401");
      return NextResponse.json(
        { error: e.message ?? "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
