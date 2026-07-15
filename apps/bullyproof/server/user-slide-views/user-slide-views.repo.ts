import { db } from "@/server/db/drizzle";
import { userSlideViews } from "@/server/db/schema";
import { eq, asc, sql, and, count } from "drizzle-orm";

export const userSlideViewsRepo = {
  getByUserAndTopic: (userId: string, topicId: string) =>
    db
      .select()
      .from(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.topicId, topicId)
        )
      )
      .orderBy(asc(userSlideViews.lastViewedAt)),

  getByUserAndSlide: (userId: string, slideId: string) =>
    db
      .select()
      .from(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.slideId, slideId)
        )
      )
      .limit(1),

  markSlideViewed: async (data: {
    userId: string;
    slideId: string;
    topicId: string;
    courseId: string;
  }) => {
    const existing = await db
      .select()
      .from(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, data.userId),
          eq(userSlideViews.slideId, data.slideId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing view
      return db
        .update(userSlideViews)
        .set({
          lastViewedAt: sql`now()`,
          viewCount: sql`view_count + 1`,
        })
        .where(eq(userSlideViews.id, existing[0].id))
        .returning();
    } else {
      // Create new view
      return db.insert(userSlideViews).values({
        userId: data.userId,
        slideId: data.slideId,
        topicId: data.topicId,
        courseId: data.courseId,
        firstViewedAt: sql`now()`,
        lastViewedAt: sql`now()`,
        viewCount: 1,
        totalTimeSeconds: 0,
      }).returning();
    }
  },

  updateTotalTime: async (userId: string, slideId: string, totalSeconds: number) => {
    return db
      .update(userSlideViews)
      .set({
        totalTimeSeconds: totalSeconds,
      })
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.slideId, slideId)
        )
      )
      .returning();
  },

  getViewedSlidesCount: async (userId: string, topicId: string) => {
    const result = await db
      .select({ count: count() })
      .from(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.topicId, topicId)
        )
      );
    return result[0]?.count ?? 0;
  },

  getAllSlidesViewed: async (userId: string, topicId: string) => {
    const views = await db
      .select()
      .from(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.topicId, topicId)
        )
      );
    return views.map((v) => v.slideId);
  },

  deleteByUserAndTopic: async (userId: string, topicId: string) => {
    return db
      .delete(userSlideViews)
      .where(
        and(
          eq(userSlideViews.userId, userId),
          eq(userSlideViews.topicId, topicId)
        )
      )
      .returning();
  },
};
