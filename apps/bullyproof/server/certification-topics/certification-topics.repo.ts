import { db } from "@/server/db/drizzle";
import { certificationTopics, certificationStages } from "@/server/db/schema";
import { eq, asc, desc } from "drizzle-orm";

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

  create: async (data: {
    stageId: string;
    title: string;
    officialNotes?: string | null;
    stageOrder?: number | null;
  }) => {
    // If stageOrder is not provided, automatically assign the next available order
    if (data.stageOrder === null || data.stageOrder === undefined) {
      const existingTopics = await db
        .select()
        .from(certificationTopics)
        .where(eq(certificationTopics.stageId, data.stageId))
        .orderBy(desc(certificationTopics.stageOrder));

      const maxOrder =
        existingTopics.length > 0 && existingTopics[0].stageOrder !== null
          ? existingTopics[0].stageOrder!
          : 0;

      data.stageOrder = maxOrder + 1;
    }

    return db.insert(certificationTopics).values(data).returning();
  },

  update: (
    id: string,
    data: {
      title?: string;
      officialNotes?: string | null;
      status?: string;
      stageOrder?: number | null;
    }
  ) => db.update(certificationTopics).set(data).where(eq(certificationTopics.id, id)).returning(),

  delete: (id: string) => db.delete(certificationTopics).where(eq(certificationTopics.id, id)),

  // Reorder topics based on an array of topic IDs in the desired order
  reorderTopics: async (stageId: string, topicIds: string[]) => {
    // First, move all topics to temporary high indices to avoid conflicts
    // Using 30000 as tempOffset to stay within smallint range (max 32767)
    const tempOffset = 30000;
    const allTopics = await db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.stageId, stageId));

    // Phase 1: Move all topics to temporary indices
    for (let i = 0; i < allTopics.length; i++) {
      await db
        .update(certificationTopics)
        .set({
          stageOrder: tempOffset + i,
        })
        .where(eq(certificationTopics.id, allTopics[i].id));
    }

    // Phase 2: Assign new stageOrder values based on topicIds array (1-indexed)
    for (let i = 0; i < topicIds.length; i++) {
      await db
        .update(certificationTopics)
        .set({
          stageOrder: i + 1, // stageOrder is 1-indexed
        })
        .where(eq(certificationTopics.id, topicIds[i]));
    }

    // Phase 3: Handle any topics not in the topicIds array (shouldn't happen, but handle gracefully)
    const remainingTopics = await db
      .select()
      .from(certificationTopics)
      .where(eq(certificationTopics.stageId, stageId));

    const topicsNotInArray = remainingTopics.filter(
      (topic) => !topicIds.includes(topic.id)
    );

    // Assign sequential stageOrder to remaining topics (append to end)
    for (let i = 0; i < topicsNotInArray.length; i++) {
      await db
        .update(certificationTopics)
        .set({
          stageOrder: topicIds.length + i + 1,
        })
        .where(eq(certificationTopics.id, topicsNotInArray[i].id));
    }
  },
};
