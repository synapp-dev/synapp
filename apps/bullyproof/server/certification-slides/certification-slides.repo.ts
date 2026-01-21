import { db } from "@/server/db/drizzle";
import {
  courseTopicSlides,
  courseTopics,
  certificationCourses,
} from "@/server/db/schema";
import { eq, asc, sql, SQL, and, inArray } from "drizzle-orm";

export const certificationSlidesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId))
      .orderBy(asc(courseTopicSlides.orderIndex)),

  getById: (id: string) =>
    db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.id, id))
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
  }) => db.insert(courseTopicSlides).values(data).returning(),

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
      .update(courseTopicSlides)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopicSlides.id, id))
      .returning(),

  deleteSlide: (id: string) =>
    db.delete(courseTopicSlides).where(eq(courseTopicSlides.id, id)),

  normalizeSlideOrder: async (topicId: string) => {
    const allSlides = await db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId))
      .orderBy(asc(courseTopicSlides.orderIndex));

    if (allSlides.length === 0) {
      return 0;
    }

    // Calculate tempOffset based on current max orderIndex to avoid conflicts
    const maxOrderIndex = Math.max(...allSlides.map((s) => s.orderIndex));
    // Use an offset that's higher than any existing orderIndex
    const tempOffset = Math.max(100000, maxOrderIndex + 100000);
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({
          orderIndex: tempOffset + i,
          updatedAt: sql`now()`,
        })
        .where(eq(courseTopicSlides.id, allSlides[i].id));
    }

    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({
          orderIndex: i,
          updatedAt: sql`now()`,
        })
        .where(eq(courseTopicSlides.id, allSlides[i].id));
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
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId));

    const slidesNotInArray = allSlides.filter(
      (slide) => !slideIds.includes(slide.id)
    );

    // Phase 1: Move all slides to temporary high indices to avoid conflicts
    // This ensures we don't have unique constraint violations when reassigning
    // Calculate tempOffset based on current max orderIndex to avoid conflicts with newly created slides
    const maxOrderIndex = allSlides.length > 0
      ? Math.max(...allSlides.map((s) => s.orderIndex))
      : -1;
    // Use an offset that's higher than any existing orderIndex
    // Add 1000000 to ensure we're well above any temporary values used during creation
    const tempOffset = Math.max(1000000, maxOrderIndex + 1000000);
    const tempSqlChunks: SQL[] = [sql`(CASE`];
    const allSlideIds = [...slideIds, ...slidesNotInArray.map((s) => s.id)];

    for (let i = 0; i < allSlideIds.length; i++) {
      tempSqlChunks.push(
        sql`WHEN ${courseTopicSlides.id} = ${allSlideIds[i]} THEN ${tempOffset + i}`
      );
    }

    tempSqlChunks.push(sql`ELSE ${courseTopicSlides.orderIndex} END)`);
    const tempOrderIndexCase = sql.join(tempSqlChunks, sql.raw(" "));

    await db
      .update(courseTopicSlides)
      .set({
        orderIndex: tempOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(courseTopicSlides.topicId, topicId),
          inArray(courseTopicSlides.id, allSlideIds)
        )
      );

    // Phase 2: Assign final orderIndex values based on slideIds array (0-indexed)
    const finalSqlChunks: SQL[] = [sql`(CASE`];

    for (let i = 0; i < slideIds.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${courseTopicSlides.id} = ${slideIds[i]} THEN ${i}`
      );
    }

    // Assign remaining slides (not in slideIds array) to positions after slideIds
    for (let i = 0; i < slidesNotInArray.length; i++) {
      finalSqlChunks.push(
        sql`WHEN ${courseTopicSlides.id} = ${slidesNotInArray[i].id} THEN ${slideIds.length + i}`
      );
    }

    finalSqlChunks.push(sql`ELSE ${courseTopicSlides.orderIndex} END)`);
    const finalOrderIndexCase = sql.join(finalSqlChunks, sql.raw(" "));

    await db
      .update(courseTopicSlides)
      .set({
        orderIndex: finalOrderIndexCase,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(courseTopicSlides.topicId, topicId),
          inArray(courseTopicSlides.id, allSlideIds)
        )
      );
  },

  getSlideWithTopicAndStage: async (slideId: string) => {
    const result = await db
      .select({
        slide: courseTopicSlides,
        topic: courseTopics,
        course: certificationCourses,
      })
      .from(courseTopicSlides)
      .innerJoin(
        courseTopics,
        eq(courseTopicSlides.topicId, courseTopics.id)
      )
      .innerJoin(
        certificationCourses,
        eq(courseTopics.courseId, certificationCourses.id)
      )
      .where(eq(courseTopicSlides.id, slideId))
      .limit(1);

    if (result.length === 0) return null;

    return {
      slide: result[0].slide,
      topic: result[0].topic,
      stage: result[0].course, // Keep as 'stage' for backward compatibility
    };
  },
};
