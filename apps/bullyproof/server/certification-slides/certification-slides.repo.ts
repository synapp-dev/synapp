import { db } from "@/server/db/drizzle";
import {
  certificationSlides,
  certificationTopics,
  certificationStages,
} from "@/server/db/schema";
import { eq, asc, sql } from "drizzle-orm";

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

  reorderSlides: async (topicId: string, slideIds: string[]) => {
    const tempOffset = 100000;
    const allSlides = await db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId));

    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(certificationSlides)
        .set({
          orderIndex: tempOffset + i,
          updatedAt: sql`now()`,
        })
        .where(eq(certificationSlides.id, allSlides[i].id));
    }

    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(certificationSlides)
        .set({
          orderIndex: i,
          updatedAt: sql`now()`,
        })
        .where(eq(certificationSlides.id, slideIds[i]));
    }

    const remainingSlides = await db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId));

    const slidesNotInArray = remainingSlides.filter(
      (slide) => !slideIds.includes(slide.id)
    );

    for (let i = 0; i < slidesNotInArray.length; i++) {
      await db
        .update(certificationSlides)
        .set({
          orderIndex: slideIds.length + i,
          updatedAt: sql`now()`,
        })
        .where(eq(certificationSlides.id, slidesNotInArray[i].id));
    }

    const finalSlides = await db
      .select()
      .from(certificationSlides)
      .where(eq(certificationSlides.topicId, topicId))
      .orderBy(asc(certificationSlides.orderIndex));

    for (let i = 0; i < finalSlides.length; i++) {
      if (finalSlides[i].orderIndex !== i) {
        await db
          .update(certificationSlides)
          .set({
            orderIndex: i,
            updatedAt: sql`now()`,
          })
          .where(eq(certificationSlides.id, finalSlides[i].id));
      }
    }
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
