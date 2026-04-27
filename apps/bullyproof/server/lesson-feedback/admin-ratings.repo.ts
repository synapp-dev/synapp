import { db } from "@/server/db/drizzle";
import {
  classes,
  curriculumStages,
  lessonClasses,
  lessonFeedback,
  lessons,
  schools,
  topics,
  userProfile,
} from "@/server/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type AdminRatingsStageSummary = {
  stageId: string;
  stageSlug: string;
  stageCode: string;
  stageName: string;
  stageSortIndex: number;
  ratingCount: number;
  averageRating: number | null;
  latestRatingAt: string | null;
};

export type AdminStageLessonRatingRow = {
  feedbackId: string;
  lessonId: string;
  lessonStatus: string;
  lessonCreatedAt: string;
  lessonMetadata: unknown;
  rating: number;
  comments: string | null;
  feedbackCreatedAt: string;
  stageId: string;
  stageSlug: string;
  stageCode: string;
  stageName: string;
  topicId: string;
  topicTitle: string;
  topicStageOrder: number | null;
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  teacherUserId: string;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  teacherEmail: string | null;
  classNames: string[];
};

export const adminRatingsRepo = {
  getStageSummaries: async (): Promise<AdminRatingsStageSummary[]> => {
    const rows = await db
      .select({
        stageId: curriculumStages.id,
        stageSlug: curriculumStages.slug,
        stageCode: curriculumStages.code,
        stageName: curriculumStages.name,
        stageSortIndex: curriculumStages.sortIndex,
        ratingCount: sql<number>`count(${lessonFeedback.id})::int`,
        averageRating: sql<number | null>`round(avg(${lessonFeedback.rating})::numeric, 2)::float`,
        latestRatingAt: sql<string | null>`max(${lessonFeedback.createdAt})`,
      })
      .from(lessonFeedback)
      .innerJoin(lessons, eq(lessonFeedback.lessonId, lessons.id))
      .innerJoin(topics, eq(lessons.topicId, topics.id))
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
      .groupBy(
        curriculumStages.id,
        curriculumStages.slug,
        curriculumStages.code,
        curriculumStages.name,
        curriculumStages.sortIndex
      )
      .orderBy(asc(curriculumStages.sortIndex), asc(curriculumStages.name));

    return rows.map((row) => ({
      ...row,
      ratingCount: Number(row.ratingCount ?? 0),
      averageRating:
        row.averageRating === null ? null : Number(row.averageRating),
    }));
  },

  getRatingsByStageSlug: async (
    stageSlug: string
  ): Promise<AdminStageLessonRatingRow[]> => {
    return db
      .select({
        feedbackId: lessonFeedback.id,
        lessonId: lessons.id,
        lessonStatus: lessons.status,
        lessonCreatedAt: lessons.createdAt,
        lessonMetadata: lessons.metadata,
        rating: lessonFeedback.rating,
        comments: lessonFeedback.comments,
        feedbackCreatedAt: lessonFeedback.createdAt,
        stageId: curriculumStages.id,
        stageSlug: curriculumStages.slug,
        stageCode: curriculumStages.code,
        stageName: curriculumStages.name,
        topicId: topics.id,
        topicTitle: topics.title,
        topicStageOrder: topics.stageOrder,
        schoolId: schools.id,
        schoolName: schools.name,
        schoolSlug: schools.slug,
        teacherUserId: lessonFeedback.teacherUserId,
        teacherFirstName: userProfile.firstName,
        teacherLastName: userProfile.lastName,
        teacherEmail: userProfile.email,
        classNames: sql<string[]>`COALESCE(
          array_agg(DISTINCT ${classes.name}) FILTER (WHERE ${classes.name} IS NOT NULL),
          ARRAY[]::text[]
        )`,
      })
      .from(lessonFeedback)
      .innerJoin(lessons, eq(lessonFeedback.lessonId, lessons.id))
      .innerJoin(topics, eq(lessons.topicId, topics.id))
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
      .innerJoin(schools, eq(lessons.schoolId, schools.id))
      .leftJoin(userProfile, eq(lessonFeedback.teacherUserId, userProfile.id))
      .leftJoin(lessonClasses, eq(lessons.id, lessonClasses.lessonId))
      .leftJoin(classes, eq(lessonClasses.classId, classes.id))
      .where(and(eq(curriculumStages.slug, stageSlug)))
      .groupBy(
        lessonFeedback.id,
        lessons.id,
        lessons.status,
        lessons.createdAt,
        lessons.metadata,
        curriculumStages.id,
        curriculumStages.slug,
        curriculumStages.code,
        curriculumStages.name,
        topics.id,
        topics.title,
        topics.stageOrder,
        schools.id,
        schools.name,
        schools.slug,
        lessonFeedback.teacherUserId,
        userProfile.firstName,
        userProfile.lastName,
        userProfile.email
      )
      .orderBy(
        desc(lessonFeedback.createdAt),
        asc(topics.stageOrder),
        asc(topics.title)
      );
  },
};
