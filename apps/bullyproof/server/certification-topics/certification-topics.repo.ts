import { db } from "@/server/db/drizzle";
import { certificationTopics, certificationStages } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export const certificationTopicsRepo = {
  getByStageId: (stageId: string) =>
    db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.stageId, stageId))
      .orderBy(
        asc(certificationTopics.stageOrder),
        asc(certificationTopics.title)
      ),

  getByStageCode: async (stageCode: string) => {
    // First get the stage by code
    const stage = await db
      .select()
      .from(certificationStages)
      .where(eq(certificationStages.code, stageCode))
      .limit(1);

    if (stage.length === 0) return [];

    // Then get topics for that stage
    return db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.stageId, stage[0].id))
      .orderBy(
        asc(certificationTopics.stageOrder),
        asc(certificationTopics.title)
      );
  },

  getById: (id: string) =>
    db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.id, id))
      .limit(1),
};
