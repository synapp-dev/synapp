import {
  listSchoolsQuerySchema,
  type ListSchoolsQuery,
} from "./school.validators";
import { schoolRepo } from "./school.repo";
import { getUserScopedRoles } from "../auth/rbac";

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
};
