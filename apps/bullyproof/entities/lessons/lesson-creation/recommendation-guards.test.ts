import { describe, expect, it } from "vitest";
import {
  canProceedFromRecommendationStep,
  getConflictingActiveLessons,
} from "./recommendation-guards";
import type { LessonRecommendationsResult } from "@/types/lesson-recommendations";

const baseRecommendation: LessonRecommendationsResult = {
  recommendedTopicId: "topic-1",
  recommendedTopic: {
    id: "topic-1",
    title: "Topic One",
    stageId: "stage-1",
    stageName: "Junior",
    stageOrder: 1,
  },
  warning: null,
  reason: "next_topic",
  completedLessonInfo: null,
  activeLessons: [],
};

describe("getConflictingActiveLessons", () => {
  it("returns lessons sharing a selected class", () => {
    const conflicts = getConflictingActiveLessons(
      [
        {
          lessonId: "l1",
          title: "Live",
          status: "in_progress",
          topicId: "t1",
          topicTitle: "T1",
          classIds: ["c1", "c2"],
          className: "7A",
          schoolId: "s1",
          schoolSlug: "school",
          createdByUserId: "u1",
          ownerName: null,
          ownerEmail: null,
        },
      ],
      ["c2"]
    );
    expect(conflicts).toHaveLength(1);
  });
});

describe("canProceedFromRecommendationStep", () => {
  it("allows proceed when recommendation is clear", () => {
    expect(
      canProceedFromRecommendationStep({
        selectedClassIds: ["c1"],
        recommendation: baseRecommendation,
        selectedStageId: null,
      })
    ).toBe(true);
  });

  it("blocks when active lesson conflicts with selected class", () => {
    expect(
      canProceedFromRecommendationStep({
        selectedClassIds: ["c1"],
        recommendation: {
          ...baseRecommendation,
          activeLessons: [
            {
              lessonId: "l1",
              title: "Live",
              status: "in_progress",
              topicId: "t1",
              topicTitle: "T1",
              classIds: ["c1"],
              className: "7A",
              schoolId: "s1",
              schoolSlug: "school",
              createdByUserId: "u1",
              ownerName: null,
              ownerEmail: null,
            },
          ],
        },
        selectedStageId: null,
      })
    ).toBe(false);
  });

  it("requires stage selection when multiple stages detected", () => {
    expect(
      canProceedFromRecommendationStep({
        selectedClassIds: ["c1"],
        recommendation: {
          ...baseRecommendation,
          recommendedTopicId: null,
          recommendedTopic: null,
          warning: {
            show: true,
            classes: [],
            multipleStages: [
              {
                stageId: "s1",
                stageName: "Junior",
                stageCode: "J",
                stageSortIndex: 1,
                classes: [],
                firstTopic: null,
              },
              {
                stageId: "s2",
                stageName: "Senior",
                stageCode: "S",
                stageSortIndex: 2,
                classes: [],
                firstTopic: null,
              },
            ],
          },
        },
        selectedStageId: null,
      })
    ).toBe(false);

    expect(
      canProceedFromRecommendationStep({
        selectedClassIds: ["c1"],
        recommendation: {
          ...baseRecommendation,
          recommendedTopicId: null,
          recommendedTopic: null,
          warning: {
            show: true,
            classes: [],
            multipleStages: [
              {
                stageId: "s1",
                stageName: "Junior",
                stageCode: "J",
                stageSortIndex: 1,
                classes: [],
                firstTopic: null,
              },
              {
                stageId: "s2",
                stageName: "Senior",
                stageCode: "S",
                stageSortIndex: 2,
                classes: [],
                firstTopic: null,
              },
            ],
          },
        },
        selectedStageId: "s1",
      })
    ).toBe(true);
  });
});
