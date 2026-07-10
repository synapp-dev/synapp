/**
 * Client-safe row types derived from Drizzle schema.
 * Import from here in entities/ and components/ — not @/server/db/schema.
 */
import type { InferSelectModel } from "drizzle-orm";
import {
  classes,
  certificationCourses,
  contentTypes,
  courseTopicQuizzes,
  courseTopicSlides,
  courseTopics,
  curriculumStages,
  lessons,
  quizAnswers,
  quizQuestions,
  roles,
  schoolInvites,
  schoolLevels,
  schoolLicences,
  schoolSectors,
  schoolYears,
  schools,
  states,
  topicSlides,
  topics,
  vSchoolsEnriched,
  vSchoolsReadable,
  vUserProfileExpanded,
} from "@/drizzle/schema";

export type ClassRow = InferSelectModel<typeof classes>;
export type CertificationCourseRow = InferSelectModel<
  typeof certificationCourses
>;
export type ContentTypeRow = InferSelectModel<typeof contentTypes>;
export type CourseTopicRow = InferSelectModel<typeof courseTopics>;
export type CourseTopicQuizRow = InferSelectModel<typeof courseTopicQuizzes>;
export type CourseTopicSlideRow = InferSelectModel<typeof courseTopicSlides>;
export type CurriculumStageRow = InferSelectModel<typeof curriculumStages>;
export type LessonRow = InferSelectModel<typeof lessons>;
export type QuizAnswerRow = InferSelectModel<typeof quizAnswers>;
export type QuizQuestionRow = InferSelectModel<typeof quizQuestions>;
export type RoleRow = InferSelectModel<typeof roles>;
export type SchoolInviteRow = InferSelectModel<typeof schoolInvites>;
export type SchoolLevelRow = InferSelectModel<typeof schoolLevels>;
export type SchoolLicenceRow = InferSelectModel<typeof schoolLicences>;
export type SchoolRow = InferSelectModel<typeof schools>;
export type SchoolSectorRow = InferSelectModel<typeof schoolSectors>;
export type SchoolYearRow = InferSelectModel<typeof schoolYears>;
export type StateRow = InferSelectModel<typeof states>;
export type TopicRow = InferSelectModel<typeof topics>;
export type TopicSlideRow = InferSelectModel<typeof topicSlides>;

export type SchoolReadableRow = typeof vSchoolsReadable.$inferSelect;
export type SchoolEnrichedRow = typeof vSchoolsEnriched.$inferSelect;
export type UserProfileExpandedRow = typeof vUserProfileExpanded.$inferSelect;
