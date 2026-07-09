import { describe, expect, it, vi } from "vitest";
import {
  buildRecommendationClassInputs,
  orchestrateRecommendations,
  shapeRecommendationResponse,
  type RecommendationOrchestratorDeps,
} from "./recommendation-orchestrator";
import type { RecommendationEngineResult } from "./recommendation-engine";

const unifiedEngineResult: RecommendationEngineResult = {
  kind: "unified",
  recommendedTopicId: "topic-1",
  recommendedTopic: {
    id: "topic-1",
    title: "Topic One",
    stageId: "stage-1",
    stageName: "Stage One",
    stageOrder: 1,
  },
  reason: "next_topic",
  completedLessonInfo: {
    topicTitle: "Previous",
    completedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("shapeRecommendationResponse", () => {
  it("maps unified engine output", () => {
    const result = shapeRecommendationResponse(unifiedEngineResult, []);
    expect(result.recommendedTopicId).toBe("topic-1");
    expect(result.reason).toBe("next_topic");
    expect(result.warning).toBeNull();
  });

  it("maps incompatible engine output to warning payload", () => {
    const result = shapeRecommendationResponse(
      {
        kind: "incompatible",
        incompatibleClasses: {
          reason: "different_stages",
          perClass: [
            {
              classId: "c1",
              className: "7A",
              stageName: "Junior",
              nextTopicTitle: "L1",
              completedCount: 0,
              topicId: "t1",
              stageId: "s1",
              stageOrder: 1,
            },
          ],
        },
      },
      []
    );
    expect(result.warning?.show).toBe(true);
    expect(result.incompatibleClasses?.reason).toBe("different_stages");
  });
});

describe("buildRecommendationClassInputs", () => {
  it("joins class rows with year codes", () => {
    const inputs = buildRecommendationClassInputs(
      ["c1"],
      [{ id: "c1", schoolId: "school-1", name: "7A" }],
      {
        classProgress: [],
        classYearCodes: [{ classId: "c1", yearCodes: ["7"] }],
      }
    );
    expect(inputs[0]).toEqual({
      classId: "c1",
      className: "7A",
      yearCodes: ["7"],
    });
  });
});

describe("orchestrateRecommendations", () => {
  it("filters feedback lessons that belong to another teacher", async () => {
    const deps: RecommendationOrchestratorDeps = {
      getClassRows: vi.fn().mockResolvedValue([
        { id: "c1", schoolId: "school-1", name: "7A" },
      ]),
      assertCanAccessSchools: vi.fn().mockResolvedValue(undefined),
      getRecommendationData: vi.fn().mockResolvedValue({
        classProgress: [],
        classYearCodes: [{ classId: "c1", yearCodes: ["7"] }],
      }),
      getActiveLessons: vi.fn().mockResolvedValue([
        {
          lessonId: "l-feedback-other",
          title: "Feedback lesson",
          status: "feedback",
          topicId: "t1",
          topicTitle: "Topic",
          classIds: ["c1"],
          classes: [{ className: "7A" }],
          schoolId: "school-1",
          schoolSlug: "school-slug",
          createdByUserId: "other-teacher",
          ownerName: "Other",
          ownerEmail: "other@example.com",
        },
        {
          lessonId: "l-progress",
          title: "Live lesson",
          status: "in_progress",
          topicId: "t2",
          topicTitle: "Topic 2",
          classIds: ["c1"],
          classes: [{ className: "7A" }],
          schoolId: "school-1",
          schoolSlug: "school-slug",
          createdByUserId: "viewer-1",
          ownerName: "Viewer",
          ownerEmail: "viewer@example.com",
        },
      ]),
      getStagesWithYears: vi.fn().mockResolvedValue([
        {
          id: "stage-junior",
          name: "Junior",
          code: "JS",
          sortIndex: 1,
          years: [{ code: "7" }],
        },
      ]),
      getAllTopics: vi.fn().mockResolvedValue([
        {
          id: "t1",
          title: "First topic",
          stageId: "stage-junior",
          stageOrder: 1,
        },
      ]),
      getContentTypeIdForSchool: vi.fn().mockResolvedValue(undefined),
      getCompletedTopicIdsByClass: vi
        .fn()
        .mockResolvedValue(new Map<string, Set<string>>()),
    };

    const result = await orchestrateRecommendations(
      { classIds: ["c1"], viewerUserId: "viewer-1" },
      deps
    );

    expect(result.activeLessons).toHaveLength(1);
    expect(result.activeLessons[0]?.lessonId).toBe("l-progress");
    expect(result.recommendedTopicId).toBe("t1");
  });

  it("throws when a class id is missing", async () => {
    const deps: RecommendationOrchestratorDeps = {
      getClassRows: vi.fn().mockResolvedValue([]),
      assertCanAccessSchools: vi.fn(),
      getRecommendationData: vi.fn(),
      getActiveLessons: vi.fn(),
      getStagesWithYears: vi.fn(),
      getAllTopics: vi.fn(),
      getContentTypeIdForSchool: vi.fn().mockResolvedValue(undefined),
      getCompletedTopicIdsByClass: vi.fn(),
    };

    await expect(
      orchestrateRecommendations(
        { classIds: ["missing-class"], viewerUserId: "viewer-1" },
        deps
      )
    ).rejects.toThrow("One or more classes not found");
  });
});
