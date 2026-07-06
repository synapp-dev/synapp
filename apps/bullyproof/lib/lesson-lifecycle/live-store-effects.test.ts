import { describe, expect, it } from "vitest";
import {
  isLiveLessonStatus,
  shouldRefetchLiveLessonStore,
  shouldStopLiveLesson,
} from "./live-store-effects";

describe("isLiveLessonStatus", () => {
  it("includes in_progress and feedback", () => {
    expect(isLiveLessonStatus("in_progress")).toBe(true);
    expect(isLiveLessonStatus("feedback")).toBe(true);
    expect(isLiveLessonStatus("ready")).toBe(false);
  });
});

describe("shouldStopLiveLesson", () => {
  it("stops when current live lesson completes", () => {
    expect(shouldStopLiveLesson("completed", "l1", "l1")).toBe(true);
    expect(shouldStopLiveLesson("completed", "l1", "l2")).toBe(false);
    expect(shouldStopLiveLesson("feedback", "l1", "l1")).toBe(false);
  });
});

describe("shouldRefetchLiveLessonStore", () => {
  it("refetches on live status changes and completion", () => {
    expect(shouldRefetchLiveLessonStore("ready", "in_progress")).toBe(true);
    expect(shouldRefetchLiveLessonStore("in_progress", "feedback")).toBe(true);
    expect(shouldRefetchLiveLessonStore("feedback", "completed")).toBe(true);
    expect(shouldRefetchLiveLessonStore("preparing", "ready")).toBe(false);
  });
});
