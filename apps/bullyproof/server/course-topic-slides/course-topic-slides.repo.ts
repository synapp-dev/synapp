import { db } from "@/server/db/drizzle";
import { courseTopicSlides, courseTopics } from "@/server/db/schema";
import { eq, asc, sql, and, inArray } from "drizzle-orm";

export const courseTopicSlidesRepo = {
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
    kind: "image" | "video" | "text";
    imageUrl?: string | null;
    videoUrl?: string | null;
    textHtml?: string | null;
    videoStartS?: number | null;
    videoEndS?: number | null;
  }) => db.insert(courseTopicSlides).values(data).returning(),

  updateSlide: (
    id: string,
    data: {
      kind?: "image" | "video" | "text";
      imageUrl?: string | null;
      videoUrl?: string | null;
      textHtml?: string | null;
      videoStartS?: number | null;
      videoEndS?: number | null;
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
        })
        .where(eq(courseTopicSlides.id, allSlides[i].id));
    }

    // Now normalize to 0-based sequential order
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({
          orderIndex: i,
        })
        .where(eq(courseTopicSlides.id, allSlides[i].id));
    }

    return allSlides.length;
  },

  bulkUpdateOrder: async (topicId: string, slideIds: string[]) => {
    // Normalize order indices for the provided slide IDs
    const updates = slideIds.map((slideId, index) => ({
      id: slideId,
      orderIndex: index,
    }));

    // Perform updates
    for (const update of updates) {
      await db
        .update(courseTopicSlides)
        .set({ orderIndex: update.orderIndex })
        .where(eq(courseTopicSlides.id, update.id));
    }

    return { success: true };
  },
};
