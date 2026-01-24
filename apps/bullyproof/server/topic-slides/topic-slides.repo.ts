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
    if (slideIds.length === 0) {
      return { success: true };
    }

    // Get all slides for this topic to calculate a safe temporary offset
    const allSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId));

    // Calculate tempOffset based on current max orderIndex to avoid conflicts
    const maxOrderIndex =
      allSlides.length > 0
        ? Math.max(...allSlides.map((s) => s.orderIndex))
        : 0;
    // Use an offset that's higher than any existing orderIndex
    const tempOffset = Math.max(100000, maxOrderIndex + 100000);

    // Phase 1: Move all slides being reordered to temporary high indices
    // This prevents unique constraint violations when assigning final indices
    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(topicSlides)
        .set({ orderIndex: tempOffset + i })
        .where(eq(topicSlides.id, slideIds[i]));
    }

    // Phase 2: Assign final order indices (0, 1, 2, ...)
    // Now that all slides are at temp indices, we can safely assign sequential values
    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(topicSlides)
        .set({ orderIndex: i })
        .where(eq(topicSlides.id, slideIds[i]));
    }

    return { success: true };
  },
};
