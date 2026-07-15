import {
  getTopicsByCourseCodeSchema,
  getTopicsByCourseIdSchema,
  createTopicSchema,
  updateTopicSchema,
  deleteTopicSchema,
  reorderTopicsSchema,
  getTopicBySlugSchema,
  type CreateTopicParams,
  type UpdateTopicParams,
  type ReorderTopicsParams,
} from "./course-topics.validators";
import { courseTopicsRepo } from "./course-topics.repo";
import { topicSlidesRepo } from "../topic-slides/topic-slides.repo";
import { topicSlidesService } from "../topic-slides/topic-slides.service";
import { assertFeature } from "@/server/features/features.service";

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
  await assertFeature(ctx, "/admin/content");
}

export const courseTopicsService = {
  async getTopicsByCourseCode(ctx: AuthContext, params: unknown) {
    const parsed = getTopicsByCourseCodeSchema.parse(params);
    const { code, includeSlides, includeUrls } = parsed as any;
    await assertCanViewCertificationTopics(ctx);

    const topics = await courseTopicsRepo.getByCourseCode(code);

    // If includeSlides is true, fetch slides for each topic
    if (includeSlides) {
      const topicsWithSlides = await Promise.all(
        topics.map(async (topic) => {
          // Use the service which already generates URLs if includeUrls is true
          const slides = includeUrls
            ? await topicSlidesService.getSlidesByTopicId(ctx, topic.id)
            : await topicSlidesRepo.getByTopicId(topic.id);

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

  async getTopicsByCourseId(ctx: AuthContext, params: unknown) {
    const { courseId } = getTopicsByCourseIdSchema.parse(params);
    await assertCanViewCertificationTopics(ctx);

    return await courseTopicsRepo.getByCourseId(courseId);
  },

  async getTopicById(ctx: AuthContext, topicId: string, query?: unknown) {
    await assertCanViewCertificationTopics(ctx);

    const topics = await courseTopicsRepo.getById(topicId);
    if (topics.length === 0) return null;

    // Parse query parameters
    const params = query as any;
    const includeSlides = params?.includeSlides === "true" || params?.includeSlides === true;
    const includeUrls = params?.includeUrls === "true" || params?.includeUrls === true;

    // Get slides for this topic
    const slides = includeSlides
      ? includeUrls
        ? await topicSlidesService.getSlidesByTopicId(ctx, topicId)
        : await topicSlidesRepo.getByTopicId(topicId)
      : [];

    return {
      ...topics[0],
      slides,
    };
  },

  async getTopicBySlug(ctx: AuthContext, params: unknown) {
    const parsed = getTopicBySlugSchema.parse(params);
    const { courseCode, slug, includeSlides, includeUrls } = parsed as any;
    await assertCanViewCertificationTopics(ctx);

    const topics = await courseTopicsRepo.getBySlug(courseCode, slug);
    if (topics.length === 0) return null;

    const topic = topics[0];

    // Parse query parameters
    const includeSlidesBool = includeSlides === "true" || includeSlides === true;
    const includeUrlsBool = includeUrls === "true" || includeUrls === true;

    // Get slides for this topic
    const slides = includeSlidesBool
      ? includeUrlsBool
        ? await topicSlidesService.getSlidesByTopicId(ctx, topic.id)
        : await topicSlidesRepo.getByTopicId(topic.id)
      : [];

    return {
      ...topic,
      slides,
    };
  },

  async createTopic(ctx: AuthContext, params: unknown) {
    const data: CreateTopicParams = createTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    const result = await courseTopicsRepo.create(data);
    return result[0];
  },

  async updateTopic(ctx: AuthContext, params: unknown) {
    const data: UpdateTopicParams = updateTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    const { id, ...updateData } = data;
    const result = await courseTopicsRepo.update(id, updateData);
    return result[0];
  },

  async deleteTopic(ctx: AuthContext, params: unknown) {
    const { id } = deleteTopicSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    await courseTopicsRepo.delete(id);
    return { success: true };
  },

  async reorderTopics(ctx: AuthContext, params: unknown) {
    const data: ReorderTopicsParams = reorderTopicsSchema.parse(params);
    await assertCanManageCertificationTopics(ctx);

    await courseTopicsRepo.reorder(data.courseId, data.topicIds);

    return { success: true };
  },
};
