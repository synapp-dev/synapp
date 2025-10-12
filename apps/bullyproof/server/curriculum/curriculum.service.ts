import {
  getStagesSchema,
  getYearsSchema,
  getStageByIdSchema,
  getYearByIdSchema,
  getLevelsSchema,
  type GetStagesParams,
  type GetYearsParams,
  type GetStageByIdParams,
  type GetYearByIdParams,
  type GetLevelsParams,
} from "./curriculum.validators";
import { curriculumRepo } from "./curriculum.repo";
import { getUserScopedRoles } from "../auth/rbac";

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

export const curriculumService = {
  async getStages(ctx: AuthContext, query: unknown) {
    const params: GetStagesParams = getStagesSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getStages();
  },

  async getYears(ctx: AuthContext, query: unknown) {
    const params: GetYearsParams = getYearsSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    if (params.levelId) {
      return await curriculumRepo.getYearsByLevel(params.levelId);
    }

    return await curriculumRepo.getYears();
  },

  async getLevels(ctx: AuthContext, query: unknown) {
    const params: GetLevelsParams = getLevelsSchema.parse(query);
    await assertCanViewCurriculum(ctx);

    return await curriculumRepo.getLevels();
  },

  async getStageById(ctx: AuthContext, params: unknown) {
    const { id } = getStageByIdSchema.parse(params);
    await assertCanViewCurriculum(ctx);
    
    return await curriculumRepo.getStageWithYears(id);
  },

  async getYearById(ctx: AuthContext, params: unknown) {
    const { id } = getYearByIdSchema.parse(params);
    await assertCanViewCurriculum(ctx);
    
    return await curriculumRepo.getYearWithStages(id);
  },
};
