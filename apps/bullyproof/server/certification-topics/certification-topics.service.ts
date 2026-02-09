import {
  getTopicsByStageCodeSchema,
  getTopicsByStageIdSchema,
  createTopicSchema,
  updateTopicSchema,
  deleteTopicSchema,
  reorderTopicsSchema,
  type GetTopicsByStageCodeParams,
  type GetTopicsByStageIdParams,
  type CreateTopicParams,
  type UpdateTopicParams,
  type DeleteTopicParams,
  type ReorderTopicsParams,
} from "./certification-topics.validators";
import { certificationTopicsRepo } from "./certification-topics.repo";
import { certificationSlidesRepo } from "../certification-slides/certification-slides.repo";
import { certificationSlidesService } from "../certification-slides/certification-slides.service";
import { assertFeature } from "@/server/features/features.service";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { certificationCourses } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewCertificationTopics(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view certification topics
  return;
}

async function assertCanManageCertificationTopics(ctx: AuthContext) {
  await assertFeature(ctx, "/ap-certification");
}

export const certificationTopicsService = {
  async getTopicsByStageCode(ctx: AuthContext, params: unknown) {
    const parsed = getTopicsByStageCodeSchema.parse(params);
    const { code, includeSlides, includeUrls } = parsed as any;
    await assertCanViewCertificationTopics(ctx);

    const topics = await certificationTopicsRepo.getByStageCode(code);

    // If includeSlides is true, fetch slides for each topic
    if (includeSlides) {
      const topicsWithSlides = await Promise.all(
        topics.map(async (topic) => {
          // Use the service which already generates URLs if includeUrls is true
          const slides = includeUrls
            ? await certificationSlidesService.getSlidesByTopicId(ctx, topic.id)
            : await certificationSlidesRepo.getByTopicId(topic.id);

          return {
            ...topic,
            slides,
          };
        })
      );

      return topicsWithSlides;
    }

    return topics;
  },

  async getTopicsByStageId(ctx: AuthContext, params: unknown) {
    const { stageId } = getTopicsByStageIdSchema.parse(params);
    await assertCanViewCertificationTopics(ctx);

    return await certificationTopicsRepo.getByStageId(stageId);
  },

  async getTopicById(ctx: AuthContext, topicId: string, query?: unknown) {
    await assertCanViewCertificationTopics(ctx);

    const topics = await certificationTopicsRepo.getById(topicId);
    if (topics.length === 0) return null;

    // Parse query parameters
    const params = query as any;
    const includeSlides = params?.includeSlides === "true" || params?.includeSlides === true;
    const includeUrls = params?.includeUrls === "true" || params?.includeUrls === true;

    // Get slides for this topic
    const slides = includeSlides
      ? includeUrls
        ? await certificationSlidesService.getSlidesByTopicId(ctx, topicId)
        : await certificationSlidesRepo.getByTopicId(topicId)
      : [];

    return {
      ...topics[0],
      slides,
    };
  },

  async createTopic(ctx: AuthContext, params: unknown) {
    const data: CreateTopicParams = createTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    // Map stageId/stageOrder to courseId/courseOrder for the repo
    const result = await certificationTopicsRepo.create({
      courseId: data.stageId, // stageId is actually courseId
      title: data.title,
      officialNotes: data.officialNotes,
      courseOrder: data.stageOrder ?? undefined, // stageOrder is actually courseOrder
    });
    return result[0];
  },

  async updateTopic(ctx: AuthContext, params: unknown) {
    const data: UpdateTopicParams = updateTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    const { id, stageOrder, ...updateData } = data;
    // Map stageOrder to courseOrder for the repo
    const result = await certificationTopicsRepo.update(id, {
      ...updateData,
      courseOrder: stageOrder ?? undefined,
    });
    return result[0];
  },

  async deleteTopic(ctx: AuthContext, params: unknown) {
    const { id } = deleteTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    await certificationTopicsRepo.delete(id);
    return { success: true };
  },

  async reorderTopics(ctx: AuthContext, params: unknown) {
    const data: ReorderTopicsParams = reorderTopicsSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    // Reorder topics in database
    // Note: Since we now use topic IDs in file paths instead of order numbers,
    // we don't need to rename storage directories when topics are reordered.
    // The paths are stable and never change.
    // Map stageId to courseId for the repo
    await certificationTopicsRepo.reorderTopics(data.stageId, data.topicIds);

    return { success: true };
  },
};
