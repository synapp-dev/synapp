import {
  getSchoolLevelsSchema,
  getSchoolLevelByIdSchema,
  getSchoolLevelByKeySchema,
  type GetSchoolLevelsParams,
  type GetSchoolLevelByIdParams,
  type GetSchoolLevelByKeyParams,
} from "./school-levels.validators";
import { schoolLevelsRepo } from "./school-levels.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewSchoolLevels(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view school levels
  return;
}

export const schoolLevelsService = {
  async getSchoolLevels(ctx: AuthContext, query: unknown) {
    const params: GetSchoolLevelsParams = getSchoolLevelsSchema.parse(query);
    await assertCanViewSchoolLevels(ctx);

    return await schoolLevelsRepo.getAll();
  },

  async getSchoolLevelById(ctx: AuthContext, params: unknown) {
    const { id } = getSchoolLevelByIdSchema.parse(params);
    await assertCanViewSchoolLevels(ctx);
    
    const level = await schoolLevelsRepo.getById(id);
    return level[0] ?? null;
  },

  async getSchoolLevelByKey(ctx: AuthContext, params: unknown) {
    const { key } = getSchoolLevelByKeySchema.parse(params);
    await assertCanViewSchoolLevels(ctx);
    
    const level = await schoolLevelsRepo.getByKey(key);
    return level[0] ?? null;
  },
};
