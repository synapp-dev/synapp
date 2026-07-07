import {
  createLessonSchema,
  updateLessonSchema,
  listLessonsSchema,
  getLessonByIdSchema,
  getRecommendationsSchema,
  getClassProgressSchema,
  type CreateLessonParams,
  type UpdateLessonParams,
  type ListLessonsParams,
  type GetLessonByIdParams,
  type GetRecommendationsParams,
} from "./lessons.validators";
import { lessonsRepo } from "./lessons.repo";
import { resolveSchoolId } from "../school/resolve-school-ref";
import { classesRepo } from "../classes/classes.repo";
import { getUserScopedRoles, hasPlatformRole } from "../auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import {
  assertCanManageLessons,
  assertCanTakeOverLesson,
  assertCanViewLessons,
} from "./lesson-access-policy";
import {
  createServerRecommendationDeps,
  orchestrateClassProgress,
  orchestrateRecommendations,
} from "./recommendation-orchestrator";
import {
  createLesson as orchestrateCreateLesson,
  createServerCreateLessonDeps,
} from "./create-lesson";
import {
  buildLessonUpdateMetadata,
  evaluateLessonStatusChange,
  statusChangeRequiresPlatformAdmin,
} from "@/lib/lesson-lifecycle";
import { classes, lessons, userProfile } from "@/server/db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

export const lessonsService = {
  async listLessons(ctx: AuthContext, query: unknown) {
    const params = listLessonsSchema.parse(query);
    let resolvedSchoolId = params.schoolId;
    if (params.schoolId) {
      const schoolId = await resolveSchoolId(params.schoolId);
      if (!schoolId) return [];
      resolvedSchoolId = schoolId;
    }
    await assertCanViewLessons(ctx, params.teacherId, resolvedSchoolId);

    if (params.teacherId) {
      return await lessonsRepo.getByTeacherId(params.teacherId, params.status, {
        schoolId: resolvedSchoolId,
        limit: params.limit,
        offset: params.offset,
      });
    }

    if (params.classId) {
      return await lessonsRepo.getByClassId(params.classId, params.status, {
        limit: params.limit,
        offset: params.offset,
      });
    }

    if (resolvedSchoolId) {
      return await lessonsRepo.getBySchoolId(resolvedSchoolId, params.status, {
        limit: params.limit,
        offset: params.offset,
      });
    }

    if (ctx.userId) {
      const hasAdminLessons = await checkFeatureAccess(ctx.userId, "/admin/lessons");
      if (hasAdminLessons) {
        return await lessonsRepo.getAll(params.status, params.limit, params.offset);
      }
      return await lessonsRepo.getByTeacherId(ctx.userId, params.status, {
        limit: params.limit,
        offset: params.offset,
      });
    }

    return await lessonsRepo.getAll(params.status, params.limit, params.offset);
  },

  async getOutstandingFeedbackLessons(ctx: AuthContext) {
    if (!ctx.userId) return [];
    return await lessonsRepo.getOutstandingFeedbackByTeacher(ctx.userId);
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
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    return orchestrateCreateLesson(
      data,
      createServerCreateLessonDeps(ctx)
    );
  },

  async updateLesson(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateLessonParams = updateLessonSchema.parse(params);

    const existingLesson = await lessonsRepo.getById(id);
    if (!existingLesson[0]) {
      throw new Error("Lesson not found");
    }

    await assertCanManageLessons(
      ctx,
      existingLesson[0].createdByUserId,
      existingLesson[0].schoolId
    );

    // Validate classes if classIds is provided
    if (data.classIds !== undefined) {
      const lessonSchoolId = existingLesson[0].schoolId;
      
      // Fetch all classes to validate
      const classData = await db
        .select({
          id: classes.id,
          schoolId: classes.schoolId,
          name: classes.name,
          active: classes.active,
        })
        .from(classes)
        .where(inArray(classes.id, data.classIds));

      // Check all classes exist
      if (classData.length !== data.classIds.length) {
        const foundIds = classData.map(c => c.id);
        const missingIds = data.classIds.filter(id => !foundIds.includes(id));
        throw new Error(`One or more classes not found: ${missingIds.join(", ")}`);
      }

      // Check all classes belong to the same school as the lesson
      const classesFromDifferentSchool = classData.filter(c => c.schoolId !== lessonSchoolId);
      if (classesFromDifferentSchool.length > 0) {
        const classNames = classesFromDifferentSchool.map(c => c.name).join(", ");
        throw new Error(`All classes must belong to the same school as the lesson. The following classes belong to a different school: ${classNames}`);
      }

      // Check all classes are active
      const inactiveClasses = classData.filter(c => !c.active);
      if (inactiveClasses.length > 0) {
        const classNames = inactiveClasses.map(c => c.name).join(", ");
        throw new Error(`One or more classes are inactive: ${classNames}`);
      }
    }

    // Status-change permissions: pure rules in lib/lesson-lifecycle, roles
    // fetched only when the change actually needs the platform-admin check.
    const existing = existingLesson[0]!;
    const transitionInput = {
      requestedStatus: data.status,
      currentStatus: existing.status ?? "",
    };
    let actorIsPlatformAdmin = false;
    if (statusChangeRequiresPlatformAdmin(transitionInput)) {
      const roles = await getUserScopedRoles(ctx.userId!);
      actorIsPlatformAdmin = hasPlatformRole(roles, "PLATFORM_ADMIN", "INTRADARK_DEV");
    }
    const verdict = evaluateLessonStatusChange({
      ...transitionInput,
      actorIsOwner: ctx.userId === existing.createdByUserId,
      actorIsPlatformAdmin,
    });
    if (verdict.allowed === false) {
      throw new Error(verdict.reason);
    }

    // Build update payload with event history (pure construction).
    const updateData: Record<string, unknown> = { ...data };

    const actorProfile = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, ctx.userId!))
      .limit(1);
    const actorName =
      actorProfile[0]?.firstName && actorProfile[0]?.lastName
        ? `${actorProfile[0].firstName} ${actorProfile[0].lastName}`
        : undefined;

    const nextMetadata = buildLessonUpdateMetadata({
      existing: {
        status: existing.status ?? "",
        scheduledFor: existing.scheduledFor,
        createdByUserId: existing.createdByUserId,
        metadata: existing.metadata,
      },
      changes: { status: data.status, scheduledFor: data.scheduledFor },
      actor: { userId: ctx.userId, userName: actorName },
      timestamp: new Date().toISOString(),
    });
    if (nextMetadata) {
      updateData.metadata = nextMetadata;
    }

    await lessonsRepo.update(id, updateData as UpdateLessonParams & { metadata?: Record<string, unknown> });
    return await lessonsRepo.getWithDetails(id);
  },

  async takeOverLesson(ctx: AuthContext, lessonId: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    const lessonRows = await lessonsRepo.getById(lessonId);
    if (!lessonRows[0]) throw new Error("Lesson not found");
    const lesson = lessonRows[0];

    await assertCanTakeOverLesson(ctx, {
      schoolId: lesson.schoolId,
      status: lesson.status,
      createdByUserId: lesson.createdByUserId,
    });

    const previousOwnerId = lesson.createdByUserId ?? "";
    const previousOwnerProfile = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, previousOwnerId))
      .limit(1);
    const previousOwnerName =
      previousOwnerProfile[0]?.firstName && previousOwnerProfile[0]?.lastName
        ? `${previousOwnerProfile[0].firstName} ${previousOwnerProfile[0].lastName}`
        : null;

    const newOwnerProfile = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, ctx.userId))
      .limit(1);
    const newOwnerName =
      newOwnerProfile[0]?.firstName && newOwnerProfile[0]?.lastName
        ? `${newOwnerProfile[0].firstName} ${newOwnerProfile[0].lastName}`
        : "";

    await lessonsRepo.takeOver(lessonId, ctx.userId, newOwnerName, previousOwnerId, previousOwnerName);
    return await lessonsRepo.getWithDetails(lessonId);
  },

  async deleteLesson(ctx: AuthContext, id: string) {
    const existingLesson = await lessonsRepo.getById(id);
    if (!existingLesson[0]) {
      throw new Error("Lesson not found");
    }

    await assertCanManageLessons(
      ctx,
      existingLesson[0].createdByUserId,
      existingLesson[0].schoolId
    );

    await lessonsRepo.delete(id);
    return { success: true };
  },

  async getRecommendations(ctx: AuthContext, params: unknown) {
    const { classIds } = getRecommendationsSchema.parse(params);
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    return orchestrateRecommendations(
      { classIds, viewerUserId: ctx.userId },
      createServerRecommendationDeps(ctx)
    );
  },

  /** Per-class level + next lesson, for the wizard class-selection step. */
  async getClassProgress(ctx: AuthContext, params: unknown) {
    const { classIds } = getClassProgressSchema.parse(params);
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    return orchestrateClassProgress(
      { classIds },
      createServerRecommendationDeps(ctx)
    );
  },
};
