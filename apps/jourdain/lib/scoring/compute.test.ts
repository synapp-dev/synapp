import { describe, expect, it } from "vitest";
import {
  addDays,
  computeDayScore,
  computeScoreHistory,
  scoreDate,
  type ScoreTask,
} from "./compute";

const DATE = "2026-07-07";

function task(overrides: Partial<ScoreTask>): ScoreTask {
  return {
    status: "open",
    domains: ["health"],
    dueDate: DATE,
    occurrenceDate: null,
    ...overrides,
  };
}

describe("scoreDate", () => {
  it("prefers the routine occurrence date over the due date", () => {
    expect(
      scoreDate(task({ occurrenceDate: "2026-07-01", dueDate: "2026-07-02" }))
    ).toBe("2026-07-01");
    expect(scoreDate(task({ dueDate: "2026-07-02" }))).toBe("2026-07-02");
    expect(scoreDate(task({ dueDate: null }))).toBeNull();
  });
});

describe("computeDayScore", () => {
  it("scores each pillar as done over scheduled", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done" }),
      task({ status: "open" }),
      task({ status: "done", domains: ["work"] }),
    ]);

    const health = day.pillars.find((p) => p.pillar === "health")!;
    expect(health).toMatchObject({ completed: 1, total: 2, score: 50 });

    const work = day.pillars.find((p) => p.pillar === "work")!;
    expect(work).toMatchObject({ completed: 1, total: 1, score: 100 });
  });

  it("keeps pillars with nothing scheduled neutral and out of the mean", () => {
    const day = computeDayScore(DATE, [task({ status: "done" })]);

    const idle = day.pillars.find((p) => p.pillar === "finance")!;
    expect(idle).toMatchObject({ completed: 0, total: 0, score: null });

    // Only health was active, so a perfect health day is a perfect day.
    expect(day.score).toBe(100);
  });

  it("averages active pillars with equal weight", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done" }),
      task({ status: "done", domains: ["work"] }),
      task({ status: "open", domains: ["work"] }),
    ]);
    // health 100, work 50 -> (100 + 50) / 2 = 75
    expect(day.score).toBe(75);
  });

  it("returns a null score when nothing was scheduled at all", () => {
    const day = computeDayScore(DATE, []);
    expect(day.score).toBeNull();
    expect(day.pillars).toHaveLength(5);
  });

  it("counts missed tasks as scheduled but not completed", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done" }),
      task({ status: "missed" }),
    ]);
    const health = day.pillars.find((p) => p.pillar === "health")!;
    expect(health).toMatchObject({ completed: 1, total: 2, score: 50 });
  });

  it("credits a retro-completed miss to its occurrence day", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done", occurrenceDate: DATE, dueDate: DATE }),
    ]);
    expect(day.score).toBe(100);
  });

  it("ignores skipped tasks and tasks belonging to other days", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done" }),
      task({ status: "skipped" }),
      task({ status: "open", dueDate: "2026-07-06" }),
    ]);
    const health = day.pillars.find((p) => p.pillar === "health")!;
    expect(health).toMatchObject({ completed: 1, total: 1, score: 100 });
  });

  it("counts a multi-pillar task once in each of its pillars", () => {
    const day = computeDayScore(DATE, [
      task({ status: "done", domains: ["health", "social"] }),
    ]);
    expect(
      day.pillars.find((p) => p.pillar === "health")
    ).toMatchObject({ completed: 1, total: 1 });
    expect(
      day.pillars.find((p) => p.pillar === "social")
    ).toMatchObject({ completed: 1, total: 1 });
  });

  it("ignores tasks with no pillar", () => {
    const day = computeDayScore(DATE, [task({ status: "done", domains: [] })]);
    expect(day.score).toBeNull();
  });
});

describe("computeScoreHistory", () => {
  it("returns one entry per day ending at the requested date", () => {
    const history = computeScoreHistory(DATE, 30, []);
    expect(history).toHaveLength(30);
    expect(history[0]!.date).toBe(addDays(DATE, -29));
    expect(history.at(-1)!.date).toBe(DATE);
  });

  it("attributes tasks to their own day only", () => {
    const history = computeScoreHistory(DATE, 3, [
      task({ status: "done", dueDate: addDays(DATE, -1) }),
      task({ status: "open" }),
    ]);
    expect(history.map((d) => d.score)).toEqual([null, 100, 0]);
  });

  it("crosses month boundaries when walking back", () => {
    const history = computeScoreHistory("2026-07-02", 4, []);
    expect(history.map((d) => d.date)).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
    ]);
  });
});
