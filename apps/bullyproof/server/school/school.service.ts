import {
  listSchoolsQuerySchema,
  createSchoolSchema,
  type ListSchoolsQuery,
  type CreateSchoolParams,
} from "./school.validators";
import { schoolRepo } from "./school.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { db } from "@/server/db/drizzle";
import { schoolLevelAssignments } from "@/server/db/schema";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanListSchools(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  // Extend with real RBAC (e.g., require specific roles/permissions)
  const roles = await getUserScopedRoles(ctx.userId);
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }
  if (roles.school.length === 0) {
    // throw new Error("Unauthorized");
    return;
  }
}

async function assertCanCreateSchool(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const roles = await getUserScopedRoles(ctx.userId);
  // Only platform admins can create schools
  if (
    roles.platform.includes("BULLYPROOF_ADMIN") ||
    roles.platform.includes("PLATFORM_ADMIN")
  ) {
    return;
  }
  throw new Error("Unauthorized to create schools");
}

export const schoolService = {
  async listSchools(ctx: AuthContext, query: unknown) {
    await assertCanListSchools(ctx);
    const params: ListSchoolsQuery = listSchoolsQuerySchema.parse(query);
    const rows = await schoolRepo.getAllPaginated(params);
    return rows;
  },
  async getSchoolBySlug(ctx: AuthContext, slug: string) {
    await assertCanListSchools(ctx);
    const rows = await schoolRepo.getBySlug(slug);
    return rows[0] ?? null;
  },
  async createSchool(ctx: AuthContext, params: unknown) {
    await assertCanCreateSchool(ctx);
    const data: CreateSchoolParams = createSchoolSchema.parse(params);
    
    // Extract levelIds before creating school (repo doesn't need them)
    const { levelIds, ...schoolData } = data;
    
    // Create the school
    const result = await schoolRepo.create(schoolData);
    const createdSchool = result[0];
    
    // Create school level assignments
    if (levelIds && levelIds.length > 0) {
      await db.insert(schoolLevelAssignments).values(
        levelIds.map((levelId) => ({
          schoolId: createdSchool.id,
          levelId,
        }))
      );
    }
    
    return createdSchool;
  },
};
