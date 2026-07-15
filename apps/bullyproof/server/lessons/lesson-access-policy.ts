import {
  getUserScopedRoles,
} from "@/server/auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { ACTION_FEATURES, PAGE_FEATURES } from "@/lib/feature-keys";
import {
  hasSchoolMembership,
  isAdminRestrictedForLessonCreate,
  isTeacherAtAnySchool,
} from "@/lib/lesson-access-policy";

export type LessonAccessAuthContext = {
  userId: string | null;
};

export type LessonAccessTarget = {
  lessonOwnerId?: string | null;
  schoolId?: string | null;
};

export type LessonAccessDecision = {
  canView: boolean;
  canManage: boolean;
  canCreate: boolean;
  isAdminRestrictedCreate: boolean;
  blockReason?: string;
};

function unauthorized(message = "Unauthorized"): never {
  throw new Error(message);
}

async function hasAdminLessonsAccess(userId: string): Promise<boolean> {
  return checkFeatureAccess(userId, PAGE_FEATURES.ADMIN_LESSONS);
}

async function hasSchoolLessonsAccess(
  userId: string,
  schoolId: string
): Promise<boolean> {
  return checkFeatureAccess(userId, PAGE_FEATURES.LESSONS, schoolId);
}

export async function evaluateLessonAccess(
  ctx: LessonAccessAuthContext,
  target: LessonAccessTarget = {}
): Promise<LessonAccessDecision> {
  if (!ctx.userId) {
    return {
      canView: false,
      canManage: false,
      canCreate: false,
      isAdminRestrictedCreate: false,
      blockReason: "Unauthorized",
    };
  }

  const roles = await getUserScopedRoles(ctx.userId);
  const hasAdminLessons = await hasAdminLessonsAccess(ctx.userId);
  const isOwner =
    !!target.lessonOwnerId && target.lessonOwnerId === ctx.userId;

  let canView = hasAdminLessons || isOwner;
  let canManage = hasAdminLessons || isOwner;

  if (target.schoolId) {
    const hasSchoolLessons = await hasSchoolLessonsAccess(
      ctx.userId,
      target.schoolId
    );
    const isMember = hasSchoolMembership(roles.school, target.schoolId);
    if (hasSchoolLessons && isMember) {
      canView = true;
      canManage = true;
    }
  } else if (!canView && isTeacherAtAnySchool(roles.school)) {
    canView = true;
  }

  const isAdminRestrictedCreate = isAdminRestrictedForLessonCreate(
    roles.platform
  );
  const canCreate = canManage;

  return {
    canView,
    canManage,
    canCreate,
    isAdminRestrictedCreate,
    blockReason: canView ? undefined : "Unauthorized to view lessons",
  };
}

export async function assertCanViewLessons(
  ctx: LessonAccessAuthContext,
  lessonOwnerId?: string | null,
  schoolId?: string | null
): Promise<void> {
  const decision = await evaluateLessonAccess(ctx, {
    lessonOwnerId,
    schoolId,
  });
  if (!decision.canView) {
    unauthorized(decision.blockReason ?? "Unauthorized to view lessons");
  }
}

export async function assertCanManageLessons(
  ctx: LessonAccessAuthContext,
  lessonOwnerId?: string | null,
  schoolId?: string | null
): Promise<void> {
  const decision = await evaluateLessonAccess(ctx, {
    lessonOwnerId,
    schoolId,
  });
  if (!decision.canManage) {
    unauthorized("Unauthorized to manage lessons");
  }
}

/** Verify access to classes that may span one or more schools (recommendations). */
export async function assertCanAccessClassesInSchools(
  ctx: LessonAccessAuthContext,
  schoolIds: string[]
): Promise<void> {
  if (!ctx.userId) unauthorized();
  if (schoolIds.length === 0) return;

  const hasAdminLessons = await hasAdminLessonsAccess(ctx.userId);
  if (hasAdminLessons) return;

  const roles = await getUserScopedRoles(ctx.userId);
  for (const schoolId of schoolIds) {
    const hasLessons = await hasSchoolLessonsAccess(ctx.userId, schoolId);
    const isMember = hasSchoolMembership(roles.school, schoolId);
    if (!hasLessons || !isMember) {
      unauthorized("Unauthorized to access one or more classes");
    }
  }
}

export async function assertCanTakeOverLesson(
  ctx: LessonAccessAuthContext,
  lesson: { schoolId: string; status: string; createdByUserId: string | null }
): Promise<void> {
  if (!ctx.userId) unauthorized();

  const hasTakeOverFeature = await checkFeatureAccess(
    ctx.userId,
    ACTION_FEATURES.TAKE_OVER_LESSON,
    lesson.schoolId
  );
  const roles = await getUserScopedRoles(ctx.userId);
  const isMember = hasSchoolMembership(roles.school, lesson.schoolId);

  if (!hasTakeOverFeature || !isMember) {
    unauthorized("You don't have permission to take over this lesson.");
  }

  const takeOverableStatuses = ["preparing", "ready", "in_progress"];
  if (!takeOverableStatuses.includes(lesson.status)) {
    unauthorized("You cannot take over this lesson.");
  }

  if (lesson.createdByUserId === ctx.userId) {
    unauthorized("You are already the owner.");
  }
}

export type CreateLessonOnBehalfInput = {
  schoolId: string;
  createdByUserId?: string;
};

export type CreateLessonOnBehalfResult = {
  effectiveCreatedByUserId: string;
  isAdminRestrictedCreate: boolean;
  metadata?: Record<string, unknown>;
};

/** Resolve lesson owner for create, including admin-on-behalf rules. */
export async function resolveCreateLessonOwner(
  ctx: LessonAccessAuthContext,
  input: CreateLessonOnBehalfInput,
  options: {
    userHasSchoolRole: (userId: string, schoolId: string) => Promise<boolean>;
  }
): Promise<CreateLessonOnBehalfResult> {
  if (!ctx.userId) unauthorized();

  const roles = await getUserScopedRoles(ctx.userId);
  const isAdminRestrictedCreate = isAdminRestrictedForLessonCreate(
    roles.platform
  );

  if (!isAdminRestrictedCreate) {
    return {
      effectiveCreatedByUserId: ctx.userId,
      isAdminRestrictedCreate: false,
    };
  }

  if (!input.createdByUserId) {
    unauthorized(
      "You must select a user to create the lesson on behalf of."
    );
  }
  if (input.createdByUserId === ctx.userId) {
    unauthorized(
      "You cannot create a lesson on your own behalf. Please select another user."
    );
  }

  const hasMembership = await options.userHasSchoolRole(
    input.createdByUserId,
    input.schoolId
  );
  if (!hasMembership) {
    unauthorized("The selected user is not a member of this school.");
  }

  return {
    effectiveCreatedByUserId: input.createdByUserId,
    isAdminRestrictedCreate: true,
    metadata: {
      createdByAdmin: {
        adminUserId: ctx.userId,
        createdAt: new Date().toISOString(),
      },
    },
  };
}

export { isAdminRestrictedForLessonCreate };
