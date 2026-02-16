import { db } from "@/server/db/drizzle";
import {
  courseTopicSlides,
  courseTopics,
  certificationCourses,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { computePositionsForOrder } from "@/server/lib/fractional-position";

export const certificationSlidesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId))
      .orderBy(courseTopicSlides.position),

  getById: (id: string) =>
    db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.id, id))
      .limit(1),

  createSlide: (data: {
    topicId: string;
    position: string;
    kind: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
    videoStartS?: number | null;
    videoEndS?: number | null;
    quizData?: unknown;
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
      position?: string;
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
      .orderBy(courseTopicSlides.position);

    if (allSlides.length === 0) {
      return 0;
    }

    const positions = computePositionsForOrder(allSlides.map((s) => s.id));
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({
          position: positions[i],
          updatedAt: sql`now()`,
        })
        .where(eq(courseTopicSlides.id, allSlides[i].id));
    }

    return allSlides.length;
  },

  reorderSlides: async (topicId: string, slideIds: string[]) => {
    if (slideIds.length === 0) {
      return;
    }

    const allSlides = await db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId));

    const slidesNotInArray = allSlides.filter(
      (slide) => !slideIds.includes(slide.id)
    );
    const allSlideIds = [...slideIds, ...slidesNotInArray.map((s) => s.id)];

    const positions = computePositionsForOrder(allSlideIds);
    for (let i = 0; i < allSlideIds.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({
          position: positions[i],
          updatedAt: sql`now()`,
        })
        .where(eq(courseTopicSlides.id, allSlideIds[i]));
    }
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
      stage: result[0].course,
    };
  },
};
