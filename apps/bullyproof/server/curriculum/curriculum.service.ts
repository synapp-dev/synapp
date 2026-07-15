import {
  getStagesSchema,
  getYearsSchema,
  getStageByIdSchema,
  getStageByCodeSchema,
  getStageBySlugSchema,
  getYearByIdSchema,
  getLevelsSchema,
  createStageSchema,
  updateStageSchema,
  deleteStageSchema,
  type GetStagesParams,
  type GetYearsParams,
  type CreateStageParams,
  type UpdateStageParams,
} from "./curriculum.validators";
import { curriculumRepo } from "./curriculum.repo";
import { assertFeature } from "@/server/features/features.service";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewCurriculum(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view curriculum
  return;
}

async function assertCanManageCurriculum(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/content");
}

export const curriculumService = {
  async getStages(ctx: AuthContext, query: unknown) {
    const params: GetStagesParams = getStagesSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    // Use the optimized method that includes years, scoped to the content type
    // (defaults to the Default type when the param is omitted).
    return await curriculumRepo.getStagesWithYears(params.contentTypeId);
  },

  async getYears(ctx: AuthContext, query: unknown) {
    const params: GetYearsParams = getYearsSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    // Support both single levelId (for backward compatibility) and multiple levelIds
    if (params.levelIds && params.levelIds.length > 0) {
      return await curriculumRepo.getYears(params.levelIds);
    }

    if (params.levelId) {
      return await curriculumRepo.getYearsByLevel(params.levelId);
    }

    return await curriculumRepo.getYears();
  },

  async getLevels(ctx: AuthContext, query: unknown) {
    getLevelsSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getLevels();
  },

  async getStageById(ctx: AuthContext, params: unknown) {
    const { id } = getStageByIdSchema.parse(params);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getStageWithYears(id);
  },

  async getStageByCode(ctx: AuthContext, params: unknown) {
    const { code } = getStageByCodeSchema.parse(params);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getStageByCodeWithYears(code);
  },

  async getStageBySlug(ctx: AuthContext, params: unknown) {
    const { slug } = getStageBySlugSchema.parse(params);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getStageBySlugWithYears(slug);
  },

  async getYearById(ctx: AuthContext, params: unknown) {
    const { id } = getYearByIdSchema.parse(params);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getYearWithStages(id);
  },

  async createStage(ctx: AuthContext, params: unknown) {
    const data: CreateStageParams = createStageSchema.parse(params);
    await assertCanManageCurriculum(ctx);

    const newStage = await curriculumRepo.createStage(data);
    return newStage;
  },

  async updateStage(ctx: AuthContext, params: unknown) {
    const data: UpdateStageParams = updateStageSchema.parse(params);
    await assertCanManageCurriculum(ctx);

    const updatedStage = await curriculumRepo.updateStage(data.id, {
      name: data.name,
      minimumYearLevelIds: data.minimumYearLevelIds,
    });
    return updatedStage;
  },

  async deleteStage(ctx: AuthContext, params: unknown) {
    const { id } = deleteStageSchema.parse(params);
    await assertCanManageCurriculum(ctx);

    await curriculumRepo.deleteStage(id);
    return { success: true };
  },
};
