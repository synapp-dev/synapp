import {
  getTopicsByStageCodeSchema,
  getTopicsByStageIdSchema,
  type GetTopicsByStageCodeParams,
  type GetTopicsByStageIdParams,
} from "./certification-topics.validators";
import { certificationTopicsRepo } from "./certification-topics.repo";
import { certificationSlidesRepo } from "../certification-slides/certification-slides.repo";

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

export const certificationTopicsService = {
  async getTopicsByStageCode(ctx: AuthContext, params: unknown) {
    const { code } = getTopicsByStageCodeSchema.parse(params);
    await assertCanViewCertificationTopics(ctx);

    return await certificationTopicsRepo.getByStageCode(code);
  },

  async getTopicsByStageId(ctx: AuthContext, params: unknown) {
    const { stageId } = getTopicsByStageIdSchema.parse(params);
    await assertCanViewCertificationTopics(ctx);

    return await certificationTopicsRepo.getByStageId(stageId);
  },

  async getTopicById(ctx: AuthContext, topicId: string) {
    await assertCanViewCertificationTopics(ctx);

    const topics = await certificationTopicsRepo.getById(topicId);
    if (topics.length === 0) return null;

    // Get slides for this topic
    const slides = await certificationSlidesRepo.getByTopicId(topicId);

    return {
      ...topics[0],
      slides,
    };
  },
};
