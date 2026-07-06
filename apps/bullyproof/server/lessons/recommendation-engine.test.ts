import { describe, expect, it } from "vitest";
import {
  buildRecommendationResult,
  computePerClassRecommendation,
  resolvePrimaryStageForClass,
  type ClassInput,
  type StageWithYears,
  type TopicRow,
} from "./recommendation-engine";

const stages: StageWithYears[] = [
  {
    id: "stage-junior",
    name: "Junior Secondary",
    code: "JS",
    sortIndex: 2,
    years: [{ code: "7" }, { code: "8" }, { code: "9" }, { code: "10" }],
  },
  {
    id: "stage-senior",
    name: "Senior Secondary",
    code: "SS",
    sortIndex: 3,
    years: [{ code: "11" }, { code: "12" }],
  },
  {
    id: "stage-half",
    name: "Early Primary",
    code: "EP",
    sortIndex: 0,
    years: [{ code: "½" }, { code: "¾" }],
  },
];

const topics: TopicRow[] = [
  { id: "t1", title: "L1 Early", stageId: "stage-half", stageOrder: 1 },
  { id: "t2", title: "L2 Early", stageId: "stage-half", stageOrder: 2 },
  { id: "s1", title: "L1 Senior", stageId: "stage-senior", stageOrder: 1 },
  { id: "s2", title: "L2 Senior", stageId: "stage-senior", stageOrder: 2 },
  { id: "j1", title: "L1 Junior", stageId: "stage-junior", stageOrder: 1 },
];

describe("recommendation-engine", () => {
  it("resolves composite class to primary (lowest) stage", () => {
    const stage = resolvePrimaryStageForClass(["5", "6"], [
      {
        id: "stage-mid",
        name: "Middle",
        code: "M",
        sortIndex: 1,
        years: [{ code: "5" }, { code: "6" }],
      },
      ...stages,
    ]);
    expect(stage?.id).toBe("stage-mid");
  });

  it("returns incompatible when mixed classes need different topics", () => {
    const classes: ClassInput[] = [
      { classId: "c1", className: "12 Beige", yearCodes: ["12"] },
      { classId: "c2", className: "11 Denim", yearCodes: ["11"] },
    ];
    const completed = new Map<string, Set<string>>([["c1", new Set(["s1"])]]);
    const result = buildRecommendationResult(classes, stages, topics, completed, new Map());
    expect(result.kind).toBe("incompatible");
  });

  it("returns stage_complete when all topics done in stage", () => {
    const classes: ClassInput[] = [
      { classId: "c1", className: "½ Teal", yearCodes: ["½"] },
    ];
    const completed = new Map<string, Set<string>>([
      ["c1", new Set(["t1", "t2"])],
    ]);
    const result = buildRecommendationResult(classes, stages, topics, completed, new Map());
    expect(result.kind).toBe("stage_complete");
  });

  it("returns unified recommendation when classes align", () => {
    const classes: ClassInput[] = [
      { classId: "c1", className: "12 Beige", yearCodes: ["12"] },
      { classId: "c2", className: "11 Denim", yearCodes: ["11"] },
    ];
    const completed = new Map<string, Set<string>>([
      ["c1", new Set(["s1"])],
      ["c2", new Set(["s1"])],
    ]);
    const result = buildRecommendationResult(classes, stages, topics, completed, new Map());
    expect(result.kind).toBe("unified");
    if (result.kind === "unified") {
      expect(result.recommendedTopicId).toBe("s2");
    }
  });

  it("computes first topic for class with no completions", () => {
    const rec = computePerClassRecommendation(
      { classId: "c1", className: "½ Coral", yearCodes: ["½"] },
      stages,
      topics,
      new Set()
    );
    expect(rec.topicId).toBe("t1");
    expect(rec.status).toBe("fallback_year_match");
  });
});
