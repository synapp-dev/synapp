import { db } from "@/server/db/drizzle";
import {
  topics,
  curriculumStages,
  topicSlides,
  vTopicsWithCompletion,
} from "@/server/db/schema";
import { eq, and, inArray, desc, asc, ilike, sql } from "drizzle-orm";
import {
  computePositionsForOrder,
  generatePositionBetween,
} from "@/server/lib/fractional-position";
import { topicSlidesRepo } from "@/server/topic-slides/topic-slides.repo";

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
      .orderBy(asc(topicSlides.topicId), asc(topicSlides.position));

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
      .orderBy(topicSlides.position);

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

  // Renumber stage_order for all topics in a stage to be sequential (1, 2, 3...).
  // Call after deleting a topic to fill gaps and prevent skipped numbers.
  normalizeStageOrder: async (stageId: string) => {
    const allTopics = await db
      .select()
      .from(topics)
      .where(eq(topics.stageId, stageId))
      .orderBy(asc(topics.stageOrder), asc(topics.createdAt));

    if (allTopics.length === 0) {
      return 0;
    }

    // Phase 1: Move all to temp indices to avoid conflicts
    const tempOffset = 30000;
    for (let i = 0; i < allTopics.length; i++) {
      await db
        .update(topics)
        .set({ stageOrder: tempOffset + i })
        .where(eq(topics.id, allTopics[i].id));
    }

    // Phase 2: Assign sequential 1-based stage_order
    for (let i = 0; i < allTopics.length; i++) {
      await db
        .update(topics)
        .set({ stageOrder: i + 1 })
        .where(eq(topics.id, allTopics[i].id));
    }

    return allTopics.length;
  },

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
    position: string;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
    videoStartS?: number | null;
    videoEndS?: number | null;
  }) => db.insert(topicSlides).values(data).returning(),

  /**
   * Create a slide at a specific position using fractional indexing.
   * If afterSlideId is provided, inserts after that slide. Otherwise appends at end.
   */
  createSlideWithPosition: async (
    topicId: string,
    data: {
      kind: string;
      afterSlideId?: string | null;
      position?: string | null;
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
    }
  ) => {
    const existingSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(topicSlides.position);

    let newPosition: string;
    if (data.position && data.position.trim() !== "") {
      newPosition = data.position;
    } else if (data.afterSlideId) {
      const idx = existingSlides.findIndex((s) => s.id === data.afterSlideId);
      const afterPosition = idx >= 0 ? existingSlides[idx].position : null;
      const beforePosition =
        idx >= 0 && idx < existingSlides.length - 1
          ? existingSlides[idx + 1].position
          : null;
      newPosition = generatePositionBetween(afterPosition, beforePosition);
    } else {
      const lastPosition =
        existingSlides.length > 0
          ? existingSlides[existingSlides.length - 1].position
          : null;
      newPosition = generatePositionBetween(lastPosition, null);
    }

    const textHtml =
      data.kind === "text" ? (data.textHtml ?? "") : null;
    const imageUrl =
      data.kind === "image" ? (data.imageUrl ?? null) : null;
    const videoUrl =
      data.kind === "video" ? (data.videoUrl ?? null) : null;

    const [inserted] = await db
      .insert(topicSlides)
      .values({
        topicId,
        position: newPosition,
        kind: data.kind,
        imageUrl: data.kind === "image" ? imageUrl : null,
        videoUrl: data.kind === "video" ? videoUrl : null,
        textHtml: data.kind === "text" ? textHtml : null,
        videoStartS: data.videoStartS ?? null,
        videoEndS: data.videoEndS ?? null,
      })
      .returning();

    if (!inserted) throw new Error("Failed to create slide");
    return inserted;
  },

  updateSlide: (
    id: string,
    data: {
      kind?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
      position?: string;
    }
  ) => {
    // Invalidate cached signed URL when media changes
    const setData: Record<string, any> = {
      ...data,
      updatedAt: sql`now()`,
    };
    if ("imageUrl" in data || "videoUrl" in data) {
      setData.signedUrl = null;
      setData.signedUrlUpdatedAt = null;
    }
    return db
      .update(topicSlides)
      .set(setData)
      .where(eq(topicSlides.id, id))
      .returning();
  },

  deleteSlide: (id: string) =>
    db.delete(topicSlides).where(eq(topicSlides.id, id)),

  normalizeSlideOrder: async (topicId: string) => {
    return topicSlidesRepo.normalizeSlideOrder(topicId);
  },

  reorderSlides: async (topicId: string, slideIds: string[]) => {
    if (slideIds.length === 0) return;
    const positions = computePositionsForOrder(slideIds);
    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(topicSlides)
        .set({ position: positions[i], updatedAt: sql`now()` })
        .where(eq(topicSlides.id, slideIds[i]));
    }
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
