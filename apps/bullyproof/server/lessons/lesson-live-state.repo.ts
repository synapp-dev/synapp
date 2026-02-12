import { db } from "@/server/db/drizzle";
import { lessonLiveState, lessons, topicSlides, topics, lessonSlideNotes, teacherSlideNotes } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const lessonLiveStateRepo = {
  /**
   * Get the current live state for a lesson
   */
  getLiveState: async (lessonId: string) => {
    const result = await db
      .select()
      .from(lessonLiveState)
      .where(eq(lessonLiveState.lessonId, lessonId))
      .limit(1);
    
    return result[0] || null;
  },

  /**
   * Get all slides for a lesson with effective notes
   * Mimics the v_lesson_slides_effective view logic
   */
  getLessonSlides: async (lessonId: string) => {
    // Get lesson to get topic_id and created_by_user_id
    const lesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson[0]) {
      return [];
    }

    // Get all slides for the topic
    const slides = await db
      .select()
      .from(topicSlides)
      .where(eq(topicSlides.topicId, lesson[0].topicId))
      .orderBy(topicSlides.orderIndex);

    // Get lesson-specific notes
    const lessonNotes = await db
      .select()
      .from(lessonSlideNotes)
      .where(eq(lessonSlideNotes.lessonId, lessonId));

    // Get teacher-specific notes
    const teacherNotes = await db
      .select()
      .from(teacherSlideNotes)
      .where(eq(teacherSlideNotes.teacherUserId, lesson[0].createdByUserId || ""));

    // Get topic for official notes
    const topic = await db
      .select()
      .from(topics)
      .where(eq(topics.id, lesson[0].topicId))
      .limit(1);

    // Combine data with effective notes logic
    const lessonData = lesson[0];
    if (!lessonData) {
      return [];
    }

    return slides.map((slide) => {
      const lessonNote = lessonNotes.find(n => n.topicSlideId === slide.id);
      const teacherNote = teacherNotes.find(n => n.topicSlideId === slide.id);
      
      // Effective notes: lesson note > teacher note > slide official notes > topic official notes
      const effectiveNotes = 
        lessonNote?.notesRichtext ||
        teacherNote?.notesRichtext ||
        slide.officialNotes ||
        topic[0]?.officialNotes ||
        null;

      return {
        lessonId,
        topicId: lessonData.topicId,
        topicSlideId: slide.id,
        orderIndex: slide.orderIndex,
        kind: slide.kind,
        textHtml: slide.textHtml,
        imageUrl: slide.imageUrl,
        videoUrl: slide.videoUrl,
        videoStartS: slide.videoStartS,
        videoEndS: slide.videoEndS,
        effectiveNotes,
        teacherUserId: lessonData.createdByUserId,
        signedUrl: slide.signedUrl ?? null,
        signedImageUrl: slide.signedUrl ?? null,
        signedUrlUpdatedAt: slide.signedUrlUpdatedAt ?? null,
      };
    });
  },

  /**
   * Update or insert the live state for a lesson
   */
  updateLiveState: async (
    lessonId: string,
    userId: string,
    data: {
      currentSlideId?: string;
      currentIndex?: number;
      isPaused?: boolean;
    }
  ) => {
    // First, verify the lesson exists and get topic_id
    const lesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson[0]) {
      throw new Error("Lesson not found");
    }

    // If currentSlideId is provided, validate it belongs to the lesson's topic
    if (data.currentSlideId) {
      const slide = await db
        .select()
        .from(topicSlides)
        .where(
          and(
            eq(topicSlides.id, data.currentSlideId),
            eq(topicSlides.topicId, lesson[0].topicId)
          )
        )
        .limit(1);

      if (!slide[0]) {
        throw new Error("Slide does not belong to this lesson's topic");
      }
    }

    // Check if live state exists
    const existing = await db
      .select()
      .from(lessonLiveState)
      .where(eq(lessonLiveState.lessonId, lessonId))
      .limit(1);

    if (existing[0]) {
      // Update existing
      const updated = await db
        .update(lessonLiveState)
        .set({
          ...data,
          updatedBy: userId,
          updatedAt: sql`now()`,
        })
        .where(eq(lessonLiveState.lessonId, lessonId))
        .returning();

      return updated[0];
    } else {
      // Insert new - need currentSlideId and currentIndex
      if (!data.currentSlideId || data.currentIndex === undefined) {
        // Get first slide if not provided
        const slides = await db
          .select()
          .from(topicSlides)
          .where(eq(topicSlides.topicId, lesson[0].topicId))
          .orderBy(topicSlides.orderIndex)
          .limit(1);

        if (!slides[0]) {
          throw new Error("No slides found for this lesson's topic");
        }

        const inserted = await db
          .insert(lessonLiveState)
          .values({
            lessonId,
            currentSlideId: data.currentSlideId || slides[0].id,
            currentIndex: data.currentIndex ?? 0,
            isPaused: data.isPaused ?? false,
            updatedBy: userId,
          })
          .returning();

        return inserted[0];
      } else {
        const inserted = await db
          .insert(lessonLiveState)
          .values({
            lessonId,
            currentSlideId: data.currentSlideId,
            currentIndex: data.currentIndex,
            isPaused: data.isPaused ?? false,
            updatedBy: userId,
          })
          .returning();

        return inserted[0];
      }
    }
  },
};

