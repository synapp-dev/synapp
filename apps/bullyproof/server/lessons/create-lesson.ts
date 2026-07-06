import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { userProfile, userRoles } from "@/server/db/schema";
import type { CreateLessonParams } from "./lessons.validators";
import { lessonsRepo } from "./lessons.repo";
import {
  assertCanManageLessons,
  resolveCreateLessonOwner,
  type LessonAccessAuthContext,
} from "./lesson-access-policy";

export type CreateLessonEvent = {
  type: "created";
  userId: string;
  userName?: string;
  timestamp: string;
  payload: { status: string };
};

export type CreateLessonDeps = {
  assertCanManage: () => Promise<void>;
  resolveOwner: (input: {
    schoolId: string;
    createdByUserId?: string;
  }) => Promise<{
    effectiveCreatedByUserId: string;
    metadata?: Record<string, unknown>;
  }>;
  getCreatorDisplayName: (userId: string) => Promise<string | undefined>;
  insertLesson: (data: {
    schoolId: string;
    topicId: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    scheduledFor?: string;
    status?: string;
    classIds?: string[];
    metadata?: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  getLessonDetails: (id: string) => Promise<unknown>;
};

export function buildCreateEventHistory(
  effectiveCreatedByUserId: string,
  creatorName: string | undefined,
  status: string
): CreateLessonEvent[] {
  return [
    {
      type: "created",
      userId: effectiveCreatedByUserId,
      userName: creatorName,
      timestamp: new Date().toISOString(),
      payload: { status },
    },
  ];
}

export async function createLesson(
  data: CreateLessonParams,
  deps: CreateLessonDeps
) {
  await deps.assertCanManage();

  const { effectiveCreatedByUserId, metadata } = await deps.resolveOwner({
    schoolId: data.schoolId,
    createdByUserId: data.createdByUserId,
  });

  const creatorName = await deps.getCreatorDisplayName(
    effectiveCreatedByUserId
  );
  const initialStatus = data.status ?? "preparing";
  const eventHistory = buildCreateEventHistory(
    effectiveCreatedByUserId,
    creatorName,
    "preparing"
  );
  const finalMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
    eventHistory,
  };

  const newLesson = await deps.insertLesson({
    ...data,
    status: initialStatus,
    createdByUserId: effectiveCreatedByUserId,
    metadata: finalMetadata,
  });

  return deps.getLessonDetails(newLesson.id);
}

export function createServerCreateLessonDeps(
  ctx: LessonAccessAuthContext
): CreateLessonDeps {
  return {
    assertCanManage: async () => {
      await assertCanManageLessons(ctx, ctx.userId!);
    },

    resolveOwner: (input) =>
      resolveCreateLessonOwner(ctx, input, {
        userHasSchoolRole: async (userId, schoolId) => {
          const schoolMembership = await db
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .where(
              and(
                eq(userRoles.userId, userId),
                eq(userRoles.schoolId, schoolId),
                eq(userRoles.roleScope, "school")
              )
            )
            .limit(1);
          return schoolMembership.length > 0;
        },
      }),

    getCreatorDisplayName: async (userId) => {
      const creatorProfile = await db
        .select({
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
        })
        .from(userProfile)
        .where(eq(userProfile.id, userId))
        .limit(1);
      const profile = creatorProfile[0];
      if (profile?.firstName && profile?.lastName) {
        return `${profile.firstName} ${profile.lastName}`;
      }
      return undefined;
    },

    insertLesson: (data) => lessonsRepo.create(data),

    getLessonDetails: (id) => lessonsRepo.getWithDetails(id),
  };
}
