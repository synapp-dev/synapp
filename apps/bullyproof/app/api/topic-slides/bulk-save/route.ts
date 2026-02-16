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
 *     creates: Array<{ position?: string; kind: "text" | "image" | "video"; ... }>;
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
import { topicsService } from "@/server/topics/topics.service";
import { topicSlidesRepo } from "@/server/topic-slides/topic-slides.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { checkFeatureAccess } from "@/server/features/features.service";
import { refreshSignedUrlIfStale } from "@/server/lib/signed-url";
import { db } from "@/server/db/drizzle";
import { topicSlides } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getTopicSlideStoragePath } from "@/server/lib/slide-storage-path";
import { generateNKeysBetween } from "fractional-indexing";
import { compareSlidesByPosition } from "@/server/lib/fractional-position";

// Configure route to handle large payloads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for large uploads

/**
 * Helper function to check if a slide has valid content
 * Returns true if the slide has content, false if it's empty
 */
/**
 * Checks if a slide has valid content (no storage API calls needed).
 * If imageUrl/videoUrl is set, we trust the file exists — no storage.list() check.
 */
function slideHasContent(
  slide: {
    id: string;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
  }
): boolean {
  if (slide.kind === "text") {
    return !!slide.textHtml && slide.textHtml.trim() !== "";
  }
  if (slide.kind === "video") {
    return !!slide.videoUrl && slide.videoUrl.trim() !== "";
  }
  if (slide.kind === "image") {
    return !!slide.imageUrl && slide.imageUrl.trim() !== "";
  }
  // Unknown kind — assume valid
  return true;
}

export async function POST(request: Request) {
  console.log("[bulk-save] Starting bulk save request");

  try {
    // Check Content-Length header to warn about large payloads
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const sizeInMB = parseInt(contentLength, 10) / (1024 * 1024);
      console.log(`[bulk-save] Request size: ${sizeInMB.toFixed(2)} MB`);
      
      // Warn if payload is very large (Vercel limit is ~4.5MB for serverless functions)
      if (sizeInMB > 4) {
        console.warn(
          `[bulk-save] WARNING: Large payload detected (${sizeInMB.toFixed(2)} MB). This may exceed serverless function limits.`
        );
      }
    }

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

    const hasAdminContent = await checkFeatureAccess(userId, "/admin/content");
    if (!hasAdminContent) {
      return NextResponse.json(
        { error: "Unauthorized to manage topics" },
        { status: 403 }
      );
    }

    console.log("[bulk-save] Parsing form data...");
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error: any) {
      console.error("[bulk-save] ERROR: Failed to parse FormData:", {
        error: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      
      // Check if it's a payload size error
      if (
        error?.message?.includes("Too Large") ||
        error?.message?.includes("Payload") ||
        error?.message?.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
        error?.message?.includes("413")
      ) {
        return NextResponse.json(
          {
            error:
              "Upload too large. Please try uploading fewer slides at once, or compress your images before uploading.",
          },
          { status: 413 }
        );
      }
      
      // Check if it's a FormData parsing error
      if (error?.message?.includes("FormData") || error?.message?.includes("parse")) {
        return NextResponse.json(
          {
            error:
              "Failed to process upload. The request may be too large. Please try uploading fewer slides at once.",
          },
          { status: 400 }
        );
      }
      
      throw error; // Re-throw if it's an unexpected error
    }
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

    const { topicId, creates, updates, deletes, reorder, desiredOrder } =
      parsedOperations;

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

        console.log(`[bulk-save] Attempting to delete slide:`, {
          id: slideId,
          kind: slideData?.slide?.kind || "unknown",
          position: slideData?.slide?.position,
          imageUrl: slideData?.slide?.imageUrl ? "exists" : "missing",
          videoUrl: slideData?.slide?.videoUrl ? "exists" : "missing",
          textHtml: slideData?.slide?.textHtml ? "exists" : "missing",
        });

        // Delete file from storage if it exists
        if (slideData?.slide.imageUrl && !slideData.slide.imageUrl.startsWith("blob:")) {
          try {
            // Extract storage path from URL if needed (legacy data has full public URLs)
            let storagePath = slideData.slide.imageUrl;
            if (storagePath.startsWith("http")) {
              const publicUrlPattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
              const match = storagePath.match(publicUrlPattern);
              storagePath = match ? match[1] : "";
            }
            if (storagePath) {
              await supabase.storage.from("content").remove([storagePath]);
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

    // Step 2: Get current slides (for position calculation when creating)
    console.log("[bulk-save] Step 2: Getting current topic data...");
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

    const existingSlides = currentTopicData?.slides ?? [];
    const lastPosition =
      existingSlides.length > 0
        ? existingSlides[existingSlides.length - 1].position
        : null;

    // Step 2.5: Filter creates - skip image slides that have no corresponding file in formData (prevents ghost slides)
    let filteredCreates = creates && Array.isArray(creates) ? creates : [];
    const tempIdsWithFiles = new Set<string>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const tempId = key.replace("file_", "");
        tempIdsWithFiles.add(tempId);
      }
    }
    if (filteredCreates.length > 0) {
      const beforeCount = filteredCreates.length;
      filteredCreates = filteredCreates.filter((slideData: any) => {
        if (slideData.kind === "image") {
          const tempId = slideData.tempId;
          const hasFile = tempId && tempIdsWithFiles.has(tempId);
          if (!hasFile) {
            console.log(
              `[bulk-save] Skipping image create (no file): tempId=${tempId} - prevents ghost slide`
            );
            return false;
          }
        }
        return true;
      });
      if (filteredCreates.length < beforeCount) {
        console.log(
          `[bulk-save] Filtered ${beforeCount - filteredCreates.length} image create(s) without files`
        );
      }
    }

    // Step 3: Create new slides with positions (append at end; reorder will fix)
    console.log("[bulk-save] Step 3: Creating new slides...");
    const tempIdToSlideIdMap = new Map<string, string>();
    const createdSlideIds: string[] = [];
    if (filteredCreates.length > 0) {
      console.log(`[bulk-save] Found ${filteredCreates.length} slide(s) to create`);
      const newPositions = generateNKeysBetween(lastPosition, null, filteredCreates.length);

      const createPayloads = filteredCreates.map((slideData: any, i: number) => {
        const textHtml =
          slideData.kind === "text"
            ? slideData.textHtml || ""
            : slideData.textHtml;

        const payload = {
          topicId,
          position: slideData.position ?? newPositions[i],
          kind: slideData.kind,
          imageUrl: null,
          videoUrl: slideData.videoUrl || null,
          textHtml: textHtml || null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
        };
        
        console.log(`[bulk-save] Creating slide ${i + 1}/${filteredCreates.length}:`, {
          tempId: slideData.tempId,
          kind: payload.kind,
          hasVideoUrl: !!payload.videoUrl,
          hasTextHtml: !!payload.textHtml,
          hasImageUrl: !!payload.imageUrl,
          willHaveFileUpload: true, // We expect a file upload for image slides
        });
        
        return payload;
      });

      console.log(`[bulk-save] Batch creating ${createPayloads.length} slide(s)`);
      try {
        // Batch insert all slides at once
        const createdSlides = await db
          .insert(topicSlides)
          .values(createPayloads)
          .returning();

        // Map tempId to slideId for file uploads
        createdSlides.forEach((slide, index) => {
          const slideData = filteredCreates[index];
          const tempId = slideData?.tempId;
          
          if (slide?.id) {
            createdSlideIds.push(slide.id);
            if (tempId) {
              tempIdToSlideIdMap.set(tempId, slide.id);
            }
            
            // Log all created slides with their details
            console.log(`[bulk-save] Created slide:`, {
              id: slide.id,
              kind: slide.kind,
              position: slide.position,
              topicId: slide.topicId,
              imageUrl: slide.imageUrl || null,
              videoUrl: slide.videoUrl || null,
              textHtml: slide.textHtml ? (slide.textHtml.substring(0, 50) + "...") : null,
              videoStartS: slide.videoStartS || null,
              videoEndS: slide.videoEndS || null,
            });
          }
        });

        console.log(
          `[bulk-save] Successfully batch created ${createdSlides.length} slide(s)`
        );
      } catch (error: any) {
        console.error(`[bulk-save] ERROR: Failed to batch create slides:`, {
          error: error,
          message: error?.message,
          stack: error?.stack,
        });
        throw error;
      }
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

    // Use stageId and topicId for paths - stable, never breaks on rename
    const stageId = stage.id;
    const topicIdForPath = topicData.id;

    // Process file uploads for new slides
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const tempId = key.replace("file_", "");
        const file = value;
        const slideId = tempIdToSlideIdMap.get(tempId);

        if (slideId) {
          // Get file extension
          const fileExtension = file.name.split(".").pop() || "jpg";
          const filePath = getTopicSlideStoragePath(
            stageId,
            topicIdForPath,
            slideId,
            fileExtension
          );

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

          // Store the storage path directly (not the public URL)
          // The signed URL helper will use this path to generate signed URLs on demand
          uploadedUrls[slideId] = filePath;
        }
      }
    }

    // Step 3.6: Update newly created slides with imageUrl if files were uploaded
    console.log(`[bulk-save] Updating ${Object.keys(uploadedUrls).length} slide(s) with uploaded image URLs`);
    for (const [slideId, imageUrl] of Object.entries(uploadedUrls)) {
      console.log(`[bulk-save] Updating slide ${slideId} with imageUrl:`, imageUrl?.substring(0, 50) + "...");
      await topicsRepo.updateSlide(slideId, { imageUrl });
    }
    
    // Check for slides that were created but don't have image URLs
    const slidesWithoutImages = createdSlideIds.filter(id => !uploadedUrls[id]);
    if (slidesWithoutImages.length > 0) {
      console.warn(`[bulk-save] WARNING: ${slidesWithoutImages.length} slide(s) were created but have no image URL:`, slidesWithoutImages);
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
        const filePath = getTopicSlideStoragePath(
          stageId,
          topicIdForPath,
          slideId,
          fileExtension
        );

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

        // Store the storage path directly (not the public URL)
        uploadedUrls[slideId] = filePath;
      }
    }

    // Step 4: Update existing slides (reorder handles positions)
    console.log("[bulk-save] Step 4: Updating existing slides...");
    if (updates && Array.isArray(updates) && updates.length > 0) {
      console.log(`[bulk-save] Found ${updates.length} slide(s) to update`);
      for (const slideData of updates) {
        console.log(`[bulk-save] Updating slide:`, {
          id: slideData.id,
          kind: slideData.kind,
          position: slideData.position || null,
          imageUrl: slideData.imageUrl || null,
          videoUrl: slideData.videoUrl || null,
          textHtml: slideData.textHtml ? (slideData.textHtml.substring(0, 50) + "...") : null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
          hasUploadedFile: !!uploadedUrls[slideData.id],
        });
        
        const updateData: any = { ...slideData };
        delete updateData.id;
        delete updateData.position; // Reorder handles positions

        // If there's an uploaded file for this slide, use its URL
        if (uploadedUrls[slideData.id]) {
          updateData.imageUrl = uploadedUrls[slideData.id];
          console.log(`[bulk-save] Setting imageUrl from uploaded file for slide ${slideData.id}`);
        } else if (slideData.kind === "image" && !updateData.imageUrl) {
          console.warn(`[bulk-save] WARNING: Image slide ${slideData.id} has no imageUrl and no uploaded file!`);
        }

        try {
          await topicsRepo.updateSlide(slideData.id, updateData);
          console.log(`[bulk-save] Successfully updated slide:`, {
            id: slideData.id,
            kind: slideData.kind,
            finalImageUrl: updateData.imageUrl || null,
            finalVideoUrl: updateData.videoUrl || null,
            finalTextHtml: updateData.textHtml ? (updateData.textHtml.substring(0, 50) + "...") : null,
          });
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

    // Step 5: Reorder slides (assigns positions to all slides)
    console.log("[bulk-save] Step 5: Reordering slides...");

    let finalOrder: string[] | null = null;

    // Prefer desiredOrder when present: canonical list of IDs (existing + temp) in final order.
    // Resolve temp IDs and filter deleted for a single source of truth.
    if (desiredOrder && Array.isArray(desiredOrder) && desiredOrder.length > 0) {
      console.log(`[bulk-save] Using desiredOrder with ${desiredOrder.length} slide(s)`);
      finalOrder = desiredOrder
        .map((id: string) => tempIdToSlideIdMap.get(id) ?? id)
        .filter((id: string) => !deletedSlideIds.has(id));
      console.log(
        `[bulk-save] After resolving temp IDs and filtering deleted, ${finalOrder.length} slide(s) remain`
      );
    } else if (reorder && Array.isArray(reorder) && reorder.length > 0) {
      // Fallback: legacy merge of reorder + creates
      console.log(`[bulk-save] Reorder array has ${reorder.length} slide(s)`);
      const validReorderIds = reorder.filter(
        (slideId: string) => !deletedSlideIds.has(slideId)
      );

      const newSlidePositions: Array<[number, string]> = [];
      if (filteredCreates.length > 0 && createdSlideIds.length > 0) {
        filteredCreates.forEach((_, index: number) => {
          if (index < createdSlideIds.length) {
            newSlidePositions.push([
              validReorderIds.length + index,
              createdSlideIds[index],
            ]);
          }
        });
        newSlidePositions.sort((a, b) => a[0] - b[0]);
      }

      const totalSlides = validReorderIds.length + newSlidePositions.length;
      finalOrder = [];
      let existingIndex = 0;
      let newSlideIndex = 0;

      for (
        let currentPosition = 0;
        currentPosition < totalSlides;
        currentPosition++
      ) {
        if (
          newSlideIndex < newSlidePositions.length &&
          newSlidePositions[newSlideIndex][0] === currentPosition
        ) {
          finalOrder.push(newSlidePositions[newSlideIndex][1]);
          newSlideIndex++;
        } else if (existingIndex < validReorderIds.length) {
          finalOrder.push(validReorderIds[existingIndex]);
          existingIndex++;
        }
      }
      console.log(`[bulk-save] Final order has ${finalOrder.length} slide(s)`);
    }

    if (finalOrder && finalOrder.length > 0) {

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
        `[bulk-save] Calling topicsService.reorderSlides with topicId: ${topicId}`
      );
      try {
        await topicsService.reorderSlides({ userId }, {
          topicId,
          slideIds: finalOrder,
        });
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
            .sort(compareSlidesByPosition)
            .map((s) => s.id);
          console.log(
            `[bulk-save] Normalizing order for ${slideIds.length} slide(s)`
          );
          await topicsService.reorderSlides({ userId }, {
            topicId,
            slideIds,
          });
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

    // Step 6: Cleanup - Remove empty slides
    // SAFETY: Only delete slides that are CLEARLY empty (no content at all)
    // We are conservative - if there's any uncertainty, we keep the slide
    console.log("[bulk-save] Step 6: Cleaning up empty slides (conservative mode)...");
    let topicDataForCleanup;
    try {
      topicDataForCleanup = await topicsRepo.getWithDetails(topicId);
    } catch (error: any) {
      console.error("[bulk-save] ERROR: Failed to get topic data for cleanup:", {
        error: error,
        message: error?.message,
      });
      // Skip cleanup if we can't get data - better safe than sorry
      console.log("[bulk-save] [cleanup] Skipping cleanup due to error - keeping all slides");
      topicDataForCleanup = null;
    }

    // Track slides that were just created/updated in this request - NEVER delete these
    const slidesModifiedInThisRequest = new Set<string>([
      ...createdSlideIds,
      ...(updates?.map((u: any) => u.id) || []),
    ]);

    if (topicDataForCleanup?.slides && topicDataForCleanup.slides.length > 0) {
      const topicData = topicDataForCleanup;
      
      console.log("[bulk-save] [cleanup] Cleanup context:", {
        stageId: topicDataForCleanup.stage?.id,
        topicId: topicData.id,
        totalSlides: topicDataForCleanup.slides.length,
        slidesModifiedInThisRequest: slidesModifiedInThisRequest.size,
        protectedSlides: Array.from(slidesModifiedInThisRequest),
      });

      // Check each slide for content
      // SAFETY: Only mark for deletion if slide is CLEARLY empty AND wasn't just modified
      const emptySlideIds: string[] = [];
      for (const slide of topicDataForCleanup.slides) {
        // Log all slides being checked during cleanup
        console.log(`[bulk-save] [cleanup] Checking slide:`, {
          id: slide.id,
          kind: slide.kind,
          position: slide.position,
          imageUrl: slide.imageUrl || null,
          videoUrl: slide.videoUrl || null,
          textHtml: slide.textHtml ? (slide.textHtml.substring(0, 50) + "...") : null,
        });

        // SAFETY CHECK: Protect slides that were modified AND have content.
        // Allow cleanup of empty newly-created slides (ghost slides) - they were created without
        // a file upload and should not persist.
        if (slidesModifiedInThisRequest.has(slide.id)) {
          const hasContent = slideHasContent(slide);
          if (hasContent) {
            console.log(
              `[bulk-save] [cleanup] PROTECTED: Skipping slide ${slide.id} - was modified and has content`
            );
            continue;
          }
          console.log(
            `[bulk-save] [cleanup] Allowing cleanup of empty modified slide: ${slide.id} (ghost slide)`
          );
          emptySlideIds.push(slide.id);
          continue;
        }

        // SAFETY CHECK: Only check slides that are clearly empty (no URL fields at all)
        // If slide has any URL field set, we verify it exists before deleting
        const hasAnyUrl = !!slide.imageUrl || !!slide.videoUrl || !!slide.textHtml;
        
        if (!hasAnyUrl) {
          // Slide has no content fields at all - safe to delete
          emptySlideIds.push(slide.id);
          console.log(
            `[bulk-save] [cleanup] Marking clearly empty slide for deletion: ${slide.id} (kind: ${slide.kind}, position: ${slide.position}, no URLs at all)`
          );
          continue;
        }

        // For slides with URLs, verify they're actually empty
        const hasContent = slideHasContent(slide);
        
        if (!hasContent) {
          // Double-check: Only delete if we're CERTAIN it's empty
          // slideHasContent already returns true on uncertainty, so if it returns false, we're sure
          emptySlideIds.push(slide.id);
          console.log(
            `[bulk-save] [cleanup] Marking verified empty slide for deletion: ${slide.id} (kind: ${slide.kind}, position: ${slide.position})`
          );
        } else {
          console.log(
            `[bulk-save] [cleanup] Keeping slide ${slide.id} - has content or verification uncertain`
          );
        }
      }

      // Delete empty slides if any found
      // SAFETY: Log detailed info before deletion for audit trail
      if (emptySlideIds.length > 0) {
        console.log(
          `[bulk-save] [cleanup] Found ${emptySlideIds.length} empty slide(s) to delete:`,
          emptySlideIds
        );
        
        // Log details of each slide being deleted for audit
        for (const slideId of emptySlideIds) {
          const slide = topicDataForCleanup.slides.find((s: any) => s.id === slideId);
          if (slide) {
            console.log(`[bulk-save] [cleanup] Slide to delete:`, {
              id: slide.id,
              kind: slide.kind,
              position: slide.position,
              imageUrl: slide.imageUrl ? "exists but invalid" : "missing",
              videoUrl: slide.videoUrl ? "exists" : "missing",
              textHtml: slide.textHtml ? "exists" : "missing",
            });
          }
        }
        
        for (const slideId of emptySlideIds) {
          try {
            // SAFETY: Double-check slide still exists and is still empty before deleting
            const slideData = await topicsRepo.getSlideWithTopicAndStage(slideId);
            if (!slideData) {
              console.log(
                `[bulk-save] [cleanup] Slide ${slideId} already deleted, skipping`
              );
              continue;
            }

            // Final safety check: Verify slide is still empty before deleting
            // slideHasContent returns true if slide HAS content, false if empty
            const hasContent = slideHasContent(slideData.slide);
            
            // Only delete if we're CERTAIN it's empty (hasContent === false)
            if (!hasContent) {
              // Delete file if it exists — imageUrl is the storage path
              if (
                slideData.slide.kind === "image" &&
                slideData.slide.imageUrl &&
                !slideData.slide.imageUrl.startsWith("blob:")
              ) {
                try {
                  // Extract storage path from URL if needed (legacy data has full URLs)
                  const publicUrlPattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
                  const match = slideData.slide.imageUrl.match(publicUrlPattern);
                  const storagePath = match ? match[1] : slideData.slide.imageUrl;

                  await supabase.storage.from("content").remove([storagePath]);
                  console.log(
                    `[bulk-save] [cleanup] Deleted file for empty slide: ${storagePath}`
                  );
                } catch (fileError: any) {
                  // File deletion is best effort - log but don't fail
                  console.warn(
                    `[bulk-save] [cleanup] Failed to delete file for slide ${slideId}:`,
                    fileError.message
                  );
                }
              }

              // Delete slide from database
              await topicsRepo.deleteSlide(slideId);
              console.log(
                `[bulk-save] [cleanup] Successfully deleted empty slide: ${slideId}`
              );
            } else {
              console.warn(
                `[bulk-save] [cleanup] SAFETY: Slide ${slideId} now has content, skipping deletion`
              );
            }
          } catch (deleteError: any) {
            console.error(
              `[bulk-save] [cleanup] ERROR: Failed to delete empty slide ${slideId}:`,
              {
                error: deleteError,
                message: deleteError?.message,
              }
            );
            // Continue with other deletions even if one fails
          }
        }

        // Reorder remaining slides after cleanup
        const remainingTopicData = await topicsRepo.getWithDetails(topicId);
        if (remainingTopicData?.slides && remainingTopicData.slides.length > 0) {
          const remainingSlideIds = remainingTopicData.slides
            .sort(compareSlidesByPosition)
            .map((s) => s.id);
          
          if (remainingSlideIds.length > 0) {
            await topicsService.reorderSlides({ userId }, {
              topicId,
              slideIds: remainingSlideIds,
            });
            console.log(
              `[bulk-save] [cleanup] Reordered ${remainingSlideIds.length} remaining slides`
            );
          }
        }
      } else {
        console.log("[bulk-save] [cleanup] No empty slides found - all slides have content ✓");
      }
    }

    // Step 7: Return updated topic with slides
    console.log("[bulk-save] Step 7: Fetching final topic data...");
    console.log(
      `[bulk-save] Calling topicsRepo.getWithDetails with topicId: ${topicId}`
    );
    let finalTopicData;
    try {
      finalTopicData = await topicsRepo.getWithDetails(topicId);
      const slidesCount = finalTopicData?.slides?.length || 0;
      console.log(
        `[bulk-save] Successfully retrieved final topic data. Slides count: ${slidesCount}`
      );
      
      // Final verification - check for any remaining empty slides
      if (finalTopicData?.slides) {
        const remainingEmptySlides = [];
        for (const slide of finalTopicData.slides) {
          const hasContent = slideHasContent(slide);
          if (!hasContent) {
            remainingEmptySlides.push(slide);
          }
        }
        
        if (remainingEmptySlides.length > 0) {
          console.error(
            `[bulk-save] WARNING: Found ${remainingEmptySlides.length} empty slide(s) still in database after cleanup:`,
            remainingEmptySlides.map((s: any) => ({
              id: s.id,
              kind: s.kind,
              position: s.position,
            }))
          );
        } else {
          console.log("[bulk-save] All slides in final data have content ✓");
        }
      }
    } catch (error: any) {
      console.error("[bulk-save] ERROR: Failed to get final topic data:", {
        error: error,
        message: error?.message,
        stack: error?.stack,
      });
      throw error;
    }

    // Enrich slides with signed URLs so the client can display images without a refetch
    if (finalTopicData?.slides && finalTopicData.slides.length > 0) {
      const updateFn = topicSlidesRepo.updateSignedUrl;
      const slidesWithUrls = await Promise.all(
        finalTopicData.slides.map(async (slide: any) => {
          if (slide.kind !== "image" || !slide.imageUrl) {
            return slide;
          }
          const signedUrl = await refreshSignedUrlIfStale(
            slide,
            slide.imageUrl,
            updateFn
          );
          return { ...slide, signedUrl };
        })
      );
      finalTopicData = { ...finalTopicData, slides: slidesWithUrls };
    }

    // Include tempId->slideId mapping so chunked frontend can resolve desiredOrder
    const createdSlideMapping: Record<string, string> = {};
    filteredCreates.forEach((createData: any, index: number) => {
      const tempId = createData.tempId;
      if (tempId && index < createdSlideIds.length) {
        createdSlideMapping[tempId] = createdSlideIds[index];
      }
    });

    console.log("[bulk-save] SUCCESS: Returning response");
    return NextResponse.json(
      {
        success: true,
        topic: finalTopicData,
        ...(Object.keys(createdSlideMapping).length > 0 && {
          createdSlideMapping,
        }),
      },
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

    // Check if this is a payload size error
    if (
      e?.message?.includes("Too Large") ||
      e?.message?.includes("Payload") ||
      e?.message?.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
      e?.message?.includes("413") ||
      e?.message?.includes("Request Entity Too Large")
    ) {
      console.error("[bulk-save] Payload too large error detected - returning 413");
      return NextResponse.json(
        {
          error:
            "Upload too large. Please try uploading fewer slides at once, or compress your images before uploading. Maximum recommended: 10-15 slides per upload.",
        },
        { status: 413 }
      );
    }

    // Check if this is a FormData parsing error
    if (
      e?.message?.includes("FormData") ||
      e?.message?.includes("Failed to parse body as FormData")
    ) {
      console.error("[bulk-save] FormData parsing error detected - returning 400");
      return NextResponse.json(
        {
          error:
            "Failed to process upload. The request may be too large or corrupted. Please try uploading fewer slides at once.",
        },
        { status: 400 }
      );
    }

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
