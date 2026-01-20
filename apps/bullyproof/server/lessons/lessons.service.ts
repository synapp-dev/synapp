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
import { getUserScopedRoles } from "../auth/rbac";
import { classes, lessons, topics, lessonClasses } from "@/server/db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

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

    // If no specific filters provided and user is authenticated, 
    // automatically filter by current user's lessons (for "my lessons")
    if (ctx.userId) {
      const roles = await getUserScopedRoles(ctx.userId);
      // Platform admins can see all lessons when no filters are provided
      if (roles.platform.includes("PLATFORM_ADMIN")) {
        return await lessonsRepo.getAll(params.status);
      }
      // Regular users see only their own lessons when no filters are provided
      return await lessonsRepo.getByTeacherId(ctx.userId, params.status);
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

      // Check permissions - user must have access to all classes' schools
      console.log(`${requestId} [SERVICE] Step 4: Checking user permissions`);
      const roles = await getUserScopedRoles(ctx.userId);
      console.log(`${requestId} [SERVICE] Step 4: User roles:`, {
        platform: roles.platform,
        school: roles.school.map(r => ({ schoolId: r.schoolId, roleKey: r.roleKey }))
      });
      
      const schoolIds = [...new Set(classData.map((c) => c.schoolId))];
      console.log(`${requestId} [SERVICE] Step 4: Required schoolIds:`, schoolIds);

      // Platform admins can access any school
      if (!roles.platform.includes("PLATFORM_ADMIN")) {
        console.log(`${requestId} [SERVICE] Step 4: User is not platform admin, checking school access`);
        // Check if user has access to all required schools
        for (const schoolId of schoolIds) {
          const hasAccess = roles.school.some(
            (role) => role.schoolId === schoolId
          );
          console.log(`${requestId} [SERVICE] Step 4: School ${schoolId} access:`, hasAccess);
          if (!hasAccess) {
            console.error(`${requestId} [SERVICE] ERROR: User lacks access to school ${schoolId}`);
            throw new Error("Unauthorized to access one or more classes");
          }
        }
      } else {
        console.log(`${requestId} [SERVICE] Step 4: User is platform admin - skipping school access check`);
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
              const completedLessonInfo = firstProgress.lessonTitle
                ? {
                    lessonTitle: firstProgress.lessonTitle,
                    topicTitle: firstProgress.topicTitle,
                    completedAt: firstProgress.lessonCreatedAt,
                  }
                : null;
              
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
