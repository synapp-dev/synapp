import {
  createTopicSchema,
  updateTopicSchema,
  listTopicsSchema,
  getTopicByIdSchema,
  createSlideSchema,
  updateSlideSchema,
  reorderSlidesSchema,
  reorderTopicsSchema,
  type CreateTopicParams,
  type UpdateTopicParams,
  type ListTopicsParams,
  type GetTopicByIdParams,
  type CreateSlideParams,
  type UpdateSlideParams,
  type ReorderSlidesParams,
  type ReorderTopicsParams,
} from "./topics.validators";
import { topicsRepo } from "./topics.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { curriculumStages } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageTopics(ctx: AuthContext) {
  console.log(
    "[topics.service] assertCanManageTopics called with userId:",
    ctx.userId
  );

  if (!ctx.userId) {
    console.error(
      "[topics.service] ERROR: No userId in context - throwing Unauthorized"
    );
    throw new Error("Unauthorized");
  }

  console.log(
    "[topics.service] Getting user scoped roles for userId:",
    ctx.userId
  );
  const roles = await getUserScopedRoles(ctx.userId);
  console.log("[topics.service] User roles:", {
    platform: roles.platform,
    hasPlatformAdmin: roles.platform.includes("PLATFORM_ADMIN"),
  });

  // Only platform admins can manage topics
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    console.log("[topics.service] User has PLATFORM_ADMIN role - authorized");
    return;
  }

  console.error(
    "[topics.service] ERROR: User does not have PLATFORM_ADMIN role - throwing Unauthorized"
  );
  throw new Error("Unauthorized to manage topics");
}

async function assertCanViewTopics(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view topics
  return;
}

export const topicsService = {
  async listTopics(ctx: AuthContext, query: unknown) {
    const params: ListTopicsParams = listTopicsSchema.parse(query);
    await assertCanViewTopics(ctx);

    // Check if requesting from view (for lesson wizard)
    if ((params as any).useView) {
      return await topicsRepo.getFromView();
    }

    if (params.stageId) {
      // If includeSlides is true, fetch topics with slides
      if ((params as any).includeSlides) {
        const topicsWithSlides = await topicsRepo.getByStageIdWithSlides(
          params.stageId
        );

        // If includeUrls is true, generate signed URLs for image slides
        if ((params as any).includeUrls) {
          const supabase = await createServerClient();
          const topicsWithUrls = await Promise.all(
            topicsWithSlides.map(async (topic) => {
              if (!topic.slides || topic.slides.length === 0) {
                return topic;
              }

              // Get stage info for URL generation
              const stageData = await db
                .select()
                .from(curriculumStages)
                .where(eq(curriculumStages.id, topic.stageId))
                .limit(1);

              if (stageData.length === 0) {
                return topic;
              }

              const stage = stageData[0];
              const stageNumberMatch = stage.code.match(/^S(\d+)$/);
              if (!stageNumberMatch) {
                return topic;
              }
              const stageNumber = parseInt(stageNumberMatch[1], 10);
              const topicNumber = topic.stageOrder;

              if (topicNumber === null || topicNumber === undefined) {
                return topic;
              }

              // Generate signed URLs for image slides
              const slidesWithUrls = await Promise.all(
                topic.slides.map(async (slide) => {
                  if (slide.kind !== "image" || !slide.imageUrl) {
                    return slide;
                  }

                  // Extract file extension
                  let fileExtension = "jpg";
                  if (slide.imageUrl) {
                    const urlMatch = slide.imageUrl.match(
                      /\.([a-zA-Z0-9]+)(?:\?|$)/
                    );
                    if (urlMatch) {
                      fileExtension = urlMatch[1];
                    }
                  }

                  // Construct file path
                  const fileName = `${slide.id}.${fileExtension}`;
                  const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

                  // Check if file exists
                  const { data: fileList } = await supabase.storage
                    .from("content")
                    .list(`slides/topics/s${stageNumber}/t${topicNumber}/`);

                  const fileExists =
                    fileList &&
                    fileList.some((file) => file.name === fileName);

                  if (!fileExists) {
                    return { ...slide, signedUrl: null };
                  }

                  // Generate signed URL with 1-week expiry
                  const { data, error } = await supabase.storage
                    .from("content")
                    .createSignedUrl(filePath, 604800);

                  if (error) {
                    console.warn(
                      `Failed to generate signed URL for slide ${slide.id}:`,
                      error.message
                    );
                    return { ...slide, signedUrl: null };
                  }

                  return { ...slide, signedUrl: data.signedUrl };
                })
              );

              return { ...topic, slides: slidesWithUrls };
            })
          );

          return topicsWithUrls;
        }

        return topicsWithSlides;
      }

      return await topicsRepo.getByStageId(params.stageId);
    }

    if (params.search) {
      return await topicsRepo.search(params);
    }

    return await topicsRepo.getAll();
  },

  async getTopicById(ctx: AuthContext, params: unknown) {
    const parsed = getTopicByIdSchema.parse(params);
    const { id, includeSlides, includeUrls } = parsed as any;
    await assertCanViewTopics(ctx);

    // getWithDetails already includes slides, so we always use it if includeSlides is true or not specified
    const topicData = await topicsRepo.getWithDetails(id);
    if (!topicData) return null;

    // If includeUrls is true, generate signed URLs for image slides
    if (includeUrls && topicData.slides && topicData.slides.length > 0) {
      const supabase = await createServerClient();
      const stage = topicData.stage;
      
      if (!stage) return topicData;

      const stageNumberMatch = stage.code.match(/^S(\d+)$/);
      if (!stageNumberMatch) return topicData;
      
      const stageNumber = parseInt(stageNumberMatch[1], 10);
      const topicNumber = topicData.stageOrder;

      if (topicNumber === null || topicNumber === undefined) {
        return topicData;
      }

      // Generate signed URLs for image slides
      const slidesWithUrls = await Promise.all(
        topicData.slides.map(async (slide) => {
          if (slide.kind !== "image" || !slide.imageUrl) {
            return slide;
          }

          // Extract file extension
          let fileExtension = "jpg";
          if (slide.imageUrl) {
            const urlMatch = slide.imageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            if (urlMatch) {
              fileExtension = urlMatch[1];
            }
          }

          // Construct file path
          const fileName = `${slide.id}.${fileExtension}`;
          const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

          // Check if file exists
          const { data: fileList } = await supabase.storage
            .from("content")
            .list(`slides/topics/s${stageNumber}/t${topicNumber}/`);

          const fileExists =
            fileList && fileList.some((file) => file.name === fileName);

          if (!fileExists) {
            return { ...slide, signedUrl: null };
          }

          // Generate signed URL with 1-week expiry
          const { data, error } = await supabase.storage
            .from("content")
            .createSignedUrl(filePath, 604800);

          if (error) {
            console.warn(
              `Failed to generate signed URL for slide ${slide.id}:`,
              error.message
            );
            return { ...slide, signedUrl: null };
          }

          return { ...slide, signedUrl: data.signedUrl };
        })
      );

      return { ...topicData, slides: slidesWithUrls };
    }

    return topicData;
  },

  async createTopic(ctx: AuthContext, params: unknown) {
    const data: CreateTopicParams = createTopicSchema.parse(params);
    await assertCanManageTopics(ctx);

    const newTopic = await topicsRepo.create(data);
    return await topicsRepo.getWithDetails(newTopic[0].id);
  },

  async updateTopic(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateTopicParams = updateTopicSchema.parse(params);
    await assertCanManageTopics(ctx);

    const updatedTopic = await topicsRepo.update(id, data);
    return await topicsRepo.getWithDetails(id);
  },

  async deleteTopic(ctx: AuthContext, id: string) {
    await assertCanManageTopics(ctx);

    await topicsRepo.delete(id);
    return { success: true };
  },

  async createSlide(ctx: AuthContext, params: unknown) {
    const data: CreateSlideParams = createSlideSchema.parse(params);
    await assertCanManageTopics(ctx);

    // Ensure textHtml is set for text slides
    if (data.kind === "text" && !data.textHtml) {
      data.textHtml = "";
    }

    const newSlide = await topicsRepo.createSlide(data);

    // Normalize slide order after creation to ensure sequential orderIndex
    await topicsRepo.normalizeSlideOrder(data.topicId);

    return newSlide[0];
  },

  async updateSlide(ctx: AuthContext, slideId: string, params: unknown) {
    const data: UpdateSlideParams = updateSlideSchema.parse(params);
    await assertCanManageTopics(ctx);

    // Get the slide to find its topicId
    const slideData = await topicsRepo.getSlideWithTopicAndStage(slideId);
    if (!slideData) {
      throw new Error("Slide not found");
    }

    const updatedSlide = await topicsRepo.updateSlide(slideId, data);

    // Normalize slide order after update to ensure sequential orderIndex
    await topicsRepo.normalizeSlideOrder(slideData.topic.id);

    return updatedSlide[0];
  },

  async deleteSlide(ctx: AuthContext, slideId: string) {
    console.log(
      `[topics.service] deleteSlide called with slideId: ${slideId}, userId: ${ctx.userId}`
    );

    try {
      await assertCanManageTopics(ctx);
      console.log(
        `[topics.service] Authorization check passed for deleteSlide`
      );
    } catch (error: any) {
      console.error(
        `[topics.service] ERROR: Authorization failed for deleteSlide:`,
        {
          error: error,
          message: error?.message,
          slideId: slideId,
          userId: ctx.userId,
        }
      );
      throw error;
    }

    // Get the slide to find its topicId and stage info before deleting
    console.log(`[topics.service] Getting slide data for slideId: ${slideId}`);
    const slideData = await topicsRepo.getSlideWithTopicAndStage(slideId);
    if (!slideData) {
      console.error(`[topics.service] ERROR: Slide not found: ${slideId}`);
      throw new Error("Slide not found");
    }
    console.log(
      `[topics.service] Found slide data. TopicId: ${slideData.topic.id}`
    );

    const topicId = slideData.topic.id;

    // Step 1: Check storage and delete image file if it exists
    // Only attempt file deletion if the slide has an imageUrl set
    if (slideData.slide.imageUrl) {
      try {
        const supabase = await createServerClient();
        const stage = slideData.stage;
        const topic = slideData.topic;

        if (
          stage &&
          topic.stageOrder !== null &&
          topic.stageOrder !== undefined
        ) {
          // Extract stage number from stage.code (e.g., "S1" -> 1)
          const stageNumberMatch = stage.code.match(/^S(\d+)$/);
          if (stageNumberMatch) {
            const stageNumber = parseInt(stageNumberMatch[1], 10);
            const topicNumber = topic.stageOrder;

            // Extract file extension from imageUrl
            let fileExtension = "jpg"; // default fallback
            const urlMatch = slideData.slide.imageUrl.match(
              /\.([a-zA-Z0-9]+)(?:\?|$)/
            );
            if (urlMatch) {
              fileExtension = urlMatch[1];
            }

            // Construct file path: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
            const fileName = `${slideId}.${fileExtension}`;
            const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

            // Try to delete the file - if it doesn't exist, that's fine
            // We use remove() which won't error if the file doesn't exist
            const { error: deleteError } = await supabase.storage
              .from("content")
              .remove([filePath]);

            if (deleteError) {
              // Only log if it's not a "file not found" type error
              // Storage errors for non-existent files are expected and can be ignored
              console.warn(
                `Failed to delete image file for slide ${slideId}:`,
                deleteError.message
              );
            }
          }
        }
      } catch (error) {
        // Log error but don't fail the deletion - file deletion is best effort
        console.warn(
          `Error checking/deleting image file for slide ${slideId}:`,
          error
        );
      }
    }
    // If slide has no imageUrl, skip file deletion entirely

    // Step 2: Delete the slide from database
    console.log(`[topics.service] Deleting slide from database: ${slideId}`);
    await topicsRepo.deleteSlide(slideId);
    console.log(
      `[topics.service] Successfully deleted slide from database: ${slideId}`
    );

    // Step 3: Reorder remaining slides to fill gaps (normalize orderIndex)
    console.log(
      `[topics.service] Normalizing slide order for topicId: ${topicId}`
    );
    await topicsRepo.normalizeSlideOrder(topicId);
    console.log(`[topics.service] Successfully normalized slide order`);

    console.log(
      `[topics.service] deleteSlide completed successfully for slideId: ${slideId}`
    );
    return { success: true };
  },

  async reorderSlides(ctx: AuthContext, params: unknown) {
    const data: ReorderSlidesParams = reorderSlidesSchema.parse(params);
    await assertCanManageTopics(ctx);

    await topicsRepo.reorderSlides(data.topicId, data.slideIds);
    return { success: true };
  },

  async reorderTopics(ctx: AuthContext, params: unknown) {
    const data: ReorderTopicsParams = reorderTopicsSchema.parse(params);
    await assertCanManageTopics(ctx);

    await topicsRepo.reorderTopics(data.stageId, data.topicIds);
    return { success: true };
  },

  async getSlideImageUrl(ctx: AuthContext, slideId: string) {
    await assertCanViewTopics(ctx);

    const slideData = await topicsRepo.getSlideWithTopicAndStage(slideId);
    if (!slideData) {
      throw new Error("Slide not found");
    }

    const { slide, topic, stage } = slideData;

    // Only generate URL for image slides
    if (slide.kind !== "image") {
      throw new Error("Slide is not an image slide");
    }

    // Extract stage number from stage.code (e.g., "S1" -> 1)
    const stageNumberMatch = stage.code.match(/^S(\d+)$/);
    if (!stageNumberMatch) {
      throw new Error("Invalid stage code format");
    }
    const stageNumber = parseInt(stageNumberMatch[1], 10);

    // Get topic number from topic.stageOrder
    const topicNumber = topic.stageOrder;
    if (topicNumber === null || topicNumber === undefined) {
      throw new Error("Topic stageOrder is missing");
    }

    // Extract file extension from stored imageUrl or use default
    // If imageUrl exists and has an extension, extract it
    let fileExtension = "jpg"; // default
    if (slide.imageUrl) {
      const urlMatch = slide.imageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (urlMatch) {
        fileExtension = urlMatch[1];
      }
    }

    // Construct file path: slides/topics/s{stage}/t{topic}/{slideId}.{extension}
    const fileName = `${slideId}.${fileExtension}`;
    const filePath = `slides/topics/s${stageNumber}/t${topicNumber}/${fileName}`;

    // Check if file exists in storage before generating signed URL
    const supabase = await createServerClient();

    // First, check if the file exists by listing files in the directory
    const { data: fileList, error: listError } = await supabase.storage
      .from("content")
      .list(`slides/topics/s${stageNumber}/t${topicNumber}/`);

    // Check if the file exists in the list
    const fileExists =
      !listError && fileList && fileList.some((file) => file.name === fileName);

    if (!fileExists) {
      // File doesn't exist in bucket, return null to indicate no image
      return { url: null };
    }

    // File exists, generate signed URL with 1-week expiry (604800 seconds)
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(filePath, 604800); // 1 week in seconds

    if (error) {
      // If there's an error generating the signed URL, return null instead of throwing
      // This handles cases where the file might have been deleted between checking and generating
      console.warn(
        `Failed to generate signed URL for slide ${slideId}:`,
        error.message
      );
      return { url: null };
    }

    return { url: data.signedUrl };
  },
};
