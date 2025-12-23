import { db } from "@/server/db/drizzle";
import { lessons, topics, lessonClasses, classes, userProfile } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

export const lessonsRepo = {
  getAll: () => db.select().from(lessons),

  getById: (id: string) =>
    db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1),

  getByTeacherId: (teacherId: string) =>
    db
      .select()
      .from(lessons)
      .where(eq(lessons.createdByUserId, teacherId))
      .orderBy(desc(lessons.createdAt)),

  getByClassId: (classId: string) =>
    db
      .select({
        lesson: lessons,
        topic: topics,
      })
      .from(lessons)
      .innerJoin(topics, eq(lessons.topicId, topics.id))
      .innerJoin(lessonClasses, eq(lessons.id, lessonClasses.lessonId))
      .where(eq(lessonClasses.classId, classId))
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

    const assignedClasses = await db
      .select({
        classId: lessonClasses.classId,
        className: classes.name,
        classCode: classes.code,
      })
      .from(lessonClasses)
      .innerJoin(classes, eq(lessonClasses.classId, classes.id))
      .where(eq(lessonClasses.lessonId, id));

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
          status: lessonData.status || 'draft', // Default to 'draft' if not provided
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
    classIds?: string[];
  }) =>
    db.transaction(async (tx) => {
      const { classIds, ...lessonData } = data;
      const updatedLesson = await tx
        .update(lessons)
        .set(lessonData)
        .where(eq(lessons.id, id))
        .returning();

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
};
