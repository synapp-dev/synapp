import { db } from "@/server/db/drizzle";
import { courseProgress, courseTopics, courseTopicProgress } from "@/server/db/schema";
import { eq, and, count, sql, inArray } from "drizzle-orm";

export const courseProgressRepo = {
  getByUserAndCourse: (userId: string, courseId: string) =>
    db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.userId, userId),
          eq(courseProgress.courseId, courseId)
        )
      )
      .limit(1),

  getOrCreate: async (userId: string, courseId: string) => {
    const existing = await db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.userId, userId),
          eq(courseProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Get total topics count
    const topicsResult = await db
      .select({ count: count() })
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId));

    const totalTopics = topicsResult[0]?.count ?? 0;

    // Get first topic
    const firstTopic = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId))
      .orderBy(courseTopics.courseOrder)
      .limit(1);

    const result = await db
      .insert(courseProgress)
      .values({
        userId,
        courseId,
        totalTopics,
        currentTopicId: firstTopic[0]?.id ?? null,
        currentTopicOrder: firstTopic[0]?.courseOrder ?? null,
        lastCompletedTopicOrder: 0,
        completedTopics: 0,
        progressPercentage: 0,
        status: "not_started",
      })
      .returning();

    return result[0];
  },

  updateProgress: async (userId: string, courseId: string) => {
    // Get all completed topics
    const completedTopicsResult = await db
      .select({ topicId: courseTopicProgress.topicId })
      .from(courseTopicProgress)
      .where(
        and(
          eq(courseTopicProgress.userId, userId),
          eq(courseTopicProgress.courseId, courseId),
          eq(courseTopicProgress.status, "completed")
        )
      );

    const completedTopicIds = completedTopicsResult.map((r) => r.topicId);

    // Get completed topic orders
    // Handle empty array case
    const completedTopics = completedTopicIds.length > 0
      ? await db
          .select({ courseOrder: courseTopics.courseOrder })
          .from(courseTopics)
          .where(
            and(
              eq(courseTopics.courseId, courseId),
              inArray(courseTopics.id, completedTopicIds)
            )
          )
      : [];

    const maxCompletedOrder =
      completedTopics.length > 0
        ? Math.max(...completedTopics.map((t) => t.courseOrder))
        : 0;

    // Get total topics
    const totalTopicsResult = await db
      .select({ count: count() })
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId));

    const totalTopics = totalTopicsResult[0]?.count ?? 0;
    const completedTopicsCount = completedTopicIds.length;
    const progressPercentage =
      totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;

    // Get next topic to unlock
    const nextTopic = await db
      .select()
      .from(courseTopics)
      .where(
        and(
          eq(courseTopics.courseId, courseId),
          sql`course_order > ${maxCompletedOrder}`,
          sql`(is_sequential = false OR course_order = ${maxCompletedOrder + 1})`
        )
      )
      .orderBy(courseTopics.courseOrder)
      .limit(1);

    const status =
      completedTopicsCount === totalTopics && totalTopics > 0
        ? "completed"
        : completedTopicsCount > 0
        ? "in_progress"
        : "not_started";

    return db
      .update(courseProgress)
      .set({
        currentTopicId: nextTopic[0]?.id ?? null,
        currentTopicOrder: nextTopic[0]?.courseOrder ?? null,
        lastCompletedTopicOrder: maxCompletedOrder,
        completedTopics: completedTopicsCount,
        progressPercentage,
        status,
        completedAt:
          status === "completed" ? sql`now()` : undefined,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(courseProgress.userId, userId),
          eq(courseProgress.courseId, courseId)
        )
      )
      .returning();
  },

  markCertificateIssued: (userId: string, courseId: string) =>
    db
      .update(courseProgress)
      .set({
        certificateIssuedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(courseProgress.userId, userId),
          eq(courseProgress.courseId, courseId)
        )
      )
      .returning(),
};
