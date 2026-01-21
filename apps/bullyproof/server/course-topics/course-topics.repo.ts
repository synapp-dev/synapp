import { db } from "@/server/db/drizzle";
import { courseTopics, certificationCourses } from "@/server/db/schema";
import { eq, asc, desc, sql, and } from "drizzle-orm";
import { createSlug } from "@/utils/slug";

// Helper function to find a unique slug within a course
async function findUniqueSlug(courseId: string, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(courseTopics)
      .where(and(eq(courseTopics.courseId, courseId), eq(courseTopics.slug, slug)))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export const courseTopicsRepo = {
  getByCourseId: (courseId: string) =>
    db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId))
      .orderBy(asc(courseTopics.courseOrder), asc(courseTopics.title)),

  getByCourseCode: async (courseCode: string) => {
    // First get the course by code
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, courseCode))
      .limit(1);

    if (course.length === 0) return [];

    // Then get topics for that course
    return db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, course[0].id))
      .orderBy(asc(courseTopics.courseOrder), asc(courseTopics.title));
  },

  getBySlug: async (courseCode: string, slug: string) => {
    // First get the course by code
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, courseCode))
      .limit(1);

    if (course.length === 0) return [];

    // Then get topic by slug for that course
    return db
      .select()
      .from(courseTopics)
      .where(and(eq(courseTopics.courseId, course[0].id), eq(courseTopics.slug, slug)))
      .limit(1);
  },

  getById: (id: string) =>
    db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, id))
      .limit(1),

  create: async (data: {
    courseId: string;
    title: string;
    slug?: string | null;
    officialNotes?: string | null;
    courseOrder?: number | null;
    isSequential?: boolean;
    quizCompletionPercentage?: number;
  }) => {
    // If courseOrder is not provided, automatically assign the next available order
    if (data.courseOrder === null || data.courseOrder === undefined) {
      const existingTopics = await db
        .select()
        .from(courseTopics)
        .where(eq(courseTopics.courseId, data.courseId))
        .orderBy(desc(courseTopics.courseOrder));

      const maxOrder =
        existingTopics.length > 0 && existingTopics[0].courseOrder !== null
          ? existingTopics[0].courseOrder!
          : 0;

      data.courseOrder = maxOrder + 1;
    }

    // Generate slug from title if not provided
    let slug = data.slug;
    if (!slug) {
      const baseSlug = createSlug(data.title);
      slug = await findUniqueSlug(data.courseId, baseSlug);
    } else {
      // Ensure provided slug is unique
      slug = await findUniqueSlug(data.courseId, slug);
    }

    return db
      .insert(courseTopics)
      .values({
        courseId: data.courseId,
        title: data.title,
        slug: slug,
        officialNotes: data.officialNotes ?? null,
        courseOrder: data.courseOrder,
        isSequential: data.isSequential ?? true,
        quizCompletionPercentage: data.quizCompletionPercentage ?? 100,
      })
      .returning();
  },

  update: async (
    id: string,
    data: {
      title?: string;
      slug?: string | null;
      officialNotes?: string | null;
      status?: string;
      courseOrder?: number | null;
      isSequential?: boolean;
      quizCompletionPercentage?: number;
    }
  ) => {
    // Get the current topic to check courseId
    const currentTopic = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, id))
      .limit(1);

    if (currentTopic.length === 0) {
      throw new Error("Topic not found");
    }

    const courseId = currentTopic[0].courseId;
    let finalSlug = data.slug;

    // If title changed and slug not explicitly provided, regenerate slug
    if (data.title && data.slug === undefined) {
      const baseSlug = createSlug(data.title);
      finalSlug = await findUniqueSlug(courseId, baseSlug);
    } else if (finalSlug) {
      // If slug is explicitly provided, ensure it's unique (excluding current topic)
      const baseSlug = finalSlug;
      let counter = 1;
      let testSlug = baseSlug;

      while (true) {
        const existing = await db
          .select()
          .from(courseTopics)
          .where(
            and(
              eq(courseTopics.courseId, courseId),
              eq(courseTopics.slug, testSlug)
            )
          )
          .limit(1);

        if (existing.length === 0 || existing[0].id === id) {
          finalSlug = testSlug;
          break;
        }

        testSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updateData: any = { ...data };
    if (finalSlug !== undefined) {
      updateData.slug = finalSlug;
    }

    return db
      .update(courseTopics)
      .set({
        ...updateData,
        updatedAt: sql`now()`,
      })
      .where(eq(courseTopics.id, id))
      .returning();
  },

  delete: (id: string) =>
    db.delete(courseTopics).where(eq(courseTopics.id, id)),

  reorder: async (courseId: string, topicIds: string[]) => {
    // First, move all topics to temporary high indices to avoid conflicts
    // Using 30000 as tempOffset to stay within smallint range (max 32767)
    const tempOffset = 30000;
    const allTopics = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId));

    // Phase 1: Move all topics to temporary indices
    for (let i = 0; i < allTopics.length; i++) {
      await db
        .update(courseTopics)
        .set({
          courseOrder: tempOffset + i,
        })
        .where(eq(courseTopics.id, allTopics[i].id));
    }

    // Phase 2: Assign new courseOrder values based on topicIds array (1-indexed)
    for (let i = 0; i < topicIds.length; i++) {
      await db
        .update(courseTopics)
        .set({
          courseOrder: i + 1, // courseOrder is 1-indexed
        })
        .where(eq(courseTopics.id, topicIds[i]));
    }

    // Phase 3: Handle any topics not in the topicIds array (shouldn't happen, but handle gracefully)
    const remainingTopics = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId));

    const topicsNotInArray = remainingTopics.filter(
      (topic) => !topicIds.includes(topic.id)
    );

    // Assign sequential courseOrder to remaining topics (append to end)
    for (let i = 0; i < topicsNotInArray.length; i++) {
      await db
        .update(courseTopics)
        .set({
          courseOrder: topicIds.length + i + 1,
        })
        .where(eq(courseTopics.id, topicsNotInArray[i].id));
    }

    return { success: true };
  },
};
