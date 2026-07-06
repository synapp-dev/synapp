import { describe, expect, it } from "vitest";
import {
  buildLessonPagePath,
  detectSubPageFromPathname,
  getDefaultPagePath,
  getDefaultSubPageForStatus,
  resolveRealtimeStatusRedirect,
  resolveRunLessonStatusRedirect,
} from "./redirects";

describe("getDefaultSubPageForStatus", () => {
  it("routes feedback and completed to feedback tab", () => {
    expect(getDefaultSubPageForStatus("feedback")).toBe("feedback");
    expect(getDefaultSubPageForStatus("completed")).toBe("feedback");
  });

  it("routes ready and in_progress to run-lesson tab", () => {
    expect(getDefaultSubPageForStatus("ready")).toBe("run-lesson");
    expect(getDefaultSubPageForStatus("in_progress")).toBe("run-lesson");
  });

  it("defaults preparing and cancelled to prepare tab", () => {
    expect(getDefaultSubPageForStatus("preparing")).toBe("prepare");
    expect(getDefaultSubPageForStatus("cancelled")).toBe("prepare");
  });
});

describe("getDefaultPagePath", () => {
  it("builds full path for status", () => {
    expect(getDefaultPagePath("my-school", "lesson-1", "ready")).toBe(
      "/schools/my-school/lessons/lesson-1/run-lesson"
    );
  });
});

describe("detectSubPageFromPathname", () => {
  it("detects sub-pages from pathname segments", () => {
    expect(
      detectSubPageFromPathname("/schools/s/lessons/l/prepare")
    ).toBe("prepare");
    expect(
      detectSubPageFromPathname("/schools/s/lessons/l/run-lesson/present")
    ).toBe("run-lesson");
    expect(
      detectSubPageFromPathname("/schools/s/lessons/l/feedback")
    ).toBe("feedback");
  });
});

describe("resolveRealtimeStatusRedirect", () => {
  it("redirects to feedback when status becomes feedback off prepare", () => {
    expect(
      resolveRealtimeStatusRedirect({
        schoolSlug: "school",
        lessonId: "l1",
        newStatus: "feedback",
        pathname: "/schools/school/lessons/l1/prepare",
      })
    ).toBe("/schools/school/lessons/l1/feedback");
  });

  it("does not redirect when already on feedback", () => {
    expect(
      resolveRealtimeStatusRedirect({
        schoolSlug: "school",
        lessonId: "l1",
        newStatus: "completed",
        pathname: "/schools/school/lessons/l1/feedback",
      })
    ).toBeNull();
  });

  it("redirects from run-lesson when completed", () => {
    expect(
      resolveRealtimeStatusRedirect({
        schoolSlug: "school",
        lessonId: "l1",
        newStatus: "completed",
        pathname: "/schools/school/lessons/l1/run-lesson",
      })
    ).toBe("/schools/school/lessons/l1/feedback");
  });
});

describe("resolveRunLessonStatusRedirect", () => {
  it("redirects creator to feedback when status is feedback", () => {
    expect(
      resolveRunLessonStatusRedirect({
        schoolSlug: "school",
        lessonId: "l1",
        status: "feedback",
        isLessonCreator: true,
      })
    ).toBe("/schools/school/lessons/l1/feedback");
  });

  it("does not redirect non-creators", () => {
    expect(
      resolveRunLessonStatusRedirect({
        schoolSlug: "school",
        lessonId: "l1",
        status: "feedback",
        isLessonCreator: false,
      })
    ).toBeNull();
  });
});

describe("buildLessonPagePath", () => {
  it("builds overview without trailing segment", () => {
    expect(buildLessonPagePath("s", "l", "overview")).toBe(
      "/schools/s/lessons/l"
    );
  });
});
