import {
  createLessonSchema,
  updateLessonSchema,
  listLessonsSchema,
  getLessonByIdSchema,
  type CreateLessonParams,
  type UpdateLessonParams,
  type ListLessonsParams,
  type GetLessonByIdParams,
} from "./lessons.validators";
import { lessonsRepo } from "./lessons.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageLessons(ctx: AuthContext, teacherId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can manage all lessons
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // Teachers can manage their own lessons
  if (teacherId && ctx.userId === teacherId) {
    return;
  }

  // School admins can manage lessons in their schools
  if (roles.school.some((role) => role.roleKey === "SCHOOL_ADMIN")) {
    return;
  }

  throw new Error("Unauthorized to manage lessons");
}

async function assertCanViewLessons(
  ctx: AuthContext,
  teacherId?: string,
  schoolId?: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can view all lessons
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // Teachers can view their own lessons
  if (teacherId && ctx.userId === teacherId) {
    return;
  }

  // School admins can view lessons in their schools
  if (
    schoolId &&
    roles.school.some(
      (role) =>
        role.schoolId?.toLowerCase().trim() === schoolId.toLowerCase().trim() &&
        role.roleKey === "SCHOOL_ADMIN"
    )
  ) {
    return;
  }

  // Teachers at the school can view lessons in their schools
  if (
    schoolId &&
    roles.school.some(
      (role) =>
        role.schoolId?.toLowerCase().trim() === schoolId.toLowerCase().trim() &&
        role.roleKey === "TEACHER"
    )
  ) {
    return;
  }

  // If no specific schoolId is provided, allow if user is a TEACHER at any school
  // This allows teachers to list/view lessons from their schools
  if (!schoolId && roles.school.some((role) => role.roleKey === "TEACHER")) {
    return;
  }

  console.log("roles", roles);
  console.log("teacherId", teacherId);
  console.log("schoolId", schoolId);
  console.log("ctx.userId", ctx.userId);

  throw new Error("Unauthorized to view lessons");
}

export const lessonsService = {
  async listLessons(ctx: AuthContext, query: unknown) {
    const params: ListLessonsParams = listLessonsSchema.parse(query);
    await assertCanViewLessons(ctx, params.teacherId, params.schoolId);

    if (params.teacherId) {
      return await lessonsRepo.getByTeacherId(params.teacherId, params.status);
    }

    if (params.classId) {
      return await lessonsRepo.getByClassId(params.classId, params.status);
    }

    if (params.schoolId) {
      return await lessonsRepo.getBySchoolId(params.schoolId, params.status);
    }

    // For platform admins, return all lessons (optionally filtered by status)
    return await lessonsRepo.getAll(params.status);
  },

  async getLessonById(ctx: AuthContext, params: unknown) {
    const { id } = getLessonByIdSchema.parse(params);

    const lessonData = await lessonsRepo.getById(id);
    if (!lessonData[0]) {
      return null;
    }

    await assertCanViewLessons(
      ctx,
      lessonData[0].createdByUserId,
      lessonData[0].schoolId
    );

    return await lessonsRepo.getWithDetails(id);
  },

  async createLesson(ctx: AuthContext, params: unknown) {
    const data: CreateLessonParams = createLessonSchema.parse(params);
    await assertCanManageLessons(ctx, ctx.userId!);

    const newLesson = await lessonsRepo.create({
      ...data,
      createdByUserId: ctx.userId!,
    });

    return await lessonsRepo.getWithDetails(newLesson.id);
  },

  async updateLesson(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateLessonParams = updateLessonSchema.parse(params);

    const existingLesson = await lessonsRepo.getById(id);
    if (!existingLesson[0]) {
      throw new Error("Lesson not found");
    }

    await assertCanManageLessons(ctx, existingLesson[0].createdByUserId);

    const updatedLesson = await lessonsRepo.update(id, data);
    return await lessonsRepo.getWithDetails(id);
  },

  async deleteLesson(ctx: AuthContext, id: string) {
    const existingLesson = await lessonsRepo.getById(id);
    if (!existingLesson[0]) {
      throw new Error("Lesson not found");
    }

    await assertCanManageLessons(ctx, existingLesson[0].createdByUserId);

    await lessonsRepo.delete(id);
    return { success: true };
  },
};
