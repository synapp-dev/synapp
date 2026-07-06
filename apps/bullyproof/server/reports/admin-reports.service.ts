import { assertFeature } from "@/server/features/features.service";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import { getUserScopedRoles, hasPlatformRole } from "@/server/auth/rbac";
import {
  adminReportsRepo,
  type AdminReportsOverview,
} from "./admin-reports.repo";

const AMAYDA_SLUG = "amayda-program";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

/** Aggregate-only projection for the government view-only dashboard. */
export type GovernmentReportsOverview = {
  schoolsTotal: number;
  schoolsWithActiveLicence: number;
  lessonsTotal: number;
  lessonRatingsTotal: number;
  certificationsCompletedTotal: number;
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

  /**
   * Government stakeholders get platform-wide aggregates only: no per-school
   * rows, names, or drill-down detail.
   */
  async getGovernmentOverview(
    ctx: AuthContext
  ): Promise<GovernmentReportsOverview> {
    if (!ctx.userId) throw new Error("Unauthorized");
    const scopedRoles = await getUserScopedRoles(ctx.userId);
    if (
      !hasPlatformRole(
        scopedRoles,
        "GOVERNMENT_VIEWER",
        "PLATFORM_ADMIN",
        "INTRADARK_DEV"
      )
    ) {
      throw new Error("Unauthorized to view government reporting");
    }

    const courseRows = await certificationCoursesRepo.getCourseBySlug(
      AMAYDA_SLUG
    );
    const certificationCourseId = courseRows[0]?.id ?? null;

    const overview = await adminReportsRepo.getOverview({
      schoolId: null,
      certificationCourseId,
    });

    return {
      schoolsTotal: overview.schoolsTotal,
      schoolsWithActiveLicence: overview.schoolsWithActiveLicence,
      lessonsTotal: overview.lessonsTotal,
      lessonRatingsTotal: overview.lessonRatingsTotal,
      certificationsCompletedTotal: overview.certificationsCompletedTotal,
    };
  },
};
