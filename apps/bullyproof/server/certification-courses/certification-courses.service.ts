import {
  getCoursesSchema,
  getCourseByIdSchema,
  getCourseByCodeSchema,
  getCourseBySlugSchema,
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  type GetCoursesParams,
  type GetCourseByIdParams,
  type GetCourseByCodeParams,
  type GetCourseBySlugParams,
  type CreateCourseParams,
  type UpdateCourseParams,
  type DeleteCourseParams,
} from "./certification-courses.validators";
import { certificationCoursesRepo } from "./certification-courses.repo";
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

export const certificationCoursesService = {
  async getCourses(ctx: AuthContext, query: unknown) {
    const params: GetCoursesParams = getCoursesSchema.parse(query);
    await assertCanViewCertification(ctx);

    return await certificationCoursesRepo.getCourses();
  },

  async getCourseById(ctx: AuthContext, params: unknown) {
    const { id } = getCourseByIdSchema.parse(params);
    await assertCanViewCertification(ctx);

    const courses = await certificationCoursesRepo.getCourseById(id);
    if (courses.length === 0) return null;

    const course = await certificationCoursesRepo.getCourseWithTopics(id);

    return course;
  },

  async getCourseByCode(ctx: AuthContext, params: unknown) {
    const { code } = getCourseByCodeSchema.parse(params);
    await assertCanViewCertification(ctx);

    return await certificationCoursesRepo.getCourseByCodeWithTopics(code);
  },

  async getCourseBySlug(ctx: AuthContext, params: unknown) {
    const { slug } = getCourseBySlugSchema.parse(params);
    await assertCanViewCertification(ctx);

    return await certificationCoursesRepo.getCourseBySlugWithTopics(slug);
  },

  async createCourse(ctx: AuthContext, params: unknown) {
    const data: CreateCourseParams = createCourseSchema.parse(params);
    await assertCanManageCertification(ctx);

    const newCourse = await certificationCoursesRepo.createCourse(data);
    return newCourse;
  },

  async updateCourse(ctx: AuthContext, params: unknown) {
    const data: UpdateCourseParams = updateCourseSchema.parse(params);
    await assertCanManageCertification(ctx);

    const updatedCourse = await certificationCoursesRepo.updateCourse(data.id, {
      name: data.name,
      sortIndex: data.sortIndex,
      certificateType: data.certificateType,
      ratingQuestions: data.ratingQuestions,
    });
    return updatedCourse;
  },

  async deleteCourse(ctx: AuthContext, params: unknown) {
    const { id } = deleteCourseSchema.parse(params);
    await assertCanManageCertification(ctx);

    await certificationCoursesRepo.deleteCourse(id);
    return { success: true };
  },
};
