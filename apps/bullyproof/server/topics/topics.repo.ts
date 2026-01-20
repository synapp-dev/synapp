import { db } from "@/server/db/drizzle";
import {
  topics,
  curriculumStages,
  topicSlides,
  vTopicsWithCompletion,
} from "@/server/db/schema";
import { eq, and, inArray, desc, asc, ilike, sql, SQL } from "drizzle-orm";

export const topicsRepo = {
  getAll: () => db.select().from(topics),

  getById: (id: string) =>
    db.select().from(topics).where(eq(topics.id, id)).limit(1),

  getByStageId: (stageId: string) =>
    db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId))
      .orderBy(asc(topics.stageOrder), asc(topics.title)),

  getByStageIdWithSlides: async (stageId: string) => {
    const topicsData = await db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId))
      .orderBy(asc(topics.stageOrder), asc(topics.title));

    // Fetch slides for all topics
    const topicIds = topicsData.map((t) => t.id);
    if (topicIds.length === 0) {
      return topicsData.map((topic) => ({ ...topic, slides: [] }));
    }

    const slidesData = await db
      .select()
      .from(topicSlides)
      .where(inArray(topicSlides.topicId, topicIds))
      .orderBy(asc(topicSlides.topicId), asc(topicSlides.orderIndex));

    // Group slides by topicId
    const slidesByTopic = new Map<string, typeof slidesData>();
    for (const slide of slidesData) {
      if (!slidesByTopic.has(slide.topicId)) {
        slidesByTopic.set(slide.topicId, []);
      }
      slidesByTopic.get(slide.topicId)!.push(slide);
    }

    // Attach slides to topics
    return topicsData.map((topic) => ({
      ...topic,
      slides: slidesByTopic.get(topic.id) || [],
    }));
  },

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

  getFromView: () =>
    db
      .select()
      .from(vTopicsWithCompletion)
      .orderBy(
        asc(vTopicsWithCompletion.stageSortIndex),
        asc(vTopicsWithCompletion.stageOrder),
        asc(vTopicsWithCompletion.topicTitle)
      ),

  search: async (params: {
    search?: string;
    stageId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { search, stageId, limit = 50, offset = 0 } = params;

    const conditions = [];

    if (stageId) {
      conditions.push(eq(topics.stageId, stageId));
    }

    if (search) {
      conditions.push(ilike(topics.title, `%${search}%`));
    }

    const baseQuery = db
      .select({
        topic: topics,
        stage: curriculumStages,
      })
      .from(topics)
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id));

    const query =
      conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    return query.orderBy(asc(topics.title)).limit(limit).offset(offset);
  },

  create: async (data: {
    stageId: string;
    title: string;
    description?: string;
    officialNotes?: string;
    stageOrder?: number | null;
  }) => {
    // If stageOrder is not provided, automatically assign the next available order
    if (data.stageOrder === null || data.stageOrder === undefined) {
      const existingTopics = await db
        .select()
        .from(topics)
        .where(eq(topics.stageId, data.stageId))
        .orderBy(desc(topics.stageOrder));

      const maxOrder =
        existingTopics.length > 0 && existingTopics[0].stageOrder !== null
          ? existingTopics[0].stageOrder!
          : 0;

      data.stageOrder = maxOrder + 1;
    }

    return db.insert(topics).values(data).returning();
  },

  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      officialNotes?: string;
      status?: "draft" | "published" | "archived";
    }
  ) => db.update(topics).set(data).where(eq(topics.id, id)).returning(),

  delete: (id: string) => db.delete(topics).where(eq(topics.id, id)),

  // Reorder topics based on an array of topic IDs in the desired order
  reorderTopics: async (stageId: string, topicIds: string[]) => {
    // First, move all topics to temporary high indices to avoid conflicts
    // Using 30000 as tempOffset to stay within smallint range (max 32767)
    const tempOffset = 30000;
    const allTopics = await db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId));

    // Phase 1: Move all topics to temporary indices
    for (let i = 0; i < allTopics.length; i++) {
      await db
        .update(topics)
        .set({
          stageOrder: tempOffset + i,
        })
        .where(eq(topics.id, allTopics[i].id));
    }

    // Phase 2: Assign new stageOrder values based on topicIds array (1-indexed)
    for (let i = 0; i < topicIds.length; i++) {
      await db
        .update(topics)
        .set({
          stageOrder: i + 1, // stageOrder is 1-indexed
        })
        .where(eq(topics.id, topicIds[i]));
    }

    // Phase 3: Handle any topics not in the topicIds array (shouldn't happen, but handle gracefully)
    const remainingTopics = await db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId));

    const topicsNotInArray = remainingTopics.filter(
      (topic) => !topicIds.includes(topic.id)
    );

    // Assign sequential stageOrder to remaining topics (append to end)
    for (let i = 0; i < topicsNotInArray.length; i++) {
      await db
        .update(topics)
        .set({
          stageOrder: topicIds.length + i + 1,
        })
        .where(eq(topics.id, topicsNotInArray[i].id));
    }
  },

  createSlide: (data: {
    topicId: string;
    orderIndex: number;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
    videoStartS?: number | null;
    videoEndS?: number | null;
  }) => db.insert(topicSlides).values(data).returning(),

  updateSlide: (
    id: string,
    data: {
      kind?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
      orderIndex?: number;
    }
  ) =>
    db
      .update(topicSlides)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(topicSlides.id, id))
      .returning(),

  deleteSlide: (id: string) =>
    db.delete(topicSlides).where(eq(topicSlides.id, id)),

  // Normalize slide orderIndex values to be sequential (0, 1, 2, 3...)
  normalizeSlideOrder: async (topicId: string) => {
    // Get all slides for this topic, ordered by current orderIndex
    const allSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(asc(topicSlides.orderIndex));

    if (allSlides.length === 0) {
      return 0;
    }

    // Phase 1: Move all slides to temporary high indices to avoid unique constraint violations
    // This ensures we don't have conflicts when reassigning orderIndex values
    const tempOffset = 100000;
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(topicSlides)
        .set({
          orderIndex: tempOffset + i,
          updatedAt: sql`now()`,
        })
        .where(eq(topicSlides.id, allSlides[i].id));
    }

    // Phase 2: Assign sequential orderIndex values starting from 0
    // Now that all slides are at temp indices, we can safely assign sequential values
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(topicSlides)
        .set({
          orderIndex: i,
          updatedAt: sql`now()`,
        })
        .where(eq(topicSlides.id, allSlides[i].id));
    }

    return allSlides.length;
  },

  // Reorder slides based on an array of slide IDs in the desired order
  // Optimized to use bulk UPDATE queries with CASE statements
  // Uses two-phase update to avoid unique constraint violations
  reorderSlides: async (topicId: string, slideIds: string[]) => {
    if (slideIds.length === 0) {
      return;
    }

    // Get all slides for this topic to handle any not in slideIds array
    const allSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId));

    const slidesNotInArray = allSlides.filter(
      (slide) => !slideIds.includes(slide.id)
    );

    // Phase 1: Move all slides to temporary high indices to avoid conflicts
    // This ensures we don't have unique constraint violations when reassigning
    const tempOffset = 1000000;
    const tempSqlChunks: SQL[] = [sql`(CASE`];
    const allSlideIds = [...slideIds, ...slidesNotInArray.map((s) => s.id)];

    for (let i = 0; i < allSlideIds.length; i++) {
      tempSqlChunks.push(
        sql`WHEN ${topicSlides.id} = ${allSlideIds[i]} THEN ${tempOffset + i}`
      );
    }

    tempSqlChunks.push(sql`ELSE ${topicSlides.orderIndex} END)`);
    const tempOrderIndexCase = sql.join(tempSqlChunks, sql.raw(" "));

    await db
      .update(topicSlides)
      .set({
        orderIndex: tempOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(topicSlides.topicId, topicId),
          inArray(topicSlides.id, allSlideIds)
        )
      );

    // Phase 2: Assign final orderIndex values based on slideIds array (0-indexed)
    const finalSqlChunks: SQL[] = [sql`(CASE`];

    for (let i = 0; i < slideIds.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${topicSlides.id} = ${slideIds[i]} THEN ${i}`
      );
    }

    // Assign remaining slides (not in slideIds array) to positions after slideIds
    for (let i = 0; i < slidesNotInArray.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${topicSlides.id} = ${slidesNotInArray[i].id} THEN ${slideIds.length + i}`
      );
    }

    finalSqlChunks.push(sql`ELSE ${topicSlides.orderIndex} END)`);
    const finalOrderIndexCase = sql.join(finalSqlChunks, sql.raw(" "));

    await db
      .update(topicSlides)
      .set({
        orderIndex: finalOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(topicSlides.topicId, topicId),
          inArray(topicSlides.id, allSlideIds)
        )
      );
  },

  getSlideWithTopicAndStage: async (slideId: string) => {
    const result = await db
      .select({
        slide: topicSlides,
        topic: topics,
        stage: curriculumStages,
      })
      .from(topicSlides)
      .innerJoin(topics, eq(topicSlides.topicId, topics.id))
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
      .where(eq(topicSlides.id, slideId))
      .limit(1);

    if (result.length === 0) return null;

    return {
      slide: result[0].slide,
      topic: result[0].topic,
      stage: result[0].stage,
    };
  },
};
