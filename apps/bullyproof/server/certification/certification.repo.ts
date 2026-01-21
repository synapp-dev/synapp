import { db } from "@/server/db/drizzle";
import { certificationCourses } from "@/server/db/schema";
import { eq, asc, sql, desc } from "drizzle-orm";

export const certificationRepo = {
  getStages: () =>
    db
      .select()
      .from(certificationCourses)
      .orderBy(asc(certificationCourses.sortIndex)),

  getStageById: (id: string) =>
    db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, id))
      .limit(1),

  getStageByCode: (code: string) =>
    db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, code))
      .limit(1),

  getStageWithTopics: async (stageId: string) => {
    const stage = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, stageId))
      .limit(1);

    if (stage.length === 0) return null;

    // Get topic count for this course using courseTopics table
    const topicCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`course_topics`)
      .where(sql`course_id = ${stageId}`);

    const firstResult = topicCountResult?.[0] as { count: number } | undefined;
    const topicCount = firstResult ? Number(firstResult.count ?? 0) : 0;

    return {
      ...stage[0],
      topicCount,
    };
  },

  getStageByCodeWithTopics: async (code: string) => {
    const stage = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, code))
      .limit(1);

    if (stage.length === 0) return null;

    // Get topic count for this course using courseTopics table
    const topicCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`course_topics`)
      .where(sql`course_id = ${stage[0].id}`);

    const firstResult = topicCountResult?.[0] as { count: number } | undefined;
    const topicCount = firstResult ? Number(firstResult.count ?? 0) : 0;

    return {
      ...stage[0],
      topicCount,
    };
  },

  getMaxSortIndex: async () => {
    const existingStages = await db
      .select({ sortIndex: certificationCourses.sortIndex })
      .from(certificationCourses)
      .orderBy(desc(certificationCourses.sortIndex))
      .limit(1);

    return existingStages.length > 0 ? existingStages[0].sortIndex : -1;
  },

  createStage: async (data: {
    code: string;
    name: string;
    sortIndex?: number;
  }) => {
    // If sortIndex not provided, calculate next available
    let finalSortIndex = data.sortIndex;
    if (finalSortIndex === undefined || finalSortIndex === null) {
      const maxSortIndex = await certificationRepo.getMaxSortIndex();
      finalSortIndex = Math.min(maxSortIndex + 1, 32766); // Cap at max smallint - 1
    }

    const [stage] = await db
      .insert(certificationCourses)
      .values({
        code: data.code,
        name: data.name,
        sortIndex: finalSortIndex,
      })
      .returning();

    return stage;
  },

  updateStage: async (
    stageId: string,
    data: { name?: string; sortIndex?: number }
  ) => {
    // Check if stage exists
    const existingStage = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, stageId))
      .limit(1);

    if (existingStage.length === 0) {
      throw new Error("Stage not found");
    }

    const updateData: { name?: string; sortIndex?: number; updatedAt?: any } = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.sortIndex !== undefined) {
      updateData.sortIndex = data.sortIndex;
    }
    updateData.updatedAt = sql`now()`;

    await db
      .update(certificationCourses)
      .set(updateData)
      .where(eq(certificationCourses.id, stageId));

    const [updatedStage] = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, stageId))
      .limit(1);

    return updatedStage;
  },

  deleteStage: async (stageId: string) => {
    // Check if stage exists
    const existingStage = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, stageId))
      .limit(1);

    if (existingStage.length === 0) {
      throw new Error("Stage not found");
    }

    // Delete the stage (cascade will handle related data deletion)
    await db.delete(certificationCourses).where(eq(certificationCourses.id, stageId));

    return { success: true };
  },
};
