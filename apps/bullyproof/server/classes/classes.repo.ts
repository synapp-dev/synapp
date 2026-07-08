import { db } from "@/server/db/drizzle";
import {
  classes,
  classYears,
  schoolYears,
  schoolLevels,
  teacherClasses,
  userProfile,
} from "@/server/db/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";

export const classesRepo = {
  getAll: () => db.select().from(classes),

  getById: (id: string) =>
    db.select().from(classes).where(eq(classes.id, id)).limit(1),

  getBySchoolId: async (schoolId: string) => {
    const result = await db
      .select({
        id: classes.id,
        schoolId: classes.schoolId,
        name: classes.name,
        code: classes.code,
        stream: classes.stream,
        room: classes.room,
        studentCap: classes.studentCap,
        active: classes.active,
        createdAt: classes.createdAt,
        startYear: classes.startYear,
        yearCodes: sql<string[]>`COALESCE(
          array_agg(${schoolYears.code} ORDER BY ${schoolYears.sortIndex}) 
          FILTER (WHERE ${schoolYears.code} IS NOT NULL),
          ARRAY[]::text[]
        )`,
        yearNames: sql<string[]>`COALESCE(
          array_agg(${schoolYears.displayName} ORDER BY ${schoolYears.sortIndex}) 
          FILTER (WHERE ${schoolYears.displayName} IS NOT NULL),
          ARRAY[]::text[]
        )`,
      })
      .from(classes)
      .leftJoin(classYears, eq(classYears.classId, classes.id))
      .leftJoin(schoolYears, eq(classYears.schoolYearId, schoolYears.id))
      .where(eq(classes.schoolId, schoolId))
      .groupBy(
        classes.id,
        classes.schoolId,
        classes.name,
        classes.code,
        classes.stream,
        classes.room,
        classes.studentCap,
        classes.active,
        classes.createdAt,
        classes.startYear
      )
      .orderBy(asc(classes.name));

    return result;
  },

  getWithYears: async (id: string) => {
    const classData = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1);

    if (classData.length === 0) return null;

    const years = await db
      .select({
        yearId: classYears.schoolYearId,
        yearCode: schoolYears.code,
        yearName: schoolYears.displayName,
        levelKey: schoolLevels.key,
        levelName: schoolLevels.name,
      })
      .from(classYears)
      .innerJoin(schoolYears, eq(classYears.schoolYearId, schoolYears.id))
      .innerJoin(schoolLevels, eq(schoolYears.levelId, schoolLevels.id))
      .where(eq(classYears.classId, id))
      .orderBy(asc(schoolYears.sortIndex));

    const teachers = await db
      .select({
        userId: teacherClasses.userId,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
      })
      .from(teacherClasses)
      .innerJoin(userProfile, eq(teacherClasses.userId, userProfile.id))
      .where(eq(teacherClasses.classId, id));

    return {
      ...classData[0],
      years,
      teachers,
    };
  },

  create: (data: {
    schoolId: string;
    name: string;
    code?: string;
    stream?: string;
    room?: string;
    studentCap?: number;
    active?: boolean;
    startYear?: string;
  }) =>
    db
      .insert(classes)
      .values({
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        stream: data.stream,
        room: data.room,
        studentCap: data.studentCap,
        active: data.active ?? true,
        // Running year: without this the selected year was silently dropped
        // and every class defaulted to the creation date's year.
        ...(data.startYear ? { startYear: data.startYear } : {}),
      })
      .returning(),

  update: (
    id: string,
    data: {
      name?: string;
      code?: string;
      stream?: string;
      room?: string;
      studentCap?: number;
      active?: boolean;
      startYear?: Date | string;
    }
  ) => {
    const { startYear, ...restData } = data;
    const updateData: {
      name?: string;
      code?: string;
      stream?: string;
      room?: string;
      studentCap?: number;
      active?: boolean;
      startYear?: string;
    } = { ...restData };
    if (startYear instanceof Date) {
      updateData.startYear = startYear.toISOString();
    } else if (startYear !== undefined) {
      updateData.startYear = startYear;
    }
    return db.update(classes).set(updateData).where(eq(classes.id, id)).returning();
  },

  delete: (id: string) => db.delete(classes).where(eq(classes.id, id)),

  deleteBatch: async (ids: string[]) => {
    if (ids.length === 0) return;
    
    // Use transaction to ensure atomicity: all deletes succeed or all rollback
    await db.transaction(async (tx) => {
      // Delete related classYears records
      await tx.delete(classYears).where(inArray(classYears.classId, ids));
      // Delete related teacherClasses records
      await tx.delete(teacherClasses).where(inArray(teacherClasses.classId, ids));
      // Delete the classes themselves
      await tx.delete(classes).where(inArray(classes.id, ids));
    });
  },

  assignYears: (classId: string, yearIds: string[]) =>
    db
      .insert(classYears)
      .values(yearIds.map((yearId) => ({ classId, schoolYearId: yearId }))),

  removeYears: (classId: string) =>
    db.delete(classYears).where(eq(classYears.classId, classId)),

  assignTeachers: (classId: string, userIds: string[]) => {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }
    return db
      .insert(teacherClasses)
      .values(
        userIds.map((userId) => ({
          classId,
          userId,
        }))
      )
      .onConflictDoNothing()
      .returning();
  },

  removeTeachers: (classId: string) =>
    db.delete(teacherClasses).where(eq(teacherClasses.classId, classId)),
};
