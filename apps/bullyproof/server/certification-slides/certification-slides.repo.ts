import { db } from "@/server/db/drizzle";
import {
  certificationSlides,
  certificationTopics,
  certificationStages,
} from "@/server/db/schema";
import { eq, asc, sql, SQL, and, inArray } from "drizzle-orm";

export const certificationSlidesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId))
      .orderBy(asc(certificationSlides.orderIndex)),

  getById: (id: string) =>
    db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.id, id))
      .limit(1),

  createSlide: (data: {
    topicId: string;
    orderIndex: number;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
    videoStartS?: number | null;
    videoEndS?: number | null;
    quizData?: any | null;
  }) => db.insert(certificationSlides).values(data).returning(),

  updateSlide: (
    id: string,
    data: {
      kind?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
      quizData?: any | null;
      orderIndex?: number;
    }
  ) =>
    db
      .update(certificationSlides)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(certificationSlides.id, id))
      .returning(),

  deleteSlide: (id: string) =>
    db.delete(certificationSlides).where(eq(certificationSlides.id, id)),

  normalizeSlideOrder: async (topicId: string) => {
    const allSlides = await db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId))
      .orderBy(asc(certificationSlides.orderIndex));

    if (allSlides.length === 0) {
      return 0;
    }

    const tempOffset = 100000;
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(certificationSlides)
        .set({
          orderIndex: tempOffset + i,
          updatedAt: sql`now()`,
        })
        .where(eq(certificationSlides.id, allSlides[i].id));
    }

    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(certificationSlides)
        .set({
          orderIndex: i,
          updatedAt: sql`now()`,
        })
        .where(eq(certificationSlides.id, allSlides[i].id));
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
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId));

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
        sql`WHEN ${certificationSlides.id} = ${allSlideIds[i]} THEN ${tempOffset + i}`
      );
    }

    tempSqlChunks.push(sql`ELSE ${certificationSlides.orderIndex} END)`);
    const tempOrderIndexCase = sql.join(tempSqlChunks, sql.raw(" "));

    await db
      .update(certificationSlides)
      .set({
        orderIndex: tempOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(certificationSlides.topicId, topicId),
          inArray(certificationSlides.id, allSlideIds)
        )
      );

    // Phase 2: Assign final orderIndex values based on slideIds array (0-indexed)
    const finalSqlChunks: SQL[] = [sql`(CASE`];

    for (let i = 0; i < slideIds.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${certificationSlides.id} = ${slideIds[i]} THEN ${i}`
      );
    }

    // Assign remaining slides (not in slideIds array) to positions after slideIds
    for (let i = 0; i < slidesNotInArray.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${certificationSlides.id} = ${slidesNotInArray[i].id} THEN ${slideIds.length + i}`
      );
    }

    finalSqlChunks.push(sql`ELSE ${certificationSlides.orderIndex} END)`);
    const finalOrderIndexCase = sql.join(finalSqlChunks, sql.raw(" "));

    await db
      .update(certificationSlides)
      .set({
        orderIndex: finalOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(certificationSlides.topicId, topicId),
          inArray(certificationSlides.id, allSlideIds)
        )
      );
  },

  getSlideWithTopicAndStage: async (slideId: string) => {
    const result = await db
      .select({
        slide: certificationSlides,
        topic: certificationTopics,
        stage: certificationStages,
      })
      .from(certificationSlides)
      .innerJoin(
        certificationTopics,
        eq(certificationSlides.topicId, certificationTopics.id)
      )
      .innerJoin(
        certificationStages,
        eq(certificationTopics.stageId, certificationStages.id)
      )
      .where(eq(certificationSlides.id, slideId))
      .limit(1);

    if (result.length === 0) return null;

    return {
      slide: result[0].slide,
      topic: result[0].topic,
      stage: result[0].stage,
    };
  },
};
