import {
  getSchoolSectorsSchema,
  getSchoolSectorByIdSchema,
  getSchoolSectorByKeySchema,
  type GetSchoolSectorsParams,
  type GetSchoolSectorByIdParams,
  type GetSchoolSectorByKeyParams,
} from "./school-sectors.validators";
import { schoolSectorsRepo } from "./school-sectors.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewSchoolSectors(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // All authenticated users can view school sectors
  return;
}

export const schoolSectorsService = {
  async getSchoolSectors(ctx: AuthContext, query: unknown) {
    const params: GetSchoolSectorsParams = getSchoolSectorsSchema.parse(query);
    await assertCanViewSchoolSectors(ctx);

    return await schoolSectorsRepo.getAll();
  },

  async getSchoolSectorById(ctx: AuthContext, params: unknown) {
    const { id } = getSchoolSectorByIdSchema.parse(params);
    await assertCanViewSchoolSectors(ctx);
    
    const sector = await schoolSectorsRepo.getById(id);
    return sector[0] ?? null;
  },

  async getSchoolSectorByKey(ctx: AuthContext, params: unknown) {
    const { key } = getSchoolSectorByKeySchema.parse(params);
    await assertCanViewSchoolSectors(ctx);
    
    const sector = await schoolSectorsRepo.getByKey(key);
    return sector[0] ?? null;
  },
};
