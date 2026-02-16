import { db } from "@/server/db/drizzle";
import { topicSlides } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { computePositionsForOrder } from "@/server/lib/fractional-position";

export const topicSlidesRepo = {
  getByTopicId: (topicId: string) =>
    db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(topicSlides.position),

  getById: (id: string) =>
    db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.id, id))
      .limit(1),

  createSlide: (data: {
    topicId: string;
    position: string;
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
      position?: string;
    }
  ) => {
    const setData: Record<string, unknown> = {
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

  updateSignedUrl: async (id: string, signedUrl: string) => {
    await db
      .update(topicSlides)
      .set({
        signedUrl,
        signedUrlUpdatedAt: new Date().toISOString(),
      })
      .where(eq(topicSlides.id, id));
  },

  clearSignedUrl: async (id: string) => {
    await db
      .update(topicSlides)
      .set({
        signedUrl: null,
        signedUrlUpdatedAt: null,
      })
      .where(eq(topicSlides.id, id));
  },

  normalizeSlideOrder: async (topicId: string) => {
    const allSlides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, topicId))
      .orderBy(topicSlides.position);

    if (allSlides.length === 0) {
      return 0;
    }

    const positions = computePositionsForOrder(allSlides.map((s) => s.id));
    for (let i = 0; i < allSlides.length; i++) {
      await db
        .update(topicSlides)
        .set({ position: positions[i] })
        .where(eq(topicSlides.id, allSlides[i].id));
    }

    return allSlides.length;
  },

  bulkUpdateOrder: async (topicId: string, slideIds: string[]) => {
    if (slideIds.length === 0) {
      return { success: true };
    }

    const positions = computePositionsForOrder(slideIds);
    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(topicSlides)
        .set({ position: positions[i] })
        .where(eq(topicSlides.id, slideIds[i]));
    }

    return { success: true };
  },
};
