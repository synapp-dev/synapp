import { db } from "@/server/db/drizzle";
import { slideViewingSessions } from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const slideViewingSessionsRepo = {
  startSession: (data: {
    userId: string;
    slideId: string;
    topicId: string;
    courseId: string;
  }) =>
    db.insert(slideViewingSessions).values({
      userId: data.userId,
      slideId: data.slideId,
      topicId: data.topicId,
      courseId: data.courseId,
      sessionStartedAt: sql`now()`,
      lastActivityAt: sql`now()`,
      isCompleted: false,
      interactionCount: 0,
    }).returning(),

  getActiveSession: (userId: string, slideId: string) =>
    db
      .select()
      .from(slideViewingSessions)
      .where(
        and(
          eq(slideViewingSessions.userId, userId),
          eq(slideViewingSessions.slideId, slideId),
          sql`session_ended_at IS NULL`
        )
      )
      .orderBy(desc(slideViewingSessions.sessionStartedAt))
      .limit(1),

  updateActivity: (sessionId: string) =>
    db
      .update(slideViewingSessions)
      .set({
        lastActivityAt: sql`now()`,
        interactionCount: sql`interaction_count + 1`,
      })
      .where(eq(slideViewingSessions.id, sessionId))
      .returning(),

  pauseSession: (sessionId: string) =>
    db
      .update(slideViewingSessions)
      .set({
        lastActivityAt: sql`now()`,
      })
      .where(eq(slideViewingSessions.id, sessionId))
      .returning(),

  resumeSession: (sessionId: string) =>
    db
      .update(slideViewingSessions)
      .set({
        lastActivityAt: sql`now()`,
      })
      .where(eq(slideViewingSessions.id, sessionId))
      .returning(),

  endSession: async (sessionId: string) => {
    const session = await db
      .select()
      .from(slideViewingSessions)
      .where(eq(slideViewingSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      throw new Error("Session not found");
    }

    const startedAt = new Date(session[0].sessionStartedAt);
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    return db
      .update(slideViewingSessions)
      .set({
        sessionEndedAt: sql`now()`,
        durationSeconds: durationSeconds,
      })
      .where(eq(slideViewingSessions.id, sessionId))
      .returning();
  },

  getSessionsForSlide: (userId: string, slideId: string) =>
    db
      .select()
      .from(slideViewingSessions)
      .where(
        and(
          eq(slideViewingSessions.userId, userId),
          eq(slideViewingSessions.slideId, slideId)
        )
      )
      .orderBy(desc(slideViewingSessions.sessionStartedAt)),

  getTotalTimeForSlide: async (userId: string, slideId: string) => {
    const sessions = await db
      .select({
        durationSeconds: slideViewingSessions.durationSeconds,
      })
      .from(slideViewingSessions)
      .where(
        and(
          eq(slideViewingSessions.userId, userId),
          eq(slideViewingSessions.slideId, slideId),
          sql`session_ended_at IS NOT NULL`
        )
      );

    return sessions.reduce((total, s) => total + (s.durationSeconds ?? 0), 0);
  },
};
