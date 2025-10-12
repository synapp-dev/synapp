import { db } from "@/server/db/drizzle";
import { classes, classYears, schoolYears, schoolLevels } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

export const classesRepo = {
  getAll: () => db.select().from(classes),

  getById: (id: string) =>
    db
      .select()
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1),

  getBySchoolId: (schoolId: string) =>
    db
      .select()
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(asc(classes.name)),

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
        ...data,
        active: data.active ?? true,
      })
      .returning(),

  update: (id: string, data: {
    name?: string;
    code?: string;
    stream?: string;
    room?: string;
    studentCap?: number;
    active?: boolean;
  }) =>
    db
      .update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning(),

  delete: (id: string) =>
    db
      .delete(classes)
      .where(eq(classes.id, id)),

  assignYears: (classId: string, yearIds: string[]) =>
    db
      .insert(classYears)
      .values(yearIds.map(yearId => ({ classId, schoolYearId: yearId }))),

  removeYears: (classId: string) =>
    db
      .delete(classYears)
      .where(eq(classYears.classId, classId)),
};
