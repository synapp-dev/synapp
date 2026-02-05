import { db } from "@/server/db/drizzle";
import { lessons, topics, lessonClasses, classes, userProfile, curriculumStages, classYears, schoolYears, schools } from "@/server/db/schema";
import { eq, and, inArray, desc, asc, sql, or } from "drizzle-orm";

export const lessonsRepo = {
  getAll: (status?: string) =>
    status
      ? db.select().from(lessons).where(eq(lessons.status, status))
      : db.select().from(lessons),

  getById: (id: string) =>
    db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1),

  getByTeacherId: (teacherId: string, status?: string) =>
    db
      .select()
      .from(lessons)
      .where(
        status
          ? and(eq(lessons.createdByUserId, teacherId), eq(lessons.status, status))
          : eq(lessons.createdByUserId, teacherId)
      )
      .orderBy(desc(lessons.createdAt)),

  getByStatus: (status: string) =>
    db
      .select()
      .from(lessons)
      .where(eq(lessons.status, status))
      .orderBy(desc(lessons.createdAt)),

  getBySchoolId: (schoolId: string, status?: string) =>
    db
      .select()
      .from(lessons)
      .where(
        status
          ? and(eq(lessons.schoolId, schoolId), eq(lessons.status, status))
          : eq(lessons.schoolId, schoolId)
      )
      .orderBy(desc(lessons.createdAt)),

  getByClassId: (classId: string, status?: string) =>
    db
      .select({
        lesson: lessons,
        topic: topics,
      })
      .from(lessons)
      .innerJoin(topics, eq(lessons.topicId, topics.id))
      .innerJoin(lessonClasses, eq(lessons.id, lessonClasses.lessonId))
      .where(
        status
          ? and(eq(lessonClasses.classId, classId), eq(lessons.status, status))
          : eq(lessonClasses.classId, classId)
      )
      .orderBy(desc(lessons.createdAt)),

  getWithDetails: async (id: string) => {
    const lessonData = await db
      .select({
        lesson: lessons,
        topic: topics,
        teacher: {
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email,
        },
      })
      .from(lessons)
      .innerJoin(topics, eq(lessons.topicId, topics.id))
      .innerJoin(userProfile, eq(lessons.createdByUserId, userProfile.id))
      .where(eq(lessons.id, id))
      .limit(1);

    if (lessonData.length === 0) return null;

    // Get assigned classes with their year level information
    const assignedClassesRaw = await db
      .select({
        classId: lessonClasses.classId,
        className: classes.name,
        classCode: classes.code,
        yearDisplayName: schoolYears.displayName,
        yearSortIndex: schoolYears.sortIndex,
      })
      .from(lessonClasses)
      .innerJoin(classes, eq(lessonClasses.classId, classes.id))
      .leftJoin(classYears, eq(classes.id, classYears.classId))
      .leftJoin(schoolYears, eq(classYears.schoolYearId, schoolYears.id))
      .where(eq(lessonClasses.lessonId, id));

    // Group year names by class and create a range display
    const classesMap = new Map<string, {
      classId: string;
      className: string;
      classCode: string | null;
      yearNames: { name: string; sortIndex: number | null }[];
    }>();

    for (const row of assignedClassesRaw) {
      if (!classesMap.has(row.classId)) {
        classesMap.set(row.classId, {
          classId: row.classId,
          className: row.className,
          classCode: row.classCode,
          yearNames: [],
        });
      }
      if (row.yearDisplayName) {
        const entry = classesMap.get(row.classId)!;
        // Avoid duplicates
        if (!entry.yearNames.some(y => y.name === row.yearDisplayName)) {
          entry.yearNames.push({ name: row.yearDisplayName, sortIndex: row.yearSortIndex });
        }
      }
    }

    // Convert to final format with year name range
    const assignedClasses = Array.from(classesMap.values()).map(c => {
      // Sort year names by sort index
      c.yearNames.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      const names = c.yearNames.map(y => y.name);
      
      // Create display string: single name or "First – Last" range
      let yearLevelDisplay: string | null = null;
      if (names.length === 1) {
        yearLevelDisplay = names[0]!;
      } else if (names.length > 1) {
        yearLevelDisplay = `${names[0]} – ${names[names.length - 1]}`;
      }

      return {
        classId: c.classId,
        className: c.className,
        classCode: c.classCode,
        yearLevelDisplay,
      };
    });

    return {
      ...lessonData[0]!.lesson,
      topic: lessonData[0]!.topic,
      teacher: lessonData[0]!.teacher,
      assignedClasses,
    };
  },

  create: (data: {
    schoolId: string;
    topicId: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    scheduledFor?: string;
    status?: string;
    classIds?: string[];
  }) =>
    db.transaction(async (tx) => {
      const { classIds, ...lessonData } = data;
      const newLesson = await tx
        .insert(lessons)
        .values({
          ...lessonData,
          status: lessonData.status || 'preparing', // Default to 'preparing' if not provided
        })
        .returning();

      if (classIds && classIds.length > 0) {
        await tx
          .insert(lessonClasses)
          .values(classIds.map(classId => ({ 
            lessonId: newLesson[0]!.id, 
            classId 
          })));
      }

      return newLesson[0];
    }),

  update: (id: string, data: {
    title?: string;
    description?: string;
    scheduledFor?: string;
    status?: string;
    classIds?: string[];
  }) =>
    db.transaction(async (tx) => {
      const { classIds, ...lessonData } = data;
      
      // Only update lesson fields if there are any properties to update
      if (Object.keys(lessonData).length > 0) {
        await tx
          .update(lessons)
          .set(lessonData)
          .where(eq(lessons.id, id));
      }

      // Handle class assignments separately
      if (classIds !== undefined) {
        await tx
          .delete(lessonClasses)
          .where(eq(lessonClasses.lessonId, id));
        
        if (classIds.length > 0) {
          await tx
            .insert(lessonClasses)
            .values(classIds.map(classId => ({ 
              lessonId: id, 
              classId 
            })));
        }
      }

      // Return the updated lesson
      const updatedLesson = await tx
        .select()
        .from(lessons)
        .where(eq(lessons.id, id))
        .limit(1);
      
      return updatedLesson[0];

      return updatedLesson[0];
    }),

  delete: (id: string) =>
    db.transaction(async (tx) => {
      await tx
        .delete(lessonClasses)
        .where(eq(lessonClasses.lessonId, id));
      
      await tx
        .delete(lessons)
        .where(eq(lessons.id, id));
    }),

  getRecommendationsForClasses: async (classIds: string[]) => {
    const requestId = `[REPO-${Date.now()}]`;
    console.log(`${requestId} [REPO] getRecommendationsForClasses called with classIds:`, classIds);
    
    try {
      // Early return if no class IDs
      if (!classIds || classIds.length === 0) {
        console.log(`${requestId} [REPO] No classIds provided - returning empty data`);
        return {
          classProgress: [],
          classYearCodes: [],
        };
      }

      console.log(`${requestId} [REPO] Step 1: Querying completed lessons for ${classIds.length} classes`);
      

      // Get most recent completed lesson per class with topic and stage info
      const completedLessonsData = await db
        .select({
          classId: lessonClasses.classId,
          className: classes.name,
          lessonId: lessons.id,
          lessonCreatedAt: lessons.createdAt,
          topicId: topics.id,
          topicTitle: topics.title,
          topicStageOrder: topics.stageOrder,
          stageId: curriculumStages.id,
          stageName: curriculumStages.name,
          stageCode: curriculumStages.code,
          stageSortIndex: curriculumStages.sortIndex,
        })
        .from(lessonClasses)
        .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
        .innerJoin(topics, eq(lessons.topicId, topics.id))
        .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
        .innerJoin(classes, eq(lessonClasses.classId, classes.id))
        .where(
          and(
            inArray(lessonClasses.classId, classIds),
            eq(lessons.status, "completed")
          )
        )
        .orderBy(desc(lessons.createdAt));

      // Group by classId and get the most recent lesson per class
      const classProgressMap = new Map<
        string,
        {
          classId: string;
          className: string;
          topicId: string;
          topicTitle: string;
          stageId: string;
          stageName: string;
          stageCode: string;
          stageOrder: number | null;
          stageSortIndex: number;
          lessonId: string;
          lessonCreatedAt: string;
        }
      >();

      console.log(`${requestId} [REPO] Step 2: Grouping completed lessons by classId`);
      for (const row of completedLessonsData) {
        if (!classProgressMap.has(row.classId)) {
          classProgressMap.set(row.classId, {
            classId: row.classId,
            className: row.className,
            topicId: row.topicId,
            topicTitle: row.topicTitle,
            stageId: row.stageId,
            stageName: row.stageName,
            stageCode: row.stageCode,
            stageOrder: row.topicStageOrder,
            stageSortIndex: row.stageSortIndex,
            lessonId: row.lessonId,
            lessonCreatedAt: row.lessonCreatedAt,
          });
        }
      }

      console.log(`${requestId} [REPO] Step 2: Grouped into ${classProgressMap.size} unique classes with progress`);

      // Get year codes for all classes (including those without completed lessons)
      console.log(`${requestId} [REPO] Step 3: Querying year codes for all classes`);
      const classesWithYears = await db
        .select({
          classId: classes.id,
          className: classes.name,
          yearCode: schoolYears.code,
        })
        .from(classes)
        .leftJoin(classYears, eq(classes.id, classYears.classId))
        .leftJoin(schoolYears, eq(classYears.schoolYearId, schoolYears.id))
        .where(inArray(classes.id, classIds));

      console.log(`${requestId} [REPO] Step 3: Query completed - found ${classesWithYears.length} class-year records`);

      // Group year codes by class
      const classYearCodesMap = new Map<string, { className: string; yearCodes: string[] }>();
      console.log(`${requestId} [REPO] Step 4: Grouping year codes by classId`);
      for (const row of classesWithYears) {
        if (!classYearCodesMap.has(row.classId)) {
          classYearCodesMap.set(row.classId, {
            className: row.className,
            yearCodes: [],
          });
        }
        if (row.yearCode) {
          const entry = classYearCodesMap.get(row.classId)!;
          if (!entry.yearCodes.includes(row.yearCode)) {
            entry.yearCodes.push(row.yearCode);
          }
        }
      }

      const result = {
        classProgress: Array.from(classProgressMap.values()),
        classYearCodes: Array.from(classYearCodesMap.entries()).map(([classId, data]) => {
          if (!data) {
            return {
              classId,
              className: "Unknown Class",
              yearCodes: [],
            };
          }
          return {
            classId,
            ...data,
          };
        }),
      };

      console.log(`${requestId} [REPO] SUCCESS: Returning data:`, {
        classProgressCount: result.classProgress.length,
        classYearCodesCount: result.classYearCodes.length,
        classProgress: result.classProgress.map(p => ({ classId: p.classId, topicId: p.topicId })),
        classYearCodes: result.classYearCodes.map(c => ({ classId: c.classId, yearCodes: c.yearCodes }))
      });

      return result;
    } catch (error: any) {
      console.error(`${requestId} [REPO] EXCEPTION: Error in getRecommendationsForClasses:`, error);
      console.error(`${requestId} [REPO] EXCEPTION: Error message:`, error.message);
      console.error(`${requestId} [REPO] EXCEPTION: Error stack:`, error.stack);
      throw error;
    }
  },

  getActiveLessonsForClasses: async (classIds: string[]) => {
    const requestId = `[REPO-ACTIVE-${Date.now()}]`;
    console.log(`${requestId} [REPO] getActiveLessonsForClasses called with classIds:`, classIds);
    
    try {
      // Early return if no class IDs
      if (!classIds || classIds.length === 0) {
        console.log(`${requestId} [REPO] No classIds provided - returning empty array`);
        return [];
      }

      console.log(`${requestId} [REPO] Step 1: Querying active lessons (preparing, ready, in_progress, feedback) for ${classIds.length} classes`);
      // Get active lessons (NOT cancelled or completed) for the given class IDs
      // Statuses: 'preparing', 'ready', 'in_progress', 'feedback'
      const activeLessonsData = await db
        .select({
          lessonId: lessons.id,
          lessonStatus: lessons.status,
          lessonCreatedAt: lessons.createdAt,
          lessonCreatedByUserId: lessons.createdByUserId,
          topicId: topics.id,
          topicTitle: topics.title,
          classId: lessonClasses.classId,
          className: classes.name,
          schoolId: schools.id,
          schoolSlug: schools.slug,
          ownerFirstName: userProfile.firstName,
          ownerLastName: userProfile.lastName,
          ownerEmail: userProfile.email,
        })
        .from(lessonClasses)
        .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
        .innerJoin(topics, eq(lessons.topicId, topics.id))
        .innerJoin(classes, eq(lessonClasses.classId, classes.id))
        .innerJoin(schools, eq(lessons.schoolId, schools.id))
        .leftJoin(userProfile, eq(lessons.createdByUserId, userProfile.id))
        .where(
          and(
            inArray(lessonClasses.classId, classIds),
            sql`${lessons.status} NOT IN ('cancelled', 'completed')`
          )
        )
        .orderBy(desc(lessons.createdAt));

      console.log(`${requestId} [REPO] Step 1: Query completed - found ${activeLessonsData.length} active lesson records`);

      // Group by lessonId to get unique lessons with their associated classes
      const lessonsMap = new Map<
        string,
        {
          lessonId: string;
          title: string;
          status: "preparing" | "ready" | "in_progress" | "feedback";
          topicId: string;
          topicTitle: string;
          classIds: string[];
          classes: Array<{ classId: string; className: string }>;
          schoolId: string;
          schoolSlug: string | null;
          createdByUserId: string;
          ownerName: string | null;
          ownerEmail: string | null;
        }
      >();

      console.log(`${requestId} [REPO] Step 2: Grouping active lessons by lessonId`);
      for (const row of activeLessonsData) {
        if (!lessonsMap.has(row.lessonId)) {
          const ownerName = row.ownerFirstName && row.ownerLastName
            ? `${row.ownerFirstName} ${row.ownerLastName}`
            : row.ownerEmail || null;

          lessonsMap.set(row.lessonId, {
            lessonId: row.lessonId,
            title: row.topicTitle || "Untitled Lesson",
            status: row.lessonStatus as "preparing" | "ready" | "in_progress" | "feedback",
            topicId: row.topicId,
            topicTitle: row.topicTitle,
            classIds: [],
            classes: [],
            schoolId: row.schoolId,
            schoolSlug: row.schoolSlug,
            createdByUserId: row.lessonCreatedByUserId,
            ownerName,
            ownerEmail: row.ownerEmail || null,
          });
        }

        const lesson = lessonsMap.get(row.lessonId)!;
        if (!lesson.classIds.includes(row.classId)) {
          lesson.classIds.push(row.classId);
          lesson.classes.push({
            classId: row.classId,
            className: row.className,
          });
        }
      }

      const result = Array.from(lessonsMap.values());
      console.log(`${requestId} [REPO] SUCCESS: Returning ${result.length} unique active lessons`);
      return result;
    } catch (error: any) {
      console.error(`${requestId} [REPO] EXCEPTION: Error in getActiveLessonsForClasses:`, error);
      console.error(`${requestId} [REPO] EXCEPTION: Error message:`, error.message);
      console.error(`${requestId} [REPO] EXCEPTION: Error stack:`, error.stack);
      throw error;
    }
  },
};
