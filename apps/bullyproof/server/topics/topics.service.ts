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
import { topicSlidesRepo } from "@/server/topic-slides/topic-slides.repo";
import { assertFeature } from "@/server/features/features.service";
import { createServerClient } from "@/utils/supabase/server";
import { refreshSignedUrlIfStale } from "@/server/lib/signed-url";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageTopics(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/content");
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

        // If includeUrls is true, resolve signed URLs for image slides
        if ((params as any).includeUrls) {
          const updateFn = topicSlidesRepo.updateSignedUrl;
          const topicsWithUrls = await Promise.all(
            topicsWithSlides.map(async (topic) => {
              if (!topic.slides || topic.slides.length === 0) {
                return topic;
              }

              const slidesWithUrls = await Promise.all(
                topic.slides.map(async (slide) => {
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

    // If includeUrls is true, resolve signed URLs for image slides
    if (includeUrls && topicData.slides && topicData.slides.length > 0) {
      const updateFn = topicSlidesRepo.updateSignedUrl;
      const slidesWithUrls = await Promise.all(
        topicData.slides.map(async (slide) => {
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

    // Step 1: Delete image file from storage if it exists
    if (slideData.slide.imageUrl && !slideData.slide.imageUrl.startsWith("blob:") && !slideData.slide.imageUrl.startsWith("data:")) {
      try {
        // Extract storage path from URL if needed (legacy data has full public URLs)
        let storagePath = slideData.slide.imageUrl;
        if (storagePath.startsWith("http")) {
          const publicUrlPattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
          const match = storagePath.match(publicUrlPattern);
          if (match) {
            storagePath = match[1];
          } else {
            // Not a Supabase storage URL — skip deletion
            storagePath = "";
          }
        }

        if (storagePath) {
          const supabase = await createServerClient();
          const { error: deleteError } = await supabase.storage
            .from("content")
            .remove([storagePath]);

          if (deleteError) {
            console.warn(
              `Failed to delete image file for slide ${slideId}:`,
              deleteError.message
            );
          }
        }
      } catch (error) {
        // Log error but don't fail the deletion — file deletion is best effort
        console.warn(
          `Error deleting image file for slide ${slideId}:`,
          error
        );
      }
    }

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

    const { slide } = slideData;

    // Only generate URL for image slides
    if (slide.kind !== "image") {
      throw new Error("Slide is not an image slide");
    }

    // Use image_url directly as storage path — no path reconstruction needed
    const url = await refreshSignedUrlIfStale(
      slide,
      slide.imageUrl,
      topicSlidesRepo.updateSignedUrl
    );

    return { url };
  },
};
