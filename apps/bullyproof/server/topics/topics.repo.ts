import { db } from "@/server/db/drizzle";
import { topics, curriculumStages, topicSlides } from "@/server/db/schema";
import { eq, and, inArray, desc, asc, ilike } from "drizzle-orm";

export const topicsRepo = {
  getAll: () => db.select().from(topics),

  getById: (id: string) =>
    db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1),

  getByStageId: (stageId: string) =>
    db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId))
      .orderBy(asc(topics.title)),

  getWithDetails: async (id: string) => {
    const topicData = await db
      .select({
        topic: topics,
        stage: curriculumStages,
      })
      .from(topics)
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
      .where(eq(topics.id, id))
      .limit(1);

    if (topicData.length === 0) return null;

    const slides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, id))
      .orderBy(asc(topicSlides.orderIndex));

    return {
      ...topicData[0].topic,
      stage: topicData[0].stage,
      slides,
    };
  },

  search: async (params: {
    search?: string;
    stageId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { search, stageId, limit = 50, offset = 0 } = params;
    
    let query = db
      .select({
        topic: topics,
        stage: curriculumStages,
      })
      .from(topics)
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id));

    if (stageId) {
      query = query.where(eq(topics.stageId, stageId));
    }

    if (search) {
      query = query.where(
        ilike(topics.title, `%${search}%`)
      );
    }

    return query
      .orderBy(asc(topics.title))
      .limit(limit)
      .offset(offset);
  },

  create: (data: {
    stageId: string;
    title: string;
    description?: string;
    officialNotes?: string;
  }) =>
    db
      .insert(topics)
      .values(data)
      .returning(),

  update: (id: string, data: {
    title?: string;
    description?: string;
    officialNotes?: string;
  }) =>
    db
      .update(topics)
      .set(data)
      .where(eq(topics.id, id))
      .returning(),

  delete: (id: string) =>
    db
      .delete(topics)
      .where(eq(topics.id, id)),
};
