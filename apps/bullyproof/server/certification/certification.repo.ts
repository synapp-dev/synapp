import { db } from "@/server/db/drizzle";
import { certificationStages } from "@/server/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export const certificationRepo = {
  getStages: () =>
    db
      .select()
      .from(certificationStages)
      .orderBy(asc(certificationStages.sortIndex)),

  getStageById: (id: string) =>
    db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.id, id))
      .limit(1),

  getStageByCode: (code: string) =>
    db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.code, code))
      .limit(1),

  getStageWithTopics: async (stageId: string) => {
    const stage = await db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.id, stageId))
      .limit(1);

    if (stage.length === 0) return null;

    // Get topic count for this stage using raw SQL since certification_topics is not in schema yet
    const topicCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`certification_topics`)
      .where(sql`stage_id = ${stageId}`);

    const topicCount = Number(topicCountResult[0]?.count ?? 0);

    return {
      ...stage[0],
      topicCount,
    };
  },

  getStageByCodeWithTopics: async (code: string) => {
    const stage = await db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.code, code))
      .limit(1);

    if (stage.length === 0) return null;

    // Get topic count for this stage using raw SQL since certification_topics is not in schema yet
    const topicCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sql`certification_topics`)
      .where(sql`stage_id = ${stage[0].id}`);

    const topicCount = Number(topicCountResult[0]?.count ?? 0);

    return {
      ...stage[0],
      topicCount,
    };
  },
};
