import { getMinYearCodeSortIndex } from "@/lib/year-code-sort";

export type StageWithYears = {
  id: string;
  name: string;
  code: string;
  sortIndex: number | null;
  years?: Array<{ code: string | null }>;
};

export type TopicRow = {
  id: string;
  title: string;
  stageId: string;
  stageOrder: number | null;
};

export type ClassInput = {
  classId: string;
  className: string;
  yearCodes: string[];
};

export type PerClassRecommendation = {
  classId: string;
  className: string;
  stageId: string | null;
  stageName: string;
  topicId: string | null;
  topicTitle: string | null;
  stageOrder: number | null;
  status: "next_topic" | "fallback_year_match" | "stage_complete" | "no_match";
  completedCount: number;
};

export type IncompatibleClassesPayload = {
  reason: "different_stages" | "different_progress";
  perClass: Array<{
    classId: string;
    className: string;
    stageName: string;
    nextTopicTitle: string | null;
    completedCount: number;
    topicId: string | null;
    stageId: string | null;
    stageOrder: number | null;
  }>;
};

export type StageCompletePayload = {
  classId: string;
  className: string;
  stageId: string;
  stageName: string;
  completedCount: number;
};

export type RecommendationEngineResult =
  | {
      kind: "unified";
      recommendedTopicId: string;
      recommendedTopic: {
        id: string;
        title: string;
        stageId: string;
        stageName: string;
        stageOrder: number | null;
      };
      reason: "next_topic" | "fallback_year_match" | "final_fallback";
      completedLessonInfo: { topicTitle: string; completedAt: string } | null;
    }
  | { kind: "incompatible"; incompatibleClasses: IncompatibleClassesPayload }
  | { kind: "stage_complete"; stageComplete: StageCompletePayload }
  | { kind: "invalid"; message: string }
  | { kind: "none" };

function sortStages(stages: StageWithYears[]): StageWithYears[] {
  return [...stages].sort(
    (a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999)
  );
}

function topicsForStage(allTopics: TopicRow[], stageId: string): TopicRow[] {
  return allTopics
    .filter((t) => t.stageId === stageId)
    .sort((a, b) => (a.stageOrder ?? 999999) - (b.stageOrder ?? 999999));
}

/** Composite classes use the lowest matching stage (primary stage). */
export function resolvePrimaryStageForClass(
  yearCodes: string[],
  allStages: StageWithYears[]
): StageWithYears | null {
  if (yearCodes.length === 0) return null;
  const matching = allStages.filter((stage) => {
    const stageCodes = new Set(
      (stage.years ?? []).map((y) => y.code).filter((c): c is string => !!c)
    );
    return yearCodes.some((code) => stageCodes.has(code));
  });
  if (matching.length === 0) return null;
  return sortStages(matching)[0] ?? null;
}

export function computePerClassRecommendation(
  classInput: ClassInput,
  allStages: StageWithYears[],
  allTopics: TopicRow[],
  completedTopicIds: Set<string>
): PerClassRecommendation {
  const primaryStage = resolvePrimaryStageForClass(classInput.yearCodes, allStages);

  if (!primaryStage) {
    const sortedStages = sortStages(allStages);
    const firstStage = sortedStages[0];
    if (!firstStage) {
      return {
        classId: classInput.classId,
        className: classInput.className,
        stageId: null,
        stageName: "",
        topicId: null,
        topicTitle: null,
        stageOrder: null,
        status: "no_match",
        completedCount: 0,
      };
    }
    const stageTopics = topicsForStage(allTopics, firstStage.id);
    const first = stageTopics[0];
    return {
      classId: classInput.classId,
      className: classInput.className,
      stageId: firstStage.id,
      stageName: firstStage.name,
      topicId: first?.id ?? null,
      topicTitle: first?.title ?? null,
      stageOrder: first?.stageOrder ?? null,
      status: "fallback_year_match",
      completedCount: 0,
    };
  }

  const stageTopics = topicsForStage(allTopics, primaryStage.id);
  const completedInStage = stageTopics.filter((t) => completedTopicIds.has(t.id));
  const nextTopic = stageTopics.find((t) => !completedTopicIds.has(t.id));

  if (!nextTopic && stageTopics.length > 0 && completedInStage.length === stageTopics.length) {
    return {
      classId: classInput.classId,
      className: classInput.className,
      stageId: primaryStage.id,
      stageName: primaryStage.name,
      topicId: null,
      topicTitle: null,
      stageOrder: null,
      status: "stage_complete",
      completedCount: completedInStage.length,
    };
  }

  if (nextTopic) {
    const hasAnyCompleted = completedInStage.length > 0;
    return {
      classId: classInput.classId,
      className: classInput.className,
      stageId: primaryStage.id,
      stageName: primaryStage.name,
      topicId: nextTopic.id,
      topicTitle: nextTopic.title,
      stageOrder: nextTopic.stageOrder,
      status: hasAnyCompleted ? "next_topic" : "fallback_year_match",
      completedCount: completedInStage.length,
    };
  }

  return {
    classId: classInput.classId,
    className: classInput.className,
    stageId: primaryStage.id,
    stageName: primaryStage.name,
    topicId: null,
    topicTitle: null,
    stageOrder: null,
    status: "no_match",
    completedCount: 0,
  };
}

function recommendationKey(rec: PerClassRecommendation): string {
  if (rec.status === "stage_complete") return `complete:${rec.stageId}`;
  if (!rec.topicId) return `none:${rec.classId}`;
  return `${rec.stageId}:${rec.topicId}`;
}

export function buildRecommendationResult(
  classes: ClassInput[],
  allStages: StageWithYears[],
  allTopics: TopicRow[],
  completedTopicIdsByClass: Map<string, Set<string>>,
  latestCompletedByClass: Map<
    string,
    { topicTitle: string; completedAt: string }
  >
): RecommendationEngineResult {
  if (classes.length === 0) {
    return { kind: "none" };
  }

  const perClass = classes.map((c) =>
    computePerClassRecommendation(
      c,
      allStages,
      allTopics,
      completedTopicIdsByClass.get(c.classId) ?? new Set()
    )
  );

  const stageComplete = perClass.filter((p) => p.status === "stage_complete");
  if (stageComplete.length === perClass.length && stageComplete.length > 0) {
    const first = stageComplete[0]!;
    return {
      kind: "stage_complete",
      stageComplete: {
        classId: first.classId,
        className: first.className,
        stageId: first.stageId!,
        stageName: first.stageName,
        completedCount: first.completedCount,
      },
    };
  }

  if (stageComplete.length > 0 && stageComplete.length < perClass.length) {
    return {
      kind: "incompatible",
      incompatibleClasses: {
        reason: "different_progress",
        perClass: perClass.map((p) => ({
          classId: p.classId,
          className: p.className,
          stageName: p.stageName,
          nextTopicTitle: p.topicTitle,
          completedCount: p.completedCount,
          topicId: p.topicId,
          stageId: p.stageId,
          stageOrder: p.stageOrder,
        })),
      },
    };
  }

  const keys = new Set(perClass.map(recommendationKey));
  if (keys.size > 1) {
    const stages = new Set(perClass.map((p) => p.stageId).filter(Boolean));
    return {
      kind: "incompatible",
      incompatibleClasses: {
        reason: stages.size > 1 ? "different_stages" : "different_progress",
        perClass: perClass.map((p) => ({
          classId: p.classId,
          className: p.className,
          stageName: p.stageName,
          nextTopicTitle: p.topicTitle,
          completedCount: p.completedCount,
          topicId: p.topicId,
          stageId: p.stageId,
          stageOrder: p.stageOrder,
        })),
      },
    };
  }

  const unified = perClass.find((p) => p.topicId && p.stageId);
  if (!unified?.topicId || !unified.stageId) {
    return {
      kind: "invalid",
      message:
        "Your selection cannot be taught as one combined lesson. Please choose one class or pick a compromise lesson.",
    };
  }

  const latest = latestCompletedByClass.get(unified.classId) ?? null;
  const reason =
    unified.status === "next_topic"
      ? "next_topic"
      : unified.status === "fallback_year_match"
        ? "fallback_year_match"
        : "final_fallback";

  return {
    kind: "unified",
    recommendedTopicId: unified.topicId,
    recommendedTopic: {
      id: unified.topicId,
      title: unified.topicTitle!,
      stageId: unified.stageId,
      stageName: unified.stageName,
      stageOrder: unified.stageOrder,
    },
    reason,
    completedLessonInfo: latest
      ? { topicTitle: latest.topicTitle, completedAt: latest.completedAt }
      : null,
  };
}

/** Sort stages for manual topic picker by minimum year code on the stage. */
export function sortStagesByYearOrder(stages: StageWithYears[]): StageWithYears[] {
  return [...stages].sort((a, b) => {
    const aCodes = (a.years ?? []).map((y) => y.code).filter((c): c is string => !!c);
    const bCodes = (b.years ?? []).map((y) => y.code).filter((c): c is string => !!c);
    const aMin = getMinYearCodeSortIndex(aCodes);
    const bMin = getMinYearCodeSortIndex(bCodes);
    if (aMin !== bMin) return aMin - bMin;
    return (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999);
  });
}
