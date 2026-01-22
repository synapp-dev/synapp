import { db } from "@/server/db/drizzle";
import { courseTopics, courseRatings } from "@/server/db/schema";
import { eq, and, max, sql } from "drizzle-orm";
import { courseRatingsRepo } from "./course-ratings.repo";

/**
 * Check if a topic is the last topic in its course
 * @param topicId The topic ID to check
 * @param courseId The course ID (optional, will be fetched if not provided)
 * @returns true if the topic is the last one in the course
 */
export async function isLastTopicInCourse(
  topicId: string,
  courseId?: string
): Promise<boolean> {
  // If courseId not provided, fetch it from the topic
  let finalCourseId = courseId;
  if (!finalCourseId) {
    const topic = await db
      .select({ courseId: courseTopics.courseId, courseOrder: courseTopics.courseOrder })
      .from(courseTopics)
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    if (topic.length === 0) {
      return false;
    }
    finalCourseId = topic[0].courseId;
  }

  // Get the current topic's order
  const currentTopic = await db
    .select({ courseOrder: courseTopics.courseOrder })
    .from(courseTopics)
    .where(eq(courseTopics.id, topicId))
    .limit(1);

  if (currentTopic.length === 0) {
    return false;
  }

  const currentOrder = currentTopic[0].courseOrder;

  // Get the maximum course_order for this course
  const maxOrderResult = await db
    .select({ maxOrder: max(courseTopics.courseOrder) })
    .from(courseTopics)
    .where(eq(courseTopics.courseId, finalCourseId));

  const maxOrder = maxOrderResult[0]?.maxOrder ?? 0;

  // Topic is last if its order equals the maximum order
  return currentOrder === maxOrder;
}

/**
 * Determine if the rating modal should be shown
 * Checks: Is last topic? Is topic completed? Has user already rated?
 * @param userId The user ID
 * @param courseId The course ID
 * @param topicId The topic ID
 * @returns true if the rating modal should be shown
 */
export async function shouldShowRatingModal(
  userId: string,
  courseId: string,
  topicId: string
): Promise<boolean> {
  // Check if this is the last topic
  const isLast = await isLastTopicInCourse(topicId, courseId);
  if (!isLast) {
    return false;
  }

  // Check if user has already rated this course
  const existingRating = await courseRatingsRepo.getByUserAndCourse(
    userId,
    courseId
  );
  if (existingRating.length > 0) {
    return false;
  }

  return true;
}
