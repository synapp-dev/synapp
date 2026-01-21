import { db } from "@/server/db/drizzle";
import { topicSlides, courseTopics } from "@/server/db/schema";
import { eq, asc, sql, and, inArray } from "drizzle-orm";

export const topicSlidesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(asc(topicSlides.orderIndex)),

  getById: (id: string) =>
    db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.id, id))
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
  }) => db.insert(topicSlides).values(data).returning(),

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
      .update(topicSlides)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(topicSlides.id, id))
      .returning(),

  deleteSlide: (id: string) =>
    db.delete(topicSlides).where(eq(topicSlides.id, id)),

  normalizeSlideOrder: async (topicId: string) => {
    const allSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(asc(topicSlides.orderIndex));

    if (allSlides.length === 0) {
      return 0;
    }

    // Calculate tempOffset based on current max orderIndex to avoid conflicts
    const maxOrderIndex = Math.max(...allSlides.map((s) => s.orderIndex));
    // Use an offset that's higher than any existing orderIndex
    const tempOffset = Math.max(100000, maxOrderIndex + 100000);
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(topicSlides)
        .set({
          orderIndex: tempOffset + i,
        })
        .where(eq(topicSlides.id, allSlides[i].id));
    }

    // Now normalize to 0-based sequential order
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(topicSlides)
        .set({
          orderIndex: i,
        })
        .where(eq(topicSlides.id, allSlides[i].id));
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
        .update(topicSlides)
        .set({ orderIndex: update.orderIndex })
        .where(eq(topicSlides.id, update.id));
    }

    return { success: true };
  },
};
