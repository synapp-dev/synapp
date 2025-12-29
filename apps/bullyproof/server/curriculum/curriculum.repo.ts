import { db } from "@/server/db/drizzle";
import {
  curriculumStages,
  schoolYears,
  stageYearLinks,
  schoolLevels,
} from "@/server/db/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";

export const curriculumRepo = {
  getStages: () =>
    db.select().from(curriculumStages).orderBy(asc(curriculumStages.sortIndex)),

  getStageById: (id: string) =>
    db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, id))
      .limit(1),

  getStageByCode: (code: string) =>
    db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.code, code))
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
      years: years.map((y) => ({
        ...y.year,
        level: y.level,
      })),
    };
  },

  getStageByCodeWithYears: async (code: string) => {
    const stage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.code, code))
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
      .where(eq(stageYearLinks.stageId, stage[0].id))
      .orderBy(asc(schoolYears.sortIndex));

    return {
      ...stage[0],
      years: years.map((y) => ({
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
      .innerJoin(
        curriculumStages,
        eq(stageYearLinks.stageId, curriculumStages.id)
      )
      .where(eq(stageYearLinks.schoolYearId, yearId))
      .orderBy(asc(curriculumStages.sortIndex));

    return {
      ...year[0].year,
      level: year[0].level,
      stages: stages.map((s) => s.curriculum_stages),
    };
  },

  getLevels: () =>
    db.select().from(schoolLevels).orderBy(asc(schoolLevels.key)),

  createStage: async (data: {
    code: string;
    name: string;
    minimumYearLevelIds: string[];
  }) => {
    // First, get the selected years to validate they exist
    const selectedYears = await db
      .select()
      .from(schoolYears)
      .where(inArray(schoolYears.id, data.minimumYearLevelIds));

    if (selectedYears.length === 0) {
      throw new Error("No valid year levels found");
    }

    // Create the stage with a temporary high sort_index to avoid conflicts
    // We'll recalculate all sort_index values after creating the links
    // Find the maximum existing sort_index and use max + 1, or use 30000 as fallback
    const existingStages = await db
      .select({ sortIndex: curriculumStages.sortIndex })
      .from(curriculumStages)
      .orderBy(desc(curriculumStages.sortIndex))
      .limit(1);

    const maxSortIndex =
      existingStages.length > 0 ? existingStages[0].sortIndex : -1;
    // Use max + 1, but cap at 32766 (one less than max smallint) to be safe
    const tempSortIndex = Math.min(maxSortIndex + 1, 32766);
    const [stage] = await db
      .insert(curriculumStages)
      .values({
        code: data.code,
        name: data.name,
        sortIndex: tempSortIndex,
      })
      .returning();

    // Create stage_year_links for all selected year levels
    if (data.minimumYearLevelIds.length > 0) {
      await db.insert(stageYearLinks).values(
        data.minimumYearLevelIds.map((yearId) => ({
          stageId: stage.id,
          schoolYearId: yearId,
        }))
      );
    }

    // Recalculate all stages' sort_index based on their minimum year levels
    await curriculumRepo.recalculateStageSortIndexes();

    // Fetch the updated stage
    const updatedStage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, stage.id))
      .limit(1);

    return updatedStage[0];
  },

  updateStage: async (
    stageId: string,
    data: { name: string; minimumYearLevelIds: string[] }
  ) => {
    // First, get the selected years to validate they exist
    const selectedYears = await db
      .select()
      .from(schoolYears)
      .where(inArray(schoolYears.id, data.minimumYearLevelIds));

    if (selectedYears.length === 0) {
      throw new Error("No valid year levels found");
    }

    // Check if stage exists
    const existingStage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, stageId))
      .limit(1);

    if (existingStage.length === 0) {
      throw new Error("Stage not found");
    }

    // Update the stage name
    await db
      .update(curriculumStages)
      .set({
        name: data.name,
        updatedAt: sql`now()`,
      })
      .where(eq(curriculumStages.id, stageId));

    // Delete existing year links
    await db.delete(stageYearLinks).where(eq(stageYearLinks.stageId, stageId));

    // Create new stage_year_links for all selected year levels
    if (data.minimumYearLevelIds.length > 0) {
      await db.insert(stageYearLinks).values(
        data.minimumYearLevelIds.map((yearId) => ({
          stageId: stageId,
          schoolYearId: yearId,
        }))
      );
    }

    // Recalculate all stages' sort_index based on their minimum year levels
    await curriculumRepo.recalculateStageSortIndexes();

    // Fetch the updated stage
    const updatedStage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, stageId))
      .limit(1);

    return updatedStage[0];
  },

  deleteStage: async (stageId: string) => {
    // Check if stage exists
    const existingStage = await db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.id, stageId))
      .limit(1);

    if (existingStage.length === 0) {
      throw new Error("Stage not found");
    }

    // Delete the stage (cascade will handle stage_year_links deletion)
    await db.delete(curriculumStages).where(eq(curriculumStages.id, stageId));

    // Recalculate all remaining stages' sort_index
    await curriculumRepo.recalculateStageSortIndexes();

    return { success: true };
  },

  // Recalculate all stages' sort_index based on their minimum year level's sort_index
  recalculateStageSortIndexes: async () => {
    // Get all stages
    const allStages = await db.select().from(curriculumStages);

    // For each stage, get its minimum year sort_index
    const stagesWithMinYear: Array<{
      stageId: string;
      minYearSortIndex: number | null;
    }> = [];

    for (const stage of allStages) {
      // Get all year links for this stage
      const yearLinks = await db
        .select({
          year: schoolYears,
        })
        .from(stageYearLinks)
        .innerJoin(schoolYears, eq(stageYearLinks.schoolYearId, schoolYears.id))
        .where(eq(stageYearLinks.stageId, stage.id));

      const minYearSortIndex =
        yearLinks.length > 0
          ? Math.min(...yearLinks.map((link) => link.year.sortIndex))
          : null;

      stagesWithMinYear.push({
        stageId: stage.id,
        minYearSortIndex,
      });
    }

    // Sort stages by their minimum year sort_index
    const sortedStages = stagesWithMinYear
      .filter((s) => s.minYearSortIndex !== null)
      .sort(
        (a, b) => (a.minYearSortIndex ?? 99999) - (b.minYearSortIndex ?? 99999)
      );

    // Handle stages with no year links - assign them a high sort_index
    const stagesWithoutYears = stagesWithMinYear.filter(
      (s) => s.minYearSortIndex === null
    );
    let currentSortIndex = sortedStages.length;

    // Update sort_index for stages with year links (assign sequential values based on their order)
    for (let i = 0; i < sortedStages.length; i++) {
      await db
        .update(curriculumStages)
        .set({
          sortIndex: i,
          updatedAt: sql`now()`,
        })
        .where(eq(curriculumStages.id, sortedStages[i].stageId));
    }

    // Update sort_index for stages without year links (assign high values)
    for (const stage of stagesWithoutYears) {
      await db
        .update(curriculumStages)
        .set({
          sortIndex: currentSortIndex,
          updatedAt: sql`now()`,
        })
        .where(eq(curriculumStages.id, stage.stageId));
      currentSortIndex++;
    }
  },
};
