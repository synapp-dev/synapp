import { shouldIncludeLessonInActiveConflicts } from "@/lib/lesson-access-policy";
import type {
  ActiveLessonConflict,
  LessonRecommendationsResult,
} from "@/types/lesson-recommendations";
import { db } from "@/server/db/drizzle";
import {
  classes,
  lessonClasses,
  lessons,
  topics,
} from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { curriculumRepo } from "../curriculum/curriculum.repo";
import { topicsRepo } from "../topics/topics.repo";
import { lessonsRepo } from "./lessons.repo";
import {
  assertCanAccessClassesInSchools,
  type LessonAccessAuthContext,
} from "./lesson-access-policy";
import {
  buildRecommendationResult,
  computePerClassRecommendation,
  type ClassInput,
  type PerClassRecommendation,
  type RecommendationEngineResult,
  type StageWithYears,
  type TopicRow,
} from "./recommendation-engine";

export type ClassRow = {
  id: string;
  schoolId: string;
  name: string;
};

export type RecommendationRepoData = {
  classProgress: Array<{
    classId: string;
    topicTitle: string;
    lessonCreatedAt: string;
  }>;
  classYearCodes: Array<{
    classId: string;
    yearCodes: string[];
  }>;
};

export type RawActiveLesson = Awaited<
  ReturnType<typeof lessonsRepo.getActiveLessonsForClasses>
>[number];

export type RecommendationOrchestratorDeps = {
  getClassRows: (classIds: string[]) => Promise<ClassRow[]>;
  assertCanAccessSchools: (schoolIds: string[]) => Promise<void>;
  getRecommendationData: (classIds: string[]) => Promise<RecommendationRepoData | null>;
  getActiveLessons: (classIds: string[]) => Promise<RawActiveLesson[]>;
  getStagesWithYears: () => Promise<StageWithYears[]>;
  getAllTopics: () => Promise<TopicRow[]>;
  getCompletedTopicIdsByClass: (
    classIds: string[]
  ) => Promise<Map<string, Set<string>>>;
};

export function mapActiveLessonsForResponse(
  activeLessons: RawActiveLesson[]
): ActiveLessonConflict[] {
  return activeLessons.map((lesson) => ({
    lessonId: lesson.lessonId,
    title: lesson.title,
    status: lesson.status as ActiveLessonConflict["status"],
    topicId: lesson.topicId,
    topicTitle: lesson.topicTitle,
    classIds: lesson.classIds || [],
    className: (lesson.classes || []).map((c) => c.className).join(", "),
    schoolId: lesson.schoolId,
    schoolSlug: lesson.schoolSlug,
    createdByUserId: lesson.createdByUserId,
    ownerName: lesson.ownerName,
    ownerEmail: lesson.ownerEmail,
  }));
}

export function shapeRecommendationResponse(
  engineResult: RecommendationEngineResult,
  activeLessons: ActiveLessonConflict[]
): LessonRecommendationsResult {
  if (engineResult.kind === "unified") {
    return {
      recommendedTopicId: engineResult.recommendedTopicId,
      recommendedTopic: engineResult.recommendedTopic,
      warning: null,
      incompatibleClasses: null,
      stageComplete: null,
      invalidSelection: null,
      reason: engineResult.reason,
      completedLessonInfo: engineResult.completedLessonInfo,
      activeLessons,
    };
  }

  if (engineResult.kind === "incompatible") {
    return {
      recommendedTopicId: null,
      recommendedTopic: null,
      warning: {
        show: true,
        classes: engineResult.incompatibleClasses.perClass.map((p) => ({
          classId: p.classId,
          className: p.className,
          topicTitle: p.nextTopicTitle ?? "—",
          stageName: p.stageName,
        })),
      },
      incompatibleClasses: engineResult.incompatibleClasses,
      stageComplete: null,
      invalidSelection: null,
      reason: null,
      completedLessonInfo: null,
      activeLessons,
    };
  }

  if (engineResult.kind === "stage_complete") {
    return {
      recommendedTopicId: null,
      recommendedTopic: null,
      warning: null,
      incompatibleClasses: null,
      stageComplete: engineResult.stageComplete,
      invalidSelection: null,
      reason: "stage_complete",
      completedLessonInfo: null,
      activeLessons,
    };
  }

  if (engineResult.kind === "invalid") {
    return {
      recommendedTopicId: null,
      recommendedTopic: null,
      warning: null,
      incompatibleClasses: null,
      stageComplete: null,
      invalidSelection: { message: engineResult.message },
      reason: null,
      completedLessonInfo: null,
      activeLessons,
    };
  }

  return {
    recommendedTopicId: null,
    recommendedTopic: null,
    warning: null,
    incompatibleClasses: null,
    stageComplete: null,
    invalidSelection: {
      message:
        "We couldn't find a lesson recommendation for your selection. Please choose different classes or pick a lesson manually.",
    },
    reason: null,
    completedLessonInfo: null,
    activeLessons,
  };
}

export function buildRecommendationClassInputs(
  classIds: string[],
  classRows: ClassRow[],
  recommendationData: RecommendationRepoData
): ClassInput[] {
  return classIds.map((id) => {
    const info = classRows.find((c) => c.id === id);
    const yearEntry = recommendationData.classYearCodes.find(
      (c) => c.classId === id
    );
    return {
      classId: id,
      className: info?.name ?? "Unknown Class",
      yearCodes: yearEntry?.yearCodes ?? [],
    };
  });
}

export function buildLatestCompletedByClass(
  classProgress: RecommendationRepoData["classProgress"]
): Map<string, { topicTitle: string; completedAt: string }> {
  const latestCompletedByClass = new Map<
    string,
    { topicTitle: string; completedAt: string }
  >();
  for (const progress of classProgress) {
    latestCompletedByClass.set(progress.classId, {
      topicTitle: progress.topicTitle,
      completedAt: progress.lessonCreatedAt,
    });
  }
  return latestCompletedByClass;
}

export async function orchestrateRecommendations(
  input: { classIds: string[]; viewerUserId: string },
  deps: RecommendationOrchestratorDeps
): Promise<LessonRecommendationsResult> {
  const { classIds, viewerUserId } = input;

  const classRows = await deps.getClassRows(classIds);
  if (classRows.length !== classIds.length) {
    const foundIds = new Set(classRows.map((c) => c.id));
    const missingIds = classIds.filter((id) => !foundIds.has(id));
    throw new Error(`One or more classes not found: ${missingIds.join(", ")}`);
  }

  const schoolIds = [...new Set(classRows.map((c) => c.schoolId))];
  await deps.assertCanAccessSchools(schoolIds);

  const recommendationData = await deps.getRecommendationData(classIds);
  if (!recommendationData) {
    throw new Error("Failed to get recommendation data from repository");
  }

  const rawActiveLessons = await deps.getActiveLessons(classIds);
  const activeLessons = mapActiveLessonsForResponse(
    rawActiveLessons.filter((lesson) =>
      shouldIncludeLessonInActiveConflicts(
        {
          status: lesson.status,
          createdByUserId: lesson.createdByUserId,
        },
        viewerUserId
      )
    )
  );

  const allStages = (await deps.getStagesWithYears()) || [];
  const allTopics = (await deps.getAllTopics()) || [];
  const completedTopicIdsByClass = await deps.getCompletedTopicIdsByClass(
    classIds
  );

  const classInputs = buildRecommendationClassInputs(
    classIds,
    classRows,
    recommendationData
  );
  const latestCompletedByClass = buildLatestCompletedByClass(
    recommendationData.classProgress
  );

  const engineResult = buildRecommendationResult(
    classInputs,
    allStages,
    allTopics,
    completedTopicIdsByClass,
    latestCompletedByClass
  );

  return shapeRecommendationResponse(engineResult, activeLessons);
}

/**
 * Per-class progress for the wizard's class-selection step: which level each
 * class is on and its next lesson. Unknown ids are skipped rather than
 * throwing, since the list step shows every class in the school.
 */
export async function orchestrateClassProgress(
  input: { classIds: string[] },
  deps: RecommendationOrchestratorDeps
): Promise<PerClassRecommendation[]> {
  const classRows = await deps.getClassRows(input.classIds);
  if (classRows.length === 0) return [];

  const schoolIds = [...new Set(classRows.map((c) => c.schoolId))];
  await deps.assertCanAccessSchools(schoolIds);

  const foundIds = classRows.map((c) => c.id);
  const recommendationData = await deps.getRecommendationData(foundIds);
  if (!recommendationData) return [];

  const [allStages, allTopics, completedTopicIdsByClass] = await Promise.all([
    deps.getStagesWithYears().then((rows) => rows || []),
    deps.getAllTopics().then((rows) => rows || []),
    deps.getCompletedTopicIdsByClass(foundIds),
  ]);

  const classInputs = buildRecommendationClassInputs(
    foundIds,
    classRows,
    recommendationData
  );

  return classInputs.map((classInput) =>
    computePerClassRecommendation(
      classInput,
      allStages,
      allTopics,
      completedTopicIdsByClass.get(classInput.classId) ?? new Set()
    )
  );
}

export function createServerRecommendationDeps(
  ctx: LessonAccessAuthContext
): RecommendationOrchestratorDeps {
  return {
    getClassRows: async (classIds) =>
      db
        .select({
          id: classes.id,
          schoolId: classes.schoolId,
          name: classes.name,
        })
        .from(classes)
        .where(inArray(classes.id, classIds)),

    assertCanAccessSchools: async (schoolIds) => {
      await assertCanAccessClassesInSchools(ctx, schoolIds);
    },

    getRecommendationData: (classIds) =>
      lessonsRepo.getRecommendationsForClasses(classIds),

    getActiveLessons: async (classIds) =>
      (await lessonsRepo.getActiveLessonsForClasses(classIds)) || [],

    getStagesWithYears: () => curriculumRepo.getStagesWithYears(),

    getAllTopics: async () => {
      const rows = (await topicsRepo.getAll()) || [];
      return rows.map((t) => ({
        id: t.id,
        title: t.title,
        stageId: t.stageId,
        stageOrder: t.stageOrder,
      }));
    },

    getCompletedTopicIdsByClass: async (classIds) => {
      const completedRows = await db
        .select({
          classId: lessonClasses.classId,
          topicId: topics.id,
        })
        .from(lessonClasses)
        .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
        .innerJoin(topics, eq(lessons.topicId, topics.id))
        .where(
          and(
            inArray(lessonClasses.classId, classIds),
            eq(lessons.status, "completed")
          )
        );

      const completedTopicIdsByClass = new Map<string, Set<string>>();
      for (const row of completedRows) {
        if (!completedTopicIdsByClass.has(row.classId)) {
          completedTopicIdsByClass.set(row.classId, new Set());
        }
        completedTopicIdsByClass.get(row.classId)!.add(row.topicId);
      }
      return completedTopicIdsByClass;
    },
  };
}
