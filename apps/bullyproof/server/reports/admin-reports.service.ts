import { assertFeature } from "@/server/features/features.service";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import {
  adminReportsRepo,
  type AdminReportsOverview,
} from "./admin-reports.repo";

const AMAYDA_SLUG = "amayda-program";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewAdminReports(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/reports");
}

export const adminReportsService = {
  async getOverview(
    ctx: AuthContext,
    params: { schoolId?: string | null }
  ): Promise<AdminReportsOverview> {
    await assertCanViewAdminReports(ctx);

    const courseRows = await certificationCoursesRepo.getCourseBySlug(
      AMAYDA_SLUG
    );
    const certificationCourseId = courseRows[0]?.id ?? null;

    return adminReportsRepo.getOverview({
      schoolId: params.schoolId,
      certificationCourseId,
    });
  },
};
