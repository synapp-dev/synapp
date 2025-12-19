import {
  getStagesSchema,
  getStageByIdSchema,
  getStageByCodeSchema,
  type GetStagesParams,
  type GetStageByIdParams,
  type GetStageByCodeParams,
} from "./certification.validators";
import { certificationRepo } from "./certification.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewCertification(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view certification
  return;
}

export const certificationService = {
  async getStages(ctx: AuthContext, query: unknown) {
    const params: GetStagesParams = getStagesSchema.parse(query);
    await assertCanViewCertification(ctx);

    return await certificationRepo.getStages();
  },

  async getStageById(ctx: AuthContext, params: unknown) {
    const { id } = getStageByIdSchema.parse(params);
    await assertCanViewCertification(ctx);

    const stages = await certificationRepo.getStageById(id);
    if (stages.length === 0) return null;

    return await certificationRepo.getStageWithTopics(id);
  },

  async getStageByCode(ctx: AuthContext, params: unknown) {
    const { code } = getStageByCodeSchema.parse(params);
    await assertCanViewCertification(ctx);

    return await certificationRepo.getStageByCodeWithTopics(code);
  },
};
