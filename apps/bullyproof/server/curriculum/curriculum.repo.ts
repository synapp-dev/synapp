import { db } from "@/server/db/drizzle";
import { curriculumStages, schoolYears, stageYearLinks, schoolLevels } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

export const curriculumRepo = {
  getStages: () => 
    db
      .select()
      .from(curriculumStages)
      .orderBy(asc(curriculumStages.sortIndex)),

  getStageById: (id: string) =>
    db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, id))
      .limit(1),

  getYears: () =>
    db
      .select({
        year: schoolYears,
        level: schoolLevels,
      })
      .from(schoolYears)
      .innerJoin(schoolLevels, eq(schoolYears.levelId, schoolLevels.id))
      .orderBy(asc(schoolYears.sortIndex)),

  getYearsByLevel: (levelId: string) =>
    db
      .select()
      .from(schoolYears)
      .where(eq(schoolYears.levelId, levelId))
      .orderBy(asc(schoolYears.sortIndex)),

  getStageWithYears: async (stageId: string) => {
    const stage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, stageId))
      .limit(1);

    if (stage.length === 0) return null;

    const years = await db
      .select({
        year: schoolYears,
        level: schoolLevels,
      })
      .from(stageYearLinks)
      .innerJoin(schoolYears, eq(stageYearLinks.schoolYearId, schoolYears.id))
      .innerJoin(schoolLevels, eq(schoolYears.levelId, schoolLevels.id))
      .where(eq(stageYearLinks.stageId, stageId))
      .orderBy(asc(schoolYears.sortIndex));

    return {
      ...stage[0],
      years: years.map(y => ({
        ...y.year,
        level: y.level,
      })),
    };
  },

  getYearWithStages: async (yearId: string) => {
    const year = await db
      .select({
        year: schoolYears,
        level: schoolLevels,
      })
      .from(schoolYears)
      .innerJoin(schoolLevels, eq(schoolYears.levelId, schoolLevels.id))
      .where(eq(schoolYears.id, yearId))
      .limit(1);

    if (year.length === 0) return null;

    const stages = await db
      .select()
      .from(stageYearLinks)
      .innerJoin(curriculumStages, eq(stageYearLinks.stageId, curriculumStages.id))
      .where(eq(stageYearLinks.schoolYearId, yearId))
      .orderBy(asc(curriculumStages.sortIndex));

    return {
      ...year[0].year,
      level: year[0].level,
      stages: stages.map(s => s.curriculum_stages),
    };
  },

  getLevels: () =>
    db
      .select()
      .from(schoolLevels)
      .orderBy(asc(schoolLevels.key)),
};
