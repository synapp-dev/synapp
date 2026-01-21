import { db } from "@/server/db/drizzle";
import { certificationCourses, courseTopics } from "@/server/db/schema";
import { eq, asc, sql, desc, count } from "drizzle-orm";
import { createSlug } from "@/utils/slug";

export const certificationCoursesRepo = {
  getCourses: () =>
    db
      .select()
      .from(certificationCourses)
      .orderBy(asc(certificationCourses.sortIndex)),

  getCourseById: (id: string) =>
    db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, id))
      .limit(1),

  getCourseByCode: (code: string) =>
    db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, code))
      .limit(1),

  getCourseBySlug: async (slug: string) => {
    // Get all courses and find the one matching the slug
    const allCourses = await db
      .select()
      .from(certificationCourses)
      .orderBy(asc(certificationCourses.sortIndex));
    
    // Find course where slug matches the generated slug from name
    const matchingCourse = allCourses.find(
      (course) => createSlug(course.name) === slug
    );
    
    if (!matchingCourse) return [];
    
    return [matchingCourse];
  },

  getCourseBySlugWithTopics: async (slug: string) => {
    const courses = await certificationCoursesRepo.getCourseBySlug(slug);
    
    if (courses.length === 0) return null;
    
    const course = courses[0];
    const topicCountResult = await db
      .select({ count: count() })
      .from(courseTopics)
      .where(eq(courseTopics.courseId, course.id));
    
    const topicCount = topicCountResult[0]?.count ?? 0;
    
    return {
      ...course,
      topicCount,
    };
  },

  getCourseWithTopics: async (courseId: string) => {
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, courseId))
      .limit(1);

    if (course.length === 0) return null;

    const topicCountResult = await db
      .select({ count: count() })
      .from(courseTopics)
      .where(eq(courseTopics.courseId, courseId));

    const topicCount = topicCountResult[0]?.count ?? 0;

    return {
      ...course[0],
      topicCount,
    };
  },

  getCourseByCodeWithTopics: async (code: string) => {
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, code))
      .limit(1);

    if (course.length === 0) return null;

    const topicCountResult = await db
      .select({ count: count() })
      .from(courseTopics)
      .where(eq(courseTopics.courseId, course[0].id));

    const topicCount = topicCountResult[0]?.count ?? 0;

    return {
      ...course[0],
      topicCount,
    };
  },

  getMaxSortIndex: async () => {
    const existingCourses = await db
      .select({ sortIndex: certificationCourses.sortIndex })
      .from(certificationCourses)
      .orderBy(desc(certificationCourses.sortIndex))
      .limit(1);

    return existingCourses.length > 0 ? existingCourses[0].sortIndex : -1;
  },

  createCourse: async (data: {
    code: string;
    name: string;
    sortIndex?: number;
    certificateType?: "none" | "completion" | "achievement" | "custom" | null;
  }) => {
    // If sortIndex not provided, calculate next available
    let finalSortIndex = data.sortIndex;
    if (finalSortIndex === undefined || finalSortIndex === null) {
      const maxSortIndex = await certificationCoursesRepo.getMaxSortIndex();
      finalSortIndex = Math.min(maxSortIndex + 1, 32766); // Cap at max smallint - 1
    }

    const [course] = await db
      .insert(certificationCourses)
      .values({
        code: data.code,
        name: data.name,
        sortIndex: finalSortIndex,
        certificateType: data.certificateType ?? null,
      })
      .returning();

    return course;
  },

  updateCourse: async (
    courseId: string,
    data: {
      name?: string;
      sortIndex?: number;
      certificateType?: "none" | "completion" | "achievement" | "custom" | null;
    }
  ) => {
    // Check if course exists
    const existingCourse = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, courseId))
      .limit(1);

    if (existingCourse.length === 0) {
      throw new Error("Course not found");
    }

    const updateData: {
      name?: string;
      sortIndex?: number;
      certificateType?: string | null;
      updatedAt?: any;
    } = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.sortIndex !== undefined) {
      updateData.sortIndex = data.sortIndex;
    }
    if (data.certificateType !== undefined) {
      updateData.certificateType = data.certificateType;
    }
    updateData.updatedAt = sql`now()`;

    await db
      .update(certificationCourses)
      .set(updateData)
      .where(eq(certificationCourses.id, courseId));

    const [updatedCourse] = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, courseId))
      .limit(1);

    return updatedCourse;
  },

  deleteCourse: async (courseId: string) => {
    // Check if course exists
    const existingCourse = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, courseId))
      .limit(1);

    if (existingCourse.length === 0) {
      throw new Error("Course not found");
    }

    // Delete the course (cascade will handle related data deletion)
    await db
      .delete(certificationCourses)
      .where(eq(certificationCourses.id, courseId));

    return { success: true };
  },
};
