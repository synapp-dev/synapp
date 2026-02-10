import { db } from "@/server/db/drizzle";
import { topicLessonPlans } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export const topicLessonPlansRepo = {
  listByTopicId: (topicId: string) =>
    db
      .select()
      .from(topicLessonPlans)
      .where(eq(topicLessonPlans.topicId, topicId))
      .orderBy(asc(topicLessonPlans.createdAt)),

  getById: async (id: string) => {
    const rows = await db
      .select()
      .from(topicLessonPlans)
      .where(eq(topicLessonPlans.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  create: (data: {
    topicId: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    uploadedBy?: string | null;
  }) =>
    db.insert(topicLessonPlans).values(data).returning(),

  update: (id: string, data: { fileUrl?: string }) =>
    db
      .update(topicLessonPlans)
      .set(data)
      .where(eq(topicLessonPlans.id, id))
      .returning(),

  deleteById: (id: string) =>
    db.delete(topicLessonPlans).where(eq(topicLessonPlans.id, id)),
};
