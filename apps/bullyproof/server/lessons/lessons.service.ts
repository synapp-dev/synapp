import {
  createLessonSchema,
  updateLessonSchema,
  listLessonsSchema,
  getLessonByIdSchema,
  getRecommendationsSchema,
  type CreateLessonParams,
  type UpdateLessonParams,
  type ListLessonsParams,
  type GetLessonByIdParams,
  type GetRecommendationsParams,
} from "./lessons.validators";
import { lessonsRepo } from "./lessons.repo";
import { topicsRepo } from "../topics/topics.repo";
import { curriculumRepo } from "../curriculum/curriculum.repo";
import { classesRepo } from "../classes/classes.repo";
import { getUserScopedRoles, ADMIN_CANNOT_CREATE_LESSON_KEYS } from "../auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { classes, lessons, topics, lessonClasses, userRoles, userProfile } from "@/server/db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageLessons(
  ctx: AuthContext,
  teacherId?: string,
  schoolId?: string
) {
  if (!ctx.userId) throw new Error("Unauthorized");
  const hasAdminLessons = await checkFeatureAccess(ctx.userId, "/admin/lessons");
  if (hasAdminLessons) return;
  if (teacherId && ctx.userId === teacherId) return;
  if (schoolId) {
    const hasLessons = await checkFeatureAccess(ctx.userId, "/school/lessons", schoolId);
    const roles = await getUserScopedRoles(ctx.userId);
    if (
      hasLessons &&
      roles.school.some(
        (r) => r.schoolId?.toLowerCase().trim() === schoolId.toLowerCase().trim()
      )
    )
      return;
  }
  throw new Error("Unauthorized to manage lessons");
}

async function assertCanViewLessons(
  ctx: AuthContext,
  teacherId?: string,
  schoolId?: string
) {
  if (!ctx.userId) throw new Error("Unauthorized");
  const hasAdminLessons = await checkFeatureAccess(ctx.userId, "/admin/lessons");
  if (hasAdminLessons) return;
  if (teacherId && ctx.userId === teacherId) return;
  if (schoolId) {
    const hasLessons = await checkFeatureAccess(ctx.userId, "/school/lessons", schoolId);
    const roles = await getUserScopedRoles(ctx.userId);
    if (
      hasLessons &&
      roles.school.some(
        (r) => r.schoolId?.toLowerCase().trim() === schoolId.toLowerCase().trim()
      )
    )
      return;
  }
  if (!schoolId) {
    const roles = await getUserScopedRoles(ctx.userId);
    if (roles.school.some((r) => r.roleKey === "TEACHER")) return;
  }
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

    if (ctx.userId) {
      const hasAdminLessons = await checkFeatureAccess(ctx.userId, "/admin/lessons");
      if (hasAdminLessons) {
        return await lessonsRepo.getAll(params.status);
      }
      return await lessonsRepo.getByTeacherId(ctx.userId, params.status);
    }

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

    const roles = await getUserScopedRoles(ctx.userId!);
    const isAdminRestricted = roles.platform.some((key) =>
      ADMIN_CANNOT_CREATE_LESSON_KEYS.includes(key as (typeof ADMIN_CANNOT_CREATE_LESSON_KEYS)[number])
    );

    let effectiveCreatedByUserId = ctx.userId!;
    let metadata: Record<string, unknown> | undefined;

    if (isAdminRestricted) {
      if (!data.createdByUserId) {
        throw new Error("You must select a user to create the lesson on behalf of.");
      }
      if (data.createdByUserId === ctx.userId) {
        throw new Error("You cannot create a lesson on your own behalf. Please select another user.");
      }
      // Validate selected user has a school role at this school
      const schoolMembership = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, data.createdByUserId),
            eq(userRoles.schoolId, data.schoolId),
            eq(userRoles.roleScope, "school")
          )
        )
        .limit(1);
      if (!schoolMembership.length) {
        throw new Error("The selected user is not a member of this school.");
      }
      effectiveCreatedByUserId = data.createdByUserId;
      metadata = {
        createdByAdmin: {
          adminUserId: ctx.userId,
          createdAt: new Date().toISOString(),
        },
      };
    }

    // Initialize eventHistory for audit trail
    const creatorProfile = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, effectiveCreatedByUserId))
      .limit(1);
    const creatorName =
      creatorProfile[0]?.firstName && creatorProfile[0]?.lastName
        ? `${creatorProfile[0].firstName} ${creatorProfile[0].lastName}`
        : undefined;
    const eventHistory = [
      {
        type: "created",
        userId: effectiveCreatedByUserId,
        userName: creatorName,
        timestamp: new Date().toISOString(),
        payload: { status: "preparing" },
      },
    ];
    const finalMetadata: Record<string, unknown> = {
      ...(metadata ?? {}),
      eventHistory,
    };

    const newLesson = await lessonsRepo.create({
      ...data,
      createdByUserId: effectiveCreatedByUserId,
      metadata: finalMetadata,
    });

    return await lessonsRepo.getWithDetails(newLesson.id);
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

    // Owner-only check for status → feedback
    if (data.status === "feedback") {
      if (ctx.userId !== existingLesson[0].createdByUserId) {
        throw new Error("Only the lesson owner can transition the lesson to feedback.");
      }
    }

    // Build update payload with event history
    const updateData: Record<string, unknown> = { ...data };
    const existing = existingLesson[0]!;
    const currentMeta = (existing.metadata as Record<string, unknown>) || {};
    let history = Array.isArray(currentMeta.eventHistory) ? [...currentMeta.eventHistory] : [];

    const actorProfile = await db
      .select({ firstName: userProfile.firstName, lastName: userProfile.lastName })
      .from(userProfile)
      .where(eq(userProfile.id, ctx.userId!))
      .limit(1);
    const actorName =
      actorProfile[0]?.firstName && actorProfile[0]?.lastName
        ? `${actorProfile[0].firstName} ${actorProfile[0].lastName}`
        : undefined;

    if (data.status !== undefined && data.status !== existing.status) {
      history.push({
        type: "status_transition",
        userId: ctx.userId,
        userName: actorName,
        timestamp: new Date().toISOString(),
        payload: { fromStatus: existing.status, toStatus: data.status },
      });
    }
    if (data.scheduledFor !== undefined && data.scheduledFor !== existing.scheduledFor) {
      history.push({
        type: "scheduled",
        userId: ctx.userId,
        userName: actorName,
        timestamp: new Date().toISOString(),
        payload: {
          previousScheduledFor: existing.scheduledFor ?? undefined,
          scheduledFor: data.scheduledFor,
        },
      });
    }

    if (history.length > 0) {
      const newMeta: Record<string, unknown> = { ...currentMeta, eventHistory: history };
      if (data.status === "feedback") {
        newMeta.feedbackOwnerUserId = existing.createdByUserId;
      }
      updateData.metadata = newMeta;
    }

    await lessonsRepo.update(id, updateData as UpdateLessonParams & { metadata?: Record<string, unknown> });
    return await lessonsRepo.getWithDetails(id);
  },

  async takeOverLesson(ctx: AuthContext, lessonId: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    const lessonRows = await lessonsRepo.getById(lessonId);
    if (!lessonRows[0]) throw new Error("Lesson not found");
    const lesson = lessonRows[0];

    // Only TEACHER at the school can take over (not SCHOOL_ADMIN, SCHOOL_STAFF)
    const roles = await getUserScopedRoles(ctx.userId);
    const isTeacherAtSchool = roles.school.some(
      (r) => r.schoolId === lesson.schoolId && r.roleKey === "TEACHER"
    );
    if (!isTeacherAtSchool) {
      throw new Error("You must be a teacher at this school to take over the lesson.");
    }

    const takeOverableStatuses = ["preparing", "ready", "in_progress"];
    if (!takeOverableStatuses.includes(lesson.status)) {
      throw new Error("You cannot take over this lesson.");
    }

    if (lesson.createdByUserId === ctx.userId) {
      throw new Error("You are already the owner.");
    }

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
    const requestId = `[SVC-${Date.now()}]`;
    console.log(`${requestId} [SERVICE] getRecommendations called`);
    
    try {
      console.log(`${requestId} [SERVICE] Step 1: Parsing params with schema`);
      const { classIds } = getRecommendationsSchema.parse(params);
      console.log(`${requestId} [SERVICE] Step 1: Parsed classIds:`, classIds);

      if (!ctx.userId) {
        console.error(`${requestId} [SERVICE] ERROR: ctx.userId is null/undefined`);
        throw new Error("Unauthorized");
      }
      console.log(`${requestId} [SERVICE] Step 2: ctx.userId validated:`, ctx.userId);

      // Verify classes exist and get their school IDs
      console.log(`${requestId} [SERVICE] Step 3: Querying database for class data`);
      const classData = await db
        .select({
          id: classes.id,
          schoolId: classes.schoolId,
          name: classes.name,
        })
        .from(classes)
        .where(inArray(classes.id, classIds));

      console.log(`${requestId} [SERVICE] Step 3: Found ${classData.length} classes (requested ${classIds.length})`);
      console.log(`${requestId} [SERVICE] Step 3: Class data:`, classData.map(c => ({ id: c.id, name: c.name, schoolId: c.schoolId })));

      if (classData.length !== classIds.length) {
        const foundIds = classData.map(c => c.id);
        const missingIds = classIds.filter(id => !foundIds.includes(id));
        console.error(`${requestId} [SERVICE] ERROR: Missing classes:`, missingIds);
        throw new Error("One or more classes not found");
      }

      const schoolIds = [...new Set(classData.map((c) => c.schoolId))];
      const hasAdminLessons = await checkFeatureAccess(ctx.userId, "/admin/lessons");
      if (!hasAdminLessons) {
        const roles = await getUserScopedRoles(ctx.userId);
        for (const schoolId of schoolIds) {
          const hasLessons = await checkFeatureAccess(ctx.userId, "/school/lessons", schoolId);
          const hasMembership = roles.school.some((r) => r.schoolId === schoolId);
          if (!hasLessons || !hasMembership) {
            throw new Error("Unauthorized to access one or more classes");
          }
        }
      }

      // Get recommendation data from repository
      console.log(`${requestId} [SERVICE] Step 5: Fetching recommendation data from repository`);
      const recommendationData = await lessonsRepo.getRecommendationsForClasses(
        classIds
      );

      console.log(`${requestId} [SERVICE] Step 5: Recommendation data received:`, {
        hasData: !!recommendationData,
        classProgressCount: recommendationData?.classProgress?.length ?? 0,
        classYearCodesCount: recommendationData?.classYearCodes?.length ?? 0
      });

      if (!recommendationData) {
        console.error(`${requestId} [SERVICE] ERROR: Repository returned null/undefined`);
        throw new Error("Failed to get recommendation data from repository");
      }

      // Get active lessons for the selected classes (for conflict detection)
      console.log(`${requestId} [SERVICE] Step 6: Fetching active lessons`);
      const activeLessons = await lessonsRepo.getActiveLessonsForClasses(classIds) || [];
      console.log(`${requestId} [SERVICE] Step 6: Found ${activeLessons.length} active lessons`);

      // Get all stages with years for matching
      console.log(`${requestId} [SERVICE] Step 7: Fetching all stages with years`);
      const allStages = (await curriculumRepo.getStagesWithYears()) || [];
      console.log(`${requestId} [SERVICE] Step 7: Found ${allStages.length} stages`);

      // Get all topics for finding next topic
      console.log(`${requestId} [SERVICE] Step 8: Fetching all topics`);
      const allTopics = (await topicsRepo.getAll()) || [];
      console.log(`${requestId} [SERVICE] Step 8: Found ${allTopics.length} topics`);

      // Process recommendation logic
      console.log(`${requestId} [SERVICE] Step 9: Processing recommendation logic`);
      const classProgress = Array.isArray(recommendationData.classProgress) 
        ? recommendationData.classProgress 
        : [];
      const classYearCodes = Array.isArray(recommendationData.classYearCodes)
        ? recommendationData.classYearCodes
        : [];

      console.log(`${requestId} [SERVICE] Step 9: Processed data:`, {
        classProgressCount: classProgress.length,
        classYearCodesCount: classYearCodes.length,
        classProgress: classProgress.map(p => ({ classId: p.classId, topicId: p.topicId, stageId: p.stageId, stageOrder: p.stageOrder }))
      });

      // Case 1: Classes have completed lessons
      if (classProgress.length > 0) {
        console.log(`${requestId} [SERVICE] Step 10: Case 1 - Classes have completed lessons`);
        // Check if all classes are on the same topic
        const uniqueTopics = new Set(classProgress.map((p) => p.topicId));
        console.log(`${requestId} [SERVICE] Step 10: Unique topics found:`, Array.from(uniqueTopics));

        if (uniqueTopics.size === 1) {
          console.log(`${requestId} [SERVICE] Step 10: All classes on same topic - finding earliest incomplete topic`);
          // All classes are on the same topic - find earliest incomplete topic in the stage
          const firstProgress = classProgress[0];
          console.log(`${requestId} [SERVICE] Step 10: First progress:`, {
            stageId: firstProgress.stageId,
            stageOrder: firstProgress.stageOrder,
            topicId: firstProgress.topicId
          });

          if (firstProgress.stageId) {
            // Get all completed topics for these classes in this stage
            const allCompletedTopics = await db
              .select({
                topicId: topics.id,
                stageOrder: topics.stageOrder,
              })
              .from(lessonClasses)
              .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
              .innerJoin(topics, eq(lessons.topicId, topics.id))
              .where(
                and(
                  inArray(lessonClasses.classId, classIds),
                  eq(lessons.status, "completed"),
                  eq(topics.stageId, firstProgress.stageId)
                )
              );

            const completedTopicIds = new Set(allCompletedTopics.map(t => t.topicId));
            const completedStageOrders = new Set(
              allCompletedTopics
                .map(t => t.stageOrder)
                .filter((order): order is number => order !== null)
            );

            console.log(`${requestId} [SERVICE] Step 10: Found ${completedTopicIds.size} completed topics in stage ${firstProgress.stageId}`);
            console.log(`${requestId} [SERVICE] Step 10: Completed stage orders:`, Array.from(completedStageOrders).sort((a, b) => a - b));

            // Get all topics in this stage, sorted by stageOrder
            const stageTopics = allTopics
              .filter((t) => t.stageId === firstProgress.stageId)
              .sort((a, b) => {
                const orderA = a.stageOrder ?? 999999;
                const orderB = b.stageOrder ?? 999999;
                return orderA - orderB;
              });

            console.log(`${requestId} [SERVICE] Step 10: Found ${stageTopics.length} topics in stage ${firstProgress.stageId}`);

            // Find the earliest incomplete topic
            let recommendedTopic = stageTopics.find(
              (t) => !completedTopicIds.has(t.id)
            );

            // If all topics are completed, find the next topic after the highest completed one
            if (!recommendedTopic && completedStageOrders.size > 0) {
              const maxCompletedOrder = Math.max(...Array.from(completedStageOrders));
              console.log(`${requestId} [SERVICE] Step 10: All topics completed, finding next after order ${maxCompletedOrder}`);
              recommendedTopic = stageTopics.find(
                (t) => (t.stageOrder ?? 999999) > maxCompletedOrder
              );
            }

            if (recommendedTopic) {
              console.log(`${requestId} [SERVICE] Step 10: Found recommended topic:`, { 
                id: recommendedTopic.id, 
                title: recommendedTopic.title, 
                stageOrder: recommendedTopic.stageOrder 
              });
              const stage = allStages.find((s) => s.id === recommendedTopic.stageId);
              // Get completed lesson info for the explanation
              const completedLessonInfo = {
                topicTitle: firstProgress.topicTitle,
                completedAt: firstProgress.lessonCreatedAt,
              };
              
              console.log(`${requestId} [SERVICE] SUCCESS: Returning recommendation with reason "next_topic"`);
              return {
                recommendedTopicId: recommendedTopic.id,
                recommendedTopic: {
                  id: recommendedTopic.id,
                  title: recommendedTopic.title,
                  stageId: recommendedTopic.stageId,
                  stageName: stage?.name || "",
                  stageOrder: recommendedTopic.stageOrder,
                },
                warning: null,
                reason: "next_topic" as const,
                completedLessonInfo,
                activeLessons: (activeLessons || []).map((lesson) => ({
                  lessonId: lesson.lessonId,
                  title: lesson.title,
                  status: lesson.status,
                  topicId: lesson.topicId,
                  topicTitle: lesson.topicTitle,
                  classIds: lesson.classIds || [],
                  className: (lesson.classes || []).map((c) => c.className).join(", "),
                  schoolId: lesson.schoolId,
                  schoolSlug: lesson.schoolSlug,
                  createdByUserId: lesson.createdByUserId,
                  ownerName: lesson.ownerName,
                  ownerEmail: lesson.ownerEmail,
                })),
              };
            } else {
              console.log(`${requestId} [SERVICE] Step 10: No incomplete topic found in same stage`);
            }
          } else {
            console.log(`${requestId} [SERVICE] Step 10: Missing stageId in firstProgress`);
          }
        } else {
          console.log(`${requestId} [SERVICE] Step 10: Classes on different topics - returning warning`);
          // Classes are on different topics - return warning
          const warningClasses = classProgress.map((progress) => {
            const classInfo = classData.find((c) => c.id === progress.classId);
            return {
              classId: progress.classId,
              className: classInfo?.name || "Unknown Class",
              topicTitle: progress.topicTitle,
              stageName: progress.stageName,
            };
          });

          console.log(`${requestId} [SERVICE] SUCCESS: Returning warning for different topics`);
          return {
            recommendedTopicId: null,
            recommendedTopic: null,
            warning: {
              show: true,
              classes: warningClasses,
            },
            reason: null,
            completedLessonInfo: null,
            activeLessons: activeLessons.map((lesson) => ({
              lessonId: lesson.lessonId,
              title: lesson.title,
              status: lesson.status,
              topicTitle: lesson.topicTitle,
              classIds: lesson.classIds,
              className: lesson.classes.map((c) => c.className).join(", "),
              schoolId: lesson.schoolId,
              schoolSlug: lesson.schoolSlug,
              createdByUserId: lesson.createdByUserId,
              ownerName: lesson.ownerName,
              ownerEmail: lesson.ownerEmail,
            })),
          };
        }
      }

      // Case 2: No completed lessons - use year codes to find matching stages
      console.log(`${requestId} [SERVICE] Step 11: Case 2 - Checking year codes fallback`);
      const allYearCodes = new Set<string>();
      // Map class IDs to their year codes
      const classToYearCodes = new Map<string, string[]>();
      if (classYearCodes && Array.isArray(classYearCodes)) {
        classYearCodes.forEach((classData) => {
          if (classData?.yearCodes && Array.isArray(classData.yearCodes)) {
            const yearCodes: string[] = [];
            classData.yearCodes.forEach((code) => {
              if (code) {
                allYearCodes.add(code);
                yearCodes.push(code);
              }
            });
            classToYearCodes.set(classData.classId, yearCodes);
          }
        });
      }

      console.log(`${requestId} [SERVICE] Step 11: Collected year codes:`, Array.from(allYearCodes));

      if (allYearCodes.size > 0) {
        // Find stages that match the year codes
        const matchingStages = (allStages || []).filter((stage) => {
          if (!stage?.years || !Array.isArray(stage.years) || stage.years.length === 0) return false;
          return stage.years.some((year) => year?.code && allYearCodes.has(year.code));
        });

        console.log(`${requestId} [SERVICE] Step 11: Found ${matchingStages.length} matching stages`);

        // Sort by sortIndex
        const sortedMatchingStages = matchingStages.sort(
          (a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999)
        );

        if (sortedMatchingStages.length > 0) {
          // If multiple stages match, return stage selection options
          if (sortedMatchingStages.length > 1) {
            console.log(`${requestId} [SERVICE] Step 11: Multiple stages detected - returning stage selection options`);
            
            // Map classes to stages based on their year codes
            const stageOptions = sortedMatchingStages.map((stage) => {
              const stageYearCodes = new Set(
                stage.years?.map((y) => y.code).filter((c): c is string => !!c) || []
              );
              
              // Find which classes belong to this stage
              const classesInStage: Array<{ classId: string; className: string; yearCodes: string[] }> = [];
              classToYearCodes.forEach((yearCodes, classId) => {
                const hasMatchingYear = yearCodes.some((code) => stageYearCodes.has(code));
                if (hasMatchingYear) {
                  const classInfo = classData.find((c) => c.id === classId);
                  classesInStage.push({
                    classId,
                    className: classInfo?.name || "Unknown Class",
                    yearCodes,
                  });
                }
              });

              return {
                stageId: stage.id,
                stageName: stage.name,
                stageCode: stage.code,
                stageSortIndex: stage.sortIndex ?? 999999,
                classes: classesInStage,
              };
            });

            // Get first topic from each stage for preview
            const stageOptionsWithTopics = stageOptions.map((option) => {
              const stageTopics = allTopics
                .filter((t) => t.stageId === option.stageId)
                .sort((a, b) => {
                  const orderA = a.stageOrder ?? 999999;
                  const orderB = b.stageOrder ?? 999999;
                  return orderA - orderB;
                });

              return {
                ...option,
                firstTopic: stageTopics.length > 0 ? {
                  id: stageTopics[0].id,
                  title: stageTopics[0].title,
                  stageOrder: stageTopics[0].stageOrder,
                } : null,
              };
            });

            console.log(`${requestId} [SERVICE] SUCCESS: Returning multiple stages warning`);
            return {
              recommendedTopicId: null,
              recommendedTopic: null,
              warning: {
                show: true,
                classes: [],
                multipleStages: stageOptionsWithTopics,
              },
              reason: null,
              completedLessonInfo: null,
              activeLessons: activeLessons.map((lesson) => ({
                lessonId: lesson.lessonId,
                title: lesson.title,
                status: lesson.status,
                topicId: lesson.topicId,
                topicTitle: lesson.topicTitle,
                classIds: lesson.classIds,
                className: lesson.classes.map((c) => c.className).join(", "),
                schoolId: lesson.schoolId,
                schoolSlug: lesson.schoolSlug,
                createdByUserId: lesson.createdByUserId,
                ownerName: lesson.ownerName,
                ownerEmail: lesson.ownerEmail,
              })),
            };
          }

          // Single matching stage - proceed as before
          const firstStage = sortedMatchingStages[0];
          console.log(`${requestId} [SERVICE] Step 11: Using first matching stage:`, { id: firstStage.id, name: firstStage.name });
          
          const stageTopics = allTopics
            .filter((t) => t.stageId === firstStage.id)
            .sort((a, b) => {
              const orderA = a.stageOrder ?? 999999;
              const orderB = b.stageOrder ?? 999999;
              return orderA - orderB;
            });

          console.log(`${requestId} [SERVICE] Step 11: Found ${stageTopics.length} topics in matching stage`);

          if (stageTopics.length > 0) {
            const recommendedTopic = stageTopics[0];
            console.log(`${requestId} [SERVICE] SUCCESS: Returning recommendation with reason "fallback_year_match"`);
            return {
              recommendedTopicId: recommendedTopic.id,
              recommendedTopic: {
                id: recommendedTopic.id,
                title: recommendedTopic.title,
                stageId: recommendedTopic.stageId,
                stageName: firstStage.name,
                stageOrder: recommendedTopic.stageOrder,
              },
              warning: null,
              reason: "fallback_year_match" as const,
              completedLessonInfo: null,
              activeLessons: activeLessons.map((lesson) => ({
                lessonId: lesson.lessonId,
                title: lesson.title,
                status: lesson.status,
                topicId: lesson.topicId,
                topicTitle: lesson.topicTitle,
                classIds: lesson.classIds,
                className: lesson.classes.map((c) => c.className).join(", "),
                schoolId: lesson.schoolId,
                schoolSlug: lesson.schoolSlug,
                createdByUserId: lesson.createdByUserId,
                ownerName: lesson.ownerName,
                ownerEmail: lesson.ownerEmail,
              })),
            };
          }
        }
      } else {
        console.log(`${requestId} [SERVICE] Step 11: No year codes found`);
      }

      // Case 3: Final fallback - first topic from first stage
      console.log(`${requestId} [SERVICE] Step 12: Case 3 - Final fallback (first topic from first stage)`);
      const sortedStages = (allStages || []).sort(
        (a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999)
      );

      console.log(`${requestId} [SERVICE] Step 12: Sorted ${sortedStages.length} stages by sortIndex`);

      if (sortedStages.length > 0) {
        const firstStage = sortedStages[0];
        console.log(`${requestId} [SERVICE] Step 12: Using first stage:`, { id: firstStage.id, name: firstStage.name });
        
        const stageTopics = allTopics
          .filter((t) => t.stageId === firstStage.id)
          .sort((a, b) => {
            const orderA = a.stageOrder ?? 999999;
            const orderB = b.stageOrder ?? 999999;
            return orderA - orderB;
          });

        console.log(`${requestId} [SERVICE] Step 12: Found ${stageTopics.length} topics in first stage`);

        if (stageTopics.length > 0) {
          const recommendedTopic = stageTopics[0];
          console.log(`${requestId} [SERVICE] SUCCESS: Returning recommendation with reason "final_fallback"`);
          return {
            recommendedTopicId: recommendedTopic.id,
            recommendedTopic: {
              id: recommendedTopic.id,
              title: recommendedTopic.title,
              stageId: recommendedTopic.stageId,
              stageName: firstStage.name,
              stageOrder: recommendedTopic.stageOrder,
            },
            warning: null,
            reason: "final_fallback" as const,
            completedLessonInfo: null,
            activeLessons: activeLessons.map((lesson) => ({
              lessonId: lesson.lessonId,
              title: lesson.title,
              status: lesson.status,
              topicTitle: lesson.topicTitle,
              classIds: lesson.classIds,
              className: lesson.classes.map((c) => c.className).join(", "),
              schoolId: lesson.schoolId,
              schoolSlug: lesson.schoolSlug,
              createdByUserId: lesson.createdByUserId,
              ownerName: lesson.ownerName,
              ownerEmail: lesson.ownerEmail,
            })),
          };
        }
      }

      // No recommendation possible
      console.log(`${requestId} [SERVICE] WARNING: No recommendation possible - returning null recommendation`);
      return {
        recommendedTopicId: null,
        recommendedTopic: null,
        warning: null,
        reason: null,
        completedLessonInfo: null,
        activeLessons: activeLessons.map((lesson) => ({
          lessonId: lesson.lessonId,
          title: lesson.title,
          status: lesson.status,
          topicTitle: lesson.topicTitle,
          classIds: lesson.classIds,
          className: lesson.classes.map((c) => c.className).join(", "),
          schoolId: lesson.schoolId,
          schoolSlug: lesson.schoolSlug,
          createdByUserId: lesson.createdByUserId,
          ownerName: lesson.ownerName,
          ownerEmail: lesson.ownerEmail,
        })),
      };
    } catch (error: any) {
      console.error(`${requestId} [SERVICE] EXCEPTION: Error in getRecommendations:`, error);
      console.error(`${requestId} [SERVICE] EXCEPTION: Error message:`, error.message);
      console.error(`${requestId} [SERVICE] EXCEPTION: Error stack:`, error.stack);
      throw error;
    }
  },
};
