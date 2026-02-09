import {
  getStagesSchema,
  getStageByIdSchema,
  getStageByCodeSchema,
  createStageSchema,
  updateStageSchema,
  deleteStageSchema,
  type GetStagesParams,
  type GetStageByIdParams,
  type GetStageByCodeParams,
  type CreateStageParams,
  type UpdateStageParams,
  type DeleteStageParams,
} from "./certification.validators";
import { certificationRepo } from "./certification.repo";
import { assertFeature } from "@/server/features/features.service";

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

async function assertCanManageCertification(ctx: AuthContext) {
  await assertFeature(ctx, "/ap-certification");
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

  async createStage(ctx: AuthContext, params: unknown) {
    const data: CreateStageParams = createStageSchema.parse(params);
    await assertCanManageCertification(ctx);

    const newStage = await certificationRepo.createStage(data);
    return newStage;
  },

  async updateStage(ctx: AuthContext, params: unknown) {
    const data: UpdateStageParams = updateStageSchema.parse(params);
    await assertCanManageCertification(ctx);

    const updatedStage = await certificationRepo.updateStage(data.id, {
      name: data.name,
      sortIndex: data.sortIndex,
    });
    return updatedStage;
  },

  async deleteStage(ctx: AuthContext, params: unknown) {
    const { id } = deleteStageSchema.parse(params);
    await assertCanManageCertification(ctx);

    await certificationRepo.deleteStage(id);
    return { success: true };
  },
};
