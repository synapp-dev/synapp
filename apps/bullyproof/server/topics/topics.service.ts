import {
  createTopicSchema,
  updateTopicSchema,
  listTopicsSchema,
  getTopicByIdSchema,
  type CreateTopicParams,
  type UpdateTopicParams,
  type ListTopicsParams,
  type GetTopicByIdParams,
} from "./topics.validators";
import { topicsRepo } from "./topics.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageTopics(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  
  // Only platform admins can manage topics
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }

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

    if (params.stageId) {
      return await topicsRepo.getByStageId(params.stageId);
    }

    if (params.search) {
      return await topicsRepo.search(params);
    }

    return await topicsRepo.getAll();
  },

  async getTopicById(ctx: AuthContext, params: unknown) {
    const { id } = getTopicByIdSchema.parse(params);
    await assertCanViewTopics(ctx);
    
    return await topicsRepo.getWithDetails(id);
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
};
