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
      .update(courseTopicSlides)
      .set(setData)
      .where(eq(courseTopicSlides.id, id))
      .returning();
  },

  deleteSlide: (id: string) =>
    db.delete(courseTopicSlides).where(eq(courseTopicSlides.id, id)),

  updateSignedUrl: async (id: string, signedUrl: string) => {
    await db
      .update(courseTopicSlides)
      .set({
        signedUrl,
        signedUrlUpdatedAt: new Date().toISOString(),
      })
      .where(eq(courseTopicSlides.id, id));
  },

  clearSignedUrl: async (id: string) => {
    await db
      .update(courseTopicSlides)
      .set({
        signedUrl: null,
        signedUrlUpdatedAt: null,
      })
      .where(eq(courseTopicSlides.id, id));
  },

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
    if (slideIds.length === 0) {
      return { success: true };
    }

    // Get all slides for this topic to calculate a safe temporary offset
    const allSlides = await db
      .select()
      .from(courseTopicSlides)
      .where(eq(courseTopicSlides.topicId, topicId));

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
        .update(courseTopicSlides)
        .set({ orderIndex: tempOffset + i })
        .where(eq(courseTopicSlides.id, slideIds[i]));
    }

    // Phase 2: Assign final order indices (0, 1, 2, ...)
    // Now that all slides are at temp indices, we can safely assign sequential values
    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(courseTopicSlides)
        .set({ orderIndex: i })
        .where(eq(courseTopicSlides.id, slideIds[i]));
    }

    return { success: true };
  },
};
