/**
 * Certification Topic Slides Bulk Save API route handler.
 *
 * Handles bulk operations: create, update, delete, reorder slides and upload files.
 * Files are uploaded server-side after slides are created (to get UUIDs).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - POST /api/certification/topics/[topicId]/slides/bulk - Bulk save all slide changes
 *
 * Request Body (multipart/form-data):
 * - operations: JSON string with structure:
 *   {
 *     topicId: string;
 *     creates: Array<{ orderIndex: number; kind: "image" | "video" | "text"; ... }>;
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
import { randomUUID } from "crypto";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { courseTopicsRepo } from "@/server/course-topics/course-topics.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { checkFeatureAccess } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import {
  certificationCourses,
  courseTopics,
  courseTopicSlides,
} from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "ap_certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to manage certification slides" },
        { status: 403 }
      );
    }

    const { topicId } = await params;
    const formData = await request.formData();
    const operationsJson = formData.get("operations") as string;

    if (!operationsJson) {
      return NextResponse.json(
        { error: "Missing operations data" },
        { status: 400 }
      );
    }

    let parsedOperations;
    try {
      parsedOperations = JSON.parse(operationsJson);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid operations JSON" },
        { status: 400 }
      );
    }

    const { creates, updates, deletes, reorder } = parsedOperations;

    const supabase = await createServerClient();

    // Get course code early for file cleanup
    const topicForCourse = await db
      .select({
        course: certificationCourses,
        topic: courseTopics,
      })
      .from(courseTopics)
      .innerJoin(
        certificationCourses,
        eq(courseTopics.courseId, certificationCourses.id)
      )
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    if (topicForCourse.length === 0) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const courseCode = topicForCourse[0].course.code;

    // Step 1: Delete slides first (with file cleanup)
    const deletedSlideIds = new Set<string>();
    if (deletes && Array.isArray(deletes) && deletes.length > 0) {
      // Get slide data for file cleanup
      const slidesToDelete = await Promise.all(
        deletes.map(async (slideId) => {
          const slide = await courseTopicSlidesRepo.getById(slideId);
          return slide.length > 0 ? slide[0] : null;
        })
      );

      for (let i = 0; i < deletes.length; i++) {
        const slideId = deletes[i];
        const slide = slidesToDelete[i];

        // Delete file if it exists
        if (slide?.imageUrl) {
          try {
            const fileExtension =
              slide.imageUrl.split(".").pop()?.split("?")[0] || "jpg";
            const fileName = `${slideId}.${fileExtension}`;
            const filePath = `slides/certification/${courseCode}/${topicId}/${fileName}`;

            await supabase.storage.from("content").remove([filePath]);
          } catch (error) {
            console.error(`Failed to delete file for slide ${slideId}:`, error);
          }
        }

        await courseTopicSlidesRepo.deleteSlide(slideId);
        deletedSlideIds.add(slideId);
      }
    }

    // Step 2: Get current topic data for orderIndex calculation (after deletions)
    const currentSlides = await courseTopicSlidesRepo.getByTopicId(topicId);
    const maxOrderIndex =
      currentSlides.length > 0
        ? Math.max(...currentSlides.map((s) => s.orderIndex))
        : -1;

    // Get topic info (course code already retrieved above)
    const topic = await courseTopicsRepo.getById(topicId);
    if (topic.length === 0) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Step 3: Create new slides
    // Use temporary high orderIndex values to avoid unique constraint violations
    // We'll normalize the order after all operations complete
    // Calculate tempOrderOffset dynamically to avoid conflicts with existing slides
    const createdSlideIds: string[] = [];
    const tempIdToSlideIdMap = new Map<string, string>();
    // Use an offset that's higher than any existing orderIndex to avoid conflicts
    // Add 1000000 to ensure we're well above any temporary values
    const tempOrderOffset = Math.max(1000000, maxOrderIndex + 1000000);
    const newSlideOrderMap = new Map<string, number>(); // Map: slideId -> intended orderIndex
    const uploadedUrls: Record<string, string> = {};
    const tempFileInfo = new Map<
      string,
      { path: string; contentType: string }
    >(); // Map: tempId -> { path, contentType }

    if (creates && Array.isArray(creates) && creates.length > 0) {
      for (let i = 0; i < creates.length; i++) {
        const slideData = creates[i];
        const tempId = slideData.tempId;
        // Use temporary high orderIndex to avoid conflicts, will be normalized later
        const tempOrderIndex = tempOrderOffset + i;

        // For image slides, we need to upload the file first (if it exists) before creating the slide
        // because the constraint requires image_url IS NOT NULL for image slides
        let imageUrl: string | null = null;
        if (slideData.kind === "image") {
          // Check if there's a file for this slide
          const fileKey = tempId ? `file_${tempId}` : null;
          const file = fileKey ? (formData.get(fileKey) as File | null) : null;

          if (file instanceof File) {
            // Generate a temporary UUID for the file path (we'll update it after slide creation)
            // For now, upload to a temp location
            const tempUuid = randomUUID();
            const fileExtension = file.name.split(".").pop() || "jpg";
            const tempFileName = `temp_${tempUuid}.${fileExtension}`;
            const tempFilePath = `slides/certification/${courseCode}/${topicId}/${tempFileName}`;

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { error: uploadError } = await supabase.storage
              .from("content")
              .upload(tempFilePath, buffer, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type,
              });

            if (uploadError) {
              console.error(
                `Failed to upload temp file for slide:`,
                uploadError
              );
              return NextResponse.json(
                {
                  error: `Failed to upload file: ${uploadError.message}`,
                },
                { status: 500 }
              );
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("content").getPublicUrl(tempFilePath);

            if (publicUrl) {
              imageUrl = publicUrl;
              // Store temp file info for later cleanup/rename
              if (tempId) {
                tempFileInfo.set(tempId, {
                  path: tempFilePath,
                  contentType: file.type,
                });
              }
            }
          } else if (slideData.imageUrl) {
            // Use existing imageUrl if provided
            imageUrl = slideData.imageUrl;
          } else {
            // For image slides, we need a non-null imageUrl due to constraint
            // Use a placeholder data URL
            imageUrl =
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
          }
        }

        const createPayload: any = {
          topicId,
          orderIndex: tempOrderIndex,
          kind: slideData.kind,
          imageUrl:
            slideData.kind === "image"
              ? imageUrl
              : slideData.kind === "quiz"
                ? null
                : slideData.imageUrl || null,
          videoUrl: slideData.videoUrl || null,
          textHtml: slideData.textHtml || null,
          videoStartS: slideData.videoStartS || null,
          videoEndS: slideData.videoEndS || null,
        };

        try {
          const result =
            await courseTopicSlidesRepo.createSlide(createPayload);
          if (result?.[0]?.id) {
            const slideId = result[0].id;
            createdSlideIds.push(slideId);
            if (tempId) {
              tempIdToSlideIdMap.set(tempId, slideId);
            }
            // Store the intended orderIndex for this new slide
            const intendedOrderIndex =
              slideData.orderIndex ?? maxOrderIndex + 1 + i;
            newSlideOrderMap.set(slideId, intendedOrderIndex);

            // If we uploaded a temp file, now move it to the correct location with the slide ID
            const tempFileData = tempId ? tempFileInfo.get(tempId) : null;
            if (tempFileData && slideData.kind === "image") {
              const fileExtension =
                tempFileData.path.split(".").pop()?.split("?")[0] || "jpg";
              const finalFileName = `${slideId}.${fileExtension}`;
              const finalFilePath = `slides/certification/${courseCode}/${topicId}/${finalFileName}`;

              // Copy the file to the final location
              const { data: downloadedFile, error: downloadError } =
                await supabase.storage
                  .from("content")
                  .download(tempFileData.path);

              if (!downloadError && downloadedFile) {
                const buffer = Buffer.from(await downloadedFile.arrayBuffer());
                const { error: uploadError } = await supabase.storage
                  .from("content")
                  .upload(finalFilePath, buffer, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: tempFileData.contentType || "image/jpeg",
                  });

                if (!uploadError) {
                  // Delete temp file
                  await supabase.storage
                    .from("content")
                    .remove([tempFileData.path]);

                  // Update slide with final URL
                  const {
                    data: { publicUrl },
                  } = supabase.storage
                    .from("content")
                    .getPublicUrl(finalFilePath);

                  if (publicUrl) {
                    await courseTopicSlidesRepo.updateSlide(slideId, {
                      imageUrl: publicUrl,
                    });
                    uploadedUrls[slideId] = publicUrl;
                  }
                } else {
                  console.error(
                    `Failed to move temp file to final location for slide ${slideId}:`,
                    uploadError
                  );
                }
              }
              // Clean up temp file reference
              if (tempId) {
                tempFileInfo.delete(tempId);
              }
            } else if (imageUrl && slideData.kind === "image") {
              // Store the imageUrl for reference
              uploadedUrls[slideId] = imageUrl;
            }
          }
        } catch (error: any) {
          console.error(`Failed to create slide ${i + 1}:`, error);
          throw error;
        }
      }
    }

    // Step 3.5: Upload files for newly created slides that weren't handled above
    // (for slides that don't have tempId or were created without files initially)
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const tempId = key.replace("file_", "");
        const file = value;
        const slideId = tempIdToSlideIdMap.get(tempId);

        // Skip if we already handled this file above
        if (slideId && !uploadedUrls[slideId]) {
          const fileExtension = file.name.split(".").pop() || "jpg";
          const fileName = `${slideId}.${fileExtension}`;
          const filePath = `slides/certification/${courseCode}/${topicId}/${fileName}`;

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

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

          const {
            data: { publicUrl },
          } = supabase.storage.from("content").getPublicUrl(filePath);

          if (publicUrl) {
            uploadedUrls[slideId] = publicUrl;
            // Update the slide with the imageUrl (only for image slides)
            const slideResult = await courseTopicSlidesRepo.getById(slideId);
            if (slideResult.length > 0 && slideResult[0].kind === "image") {
              await courseTopicSlidesRepo.updateSlide(slideId, {
                imageUrl: publicUrl,
              });
            }
          }
        }
      }
    }

    // Step 3.7: Upload files for existing slides that have pending uploads
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const slideId = key.replace("file_", "");
        if (slideId.startsWith("temp_")) continue;

        const file = value;
        const fileExtension = file.name.split(".").pop() || "jpg";
        const fileName = `${slideId}.${fileExtension}`;
        const filePath = `slides/certification/${courseCode}/${topicId}/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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

        const {
          data: { publicUrl },
        } = supabase.storage.from("content").getPublicUrl(filePath);

        if (publicUrl) {
          uploadedUrls[slideId] = publicUrl;
        }
      }
    }

    // Step 4: Update existing slides
    if (updates && Array.isArray(updates) && updates.length > 0) {
      for (const slideData of updates) {
        const updateData: any = { ...slideData };
        delete updateData.id;
        delete updateData.orderIndex;

        // If there's an uploaded file for this slide, use its URL
        // But only for image slides
        if (uploadedUrls[slideData.id] && slideData.kind === "image") {
          updateData.imageUrl = uploadedUrls[slideData.id];
        }

        // Remove quizData if present (no longer supported)
        delete updateData.quizData;

        try {
          await courseTopicSlidesRepo.updateSlide(slideData.id, updateData);
        } catch (error: any) {
          console.error(`Failed to update slide ${slideData.id}:`, error);
          throw error;
        }
      }
    }

    // Step 5: Reorder slides
    // Build final order including newly created slides at their intended positions
    if (reorder && Array.isArray(reorder) && reorder.length > 0) {
      const validReorderIds = reorder.filter((id) => !deletedSlideIds.has(id));

      // Create pairs of [orderIndex, slideId] for new slides
      const newSlidePositions: Array<[number, string]> = [];
      for (const slideId of createdSlideIds) {
        const intendedOrderIndex = newSlideOrderMap.get(slideId);
        if (intendedOrderIndex !== undefined) {
          newSlidePositions.push([intendedOrderIndex, slideId]);
        }
      }
      // Sort by orderIndex
      newSlidePositions.sort((a, b) => a[0] - b[0]);

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

      if (finalOrder.length > 0) {
        // Validate that all slides belong to this topic (security check)
        console.log(
          "[bulk-save] Validating slide ownership before reordering..."
        );

        // Get current slides after creates/deletes to validate ownership
        // Use a targeted query to check only the slides in finalOrder
        const slidesToValidate = await db
          .select({ id: courseTopicSlides.id })
          .from(courseTopicSlides)
          .where(
            and(
              eq(courseTopicSlides.topicId, topicId),
              inArray(courseTopicSlides.id, finalOrder)
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

        console.log(
          "[bulk-save] Validation passed - all slides belong to topic"
        );

        try {
          await courseTopicSlidesRepo.bulkUpdateOrder(topicId, finalOrder);
        } catch (error: any) {
          console.error("Failed to reorder slides:", error);
          throw error;
        }
      }
    } else {
      // Normalize order if no explicit reorder provided
      // This will ensure all slides (including new ones) are sequentially ordered
      await courseTopicSlidesRepo.normalizeSlideOrder(topicId);
    }

    // Step 6: Fetch final topic data with slides
    const finalSlides = await courseTopicSlidesRepo.getByTopicId(topicId);

    // Fetch full topic data to include title and other fields
    const fullTopic = await courseTopicsRepo.getById(topicId);
    const topicData = fullTopic.length > 0 ? fullTopic[0] : null;

    return NextResponse.json(
      {
        success: true,
        topic: topicData
          ? {
              ...topicData,
              slides: finalSlides,
            }
          : {
              id: topicId,
              slides: finalSlides,
            },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Bulk save error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
