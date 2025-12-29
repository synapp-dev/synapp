import { db } from "@/server/db/drizzle";
import {
  classes,
  classYears,
  schoolYears,
  schoolLevels,
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
        yearCodes: sql<string[]>`COALESCE(
          array_agg(${schoolYears.code} ORDER BY ${schoolYears.sortIndex}) 
          FILTER (WHERE ${schoolYears.code} IS NOT NULL),
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
        classes.createdAt
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

    return {
      ...classData[0],
      years,
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
    }
  ) => db.update(classes).set(data).where(eq(classes.id, id)).returning(),

  delete: (id: string) => db.delete(classes).where(eq(classes.id, id)),

  assignYears: (classId: string, yearIds: string[]) =>
    db
      .insert(classYears)
      .values(yearIds.map((yearId) => ({ classId, schoolYearId: yearId }))),

  removeYears: (classId: string) =>
    db.delete(classYears).where(eq(classYears.classId, classId)),
};
