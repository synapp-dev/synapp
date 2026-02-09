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
import { checkFeatureAccess } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import { topicSlides } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Configure route to handle large payloads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for large uploads

/**
 * Helper function to check if a slide has valid content
 * Returns true if the slide has content, false if it's empty
 */
async function slideHasContent(
  slide: {
    id: string;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
  },
  supabase: any,
  stageNumber?: number,
  topicNumber?: number
): Promise<boolean> {
  // Text slides must have textHtml
  if (slide.kind === "text") {
    const hasText = !!slide.textHtml && slide.textHtml.trim() !== "";
    if (!hasText) {
      console.log(`[bulk-save] [cleanup] Text slide ${slide.id} has no textHtml`);
    }
    return hasText;
  }

  // Video slides must have videoUrl
  if (slide.kind === "video") {
    const hasVideo = !!slide.videoUrl && slide.videoUrl.trim() !== "";
    if (!hasVideo) {
      console.log(`[bulk-save] [cleanup] Video slide ${slide.id} has no videoUrl`);
    }
    return hasVideo;
  }

  // Image slides must have imageUrl AND the file must exist in storage
  if (slide.kind === "image") {
    if (!slide.imageUrl || slide.imageUrl.trim() === "") {
      console.log(`[bulk-save] [cleanup] Image slide ${slide.id} has no imageUrl`);
      return false;
    }

    // If we have stage and topic info, verify the file exists in storage
    if (stageNumber !== undefined && topicNumber !== undefined) {
      try {
        // Extract file extension from URL or use default
        let fileExtension = "jpg";
        const urlMatch = slide.imageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
        if (urlMatch) {
          fileExtension = urlMatch[1];
        }

        const fileName = `${slide.id}.${fileExtension}`;
        const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

        // Check if file exists in storage
        const { data: fileList, error: listError } = await supabase.storage
          .from("content")
          .list(`slides/topics/s${stageNumber}/t${topicNumber}/`);

        if (listError) {
          console.warn(
            `[bulk-save] [cleanup] Error checking file existence for slide ${slide.id}:`,
            listError.message
          );
          // If we can't check, assume it exists (don't delete on uncertainty)
          return true;
        }

        const fileExists =
          fileList && fileList.some((file) => file.name === fileName);

        if (!fileExists) {
          console.log(
            `[bulk-save] [cleanup] Image slide ${slide.id} has imageUrl but file doesn't exist in storage: ${filePath}`
          );
          return false;
        }

        return true;
      } catch (error: any) {
        console.warn(
          `[bulk-save] [cleanup] Error verifying file for slide ${slide.id}:`,
          error.message
        );
        // If we can't verify, assume it exists (don't delete on uncertainty)
        return true;
      }
    }

    // If we don't have stage/topic info, just check if imageUrl exists
    return true;
  }

  // Unknown slide kind - assume it's valid
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

        console.log(`[bulk-save] Attempting to delete slide:`, {
          id: slideId,
          kind: slideData?.slide?.kind || "unknown",
          orderIndex: slideData?.slide?.orderIndex,
          imageUrl: slideData?.slide?.imageUrl ? "exists" : "missing",
          videoUrl: slideData?.slide?.videoUrl ? "exists" : "missing",
          textHtml: slideData?.slide?.textHtml ? "exists" : "missing",
        });

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
      
      // Batch create slides using single insert with multiple values
      const createPayloads = creates.map((slideData, i) => {
        // Use a temporary high orderIndex to avoid unique constraint violations
        // We'll reorder everything after all operations
        const tempOrderIndex = maxOrderIndex + 1000 + i;

        // Ensure textHtml is set for text slides
        const textHtml =
          slideData.kind === "text"
            ? slideData.textHtml || ""
            : slideData.textHtml;

        const payload = {
          topicId,
          orderIndex: tempOrderIndex,
          kind: slideData.kind,
          imageUrl: null, // Don't set imageUrl yet, we'll upload file first
          videoUrl: slideData.videoUrl || null,
          textHtml: textHtml || null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
        };
        
        console.log(`[bulk-save] Creating slide ${i + 1}/${creates.length}:`, {
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
          const slideData = creates[index];
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
              orderIndex: slide.orderIndex,
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
        console.log(`[bulk-save] Updating slide:`, {
          id: slideData.id,
          kind: slideData.kind,
          orderIndex: slideData.orderIndex,
          imageUrl: slideData.imageUrl || null,
          videoUrl: slideData.videoUrl || null,
          textHtml: slideData.textHtml ? (slideData.textHtml.substring(0, 50) + "...") : null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
          hasUploadedFile: !!uploadedUrls[slideData.id],
        });
        
        const updateData: any = { ...slideData };
        delete updateData.id; // Remove id from update data
        delete updateData.orderIndex; // Don't update orderIndex here, reorder handles it

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
      const stage = topicDataForCleanup.stage;
      const topicData = topicDataForCleanup;
      
      // Extract stage and topic numbers for file verification
      let stageNumber: number | undefined;
      let topicNumber: number | undefined;
      
      if (stage?.code) {
        const stageNumberMatch = stage.code.match(/^S(\d+)$/);
        if (stageNumberMatch) {
          stageNumber = parseInt(stageNumberMatch[1], 10);
        }
      }
      
      if (topicData.stageOrder !== null && topicData.stageOrder !== undefined) {
        topicNumber = topicData.stageOrder;
      }
      
      console.log("[bulk-save] [cleanup] Cleanup context:", {
        stageNumber,
        topicNumber,
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
          orderIndex: slide.orderIndex,
          imageUrl: slide.imageUrl || null,
          videoUrl: slide.videoUrl || null,
          textHtml: slide.textHtml ? (slide.textHtml.substring(0, 50) + "...") : null,
        });

        // SAFETY CHECK: Never delete slides that were just created/updated in this request
        if (slidesModifiedInThisRequest.has(slide.id)) {
          console.log(
            `[bulk-save] [cleanup] PROTECTED: Skipping slide ${slide.id} - was modified in this request`
          );
          continue;
        }

        // SAFETY CHECK: Only check slides that are clearly empty (no URL fields at all)
        // If slide has any URL field set, we verify it exists before deleting
        const hasAnyUrl = !!slide.imageUrl || !!slide.videoUrl || !!slide.textHtml;
        
        if (!hasAnyUrl) {
          // Slide has no content fields at all - safe to delete
          emptySlideIds.push(slide.id);
          console.log(
            `[bulk-save] [cleanup] Marking clearly empty slide for deletion: ${slide.id} (kind: ${slide.kind}, orderIndex: ${slide.orderIndex}, no URLs at all)`
          );
          continue;
        }

        // For slides with URLs, verify they're actually empty
        const hasContent = await slideHasContent(
          slide,
          supabase,
          stageNumber,
          topicNumber
        );
        
        if (!hasContent) {
          // Double-check: Only delete if we're CERTAIN it's empty
          // slideHasContent already returns true on uncertainty, so if it returns false, we're sure
          emptySlideIds.push(slide.id);
          console.log(
            `[bulk-save] [cleanup] Marking verified empty slide for deletion: ${slide.id} (kind: ${slide.kind}, orderIndex: ${slide.orderIndex})`
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
              orderIndex: slide.orderIndex,
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
            const hasContent = await slideHasContent(
              slideData.slide,
              supabase,
              stageNumber,
              topicNumber
            );
            
            // Only delete if we're CERTAIN it's empty (hasContent === false)
            if (!hasContent) {
              // Delete file if it exists - only for image slides
              if (
                slideData.slide.kind === "image" &&
                slideData.slide.imageUrl &&
                stageNumber !== undefined &&
                topicNumber !== undefined
              ) {
                try {
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
                  console.log(
                    `[bulk-save] [cleanup] Deleted file for empty slide: ${filePath}`
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
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => s.id);
          
          if (remainingSlideIds.length > 0) {
            await topicsRepo.reorderSlides(topicId, remainingSlideIds);
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
          const hasContent = await slideHasContent(
            slide,
            supabase,
            stageNumber,
            topicNumber
          );
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
              orderIndex: s.orderIndex,
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
