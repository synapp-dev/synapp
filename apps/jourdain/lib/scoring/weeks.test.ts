import { describe, expect, it } from "vitest";
import type { DayScore } from "./compute";
import {
  addWeeks,
  averageScore,
  currentStreak,
  dayDiff,
  pillarWeekTotals,
  weekDates,
  weekEndOf,
  weekStartOf,
} from "./weeks";

describe("dayDiff", () => {
  it("counts whole days, signed", () => {
    expect(dayDiff("2026-07-01", "2026-07-07")).toBe(6);
    expect(dayDiff("2026-07-07", "2026-07-01")).toBe(-6);
    expect(dayDiff("2026-07-07", "2026-07-07")).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(dayDiff("2026-06-29", "2026-07-01")).toBe(2);
    expect(dayDiff("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the containing week", () => {
    expect(weekStartOf("2026-07-07")).toBe("2026-07-06"); // Tuesday
    expect(weekStartOf("2026-07-06")).toBe("2026-07-06"); // Monday itself
    expect(weekStartOf("2026-07-12")).toBe("2026-07-06"); // Sunday
  });

  it("steps back across month boundaries", () => {
    expect(weekStartOf("2026-07-01")).toBe("2026-06-29"); // Wednesday
  });
});

describe("addWeeks / weekEndOf / weekDates", () => {
  it("shifts by whole weeks", () => {
    expect(addWeeks("2026-07-06", -1)).toBe("2026-06-29");
    expect(addWeeks("2026-07-06", 1)).toBe("2026-07-13");
  });

  it("ends the week on Sunday", () => {
    expect(weekEndOf("2026-07-06")).toBe("2026-07-12");
  });

  it("lists Monday through Sunday", () => {
    const dates = weekDates("2026-07-06");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-07-06");
    expect(dates[6]).toBe("2026-07-12");
  });
});

describe("averageScore", () => {
  it("averages only scored days", () => {
    expect(
      averageScore([
        { date: "a", score: 100 },
        { date: "b", score: null },
        { date: "c", score: 50 },
      ])
    ).toBe(75);
  });

  it("returns null when nothing was scored", () => {
    expect(averageScore([{ date: "a", score: null }])).toBeNull();
    expect(averageScore([])).toBeNull();
  });
});

describe("currentStreak", () => {
  const day = (score: number | null, date = "x") => ({ date, score });

  it("counts consecutive days at or above the threshold from the end", () => {
    expect(currentStreak([day(30), day(80), day(50), day(100)])).toBe(3);
  });

  it("breaks on a day below the threshold", () => {
    expect(currentStreak([day(90), day(20), day(90)])).toBe(1);
  });

  it("skips neutral days without breaking or counting", () => {
    expect(currentStreak([day(80), day(null), day(60), day(null)])).toBe(2);
  });

  it("is zero with no qualifying days", () => {
    expect(currentStreak([day(null), day(10)])).toBe(0);
    expect(currentStreak([])).toBe(0);
  });

  it("skips today's in-progress sub-threshold score", () => {
    expect(
      currentStreak(
        [day(80, "2026-07-05"), day(90, "2026-07-06"), day(0, "2026-07-07")],
        50,
        "2026-07-07"
      )
    ).toBe(2);
  });

  it("counts today when it is at or above the threshold", () => {
    expect(
      currentStreak(
        [day(80, "2026-07-06"), day(60, "2026-07-07")],
        50,
        "2026-07-07"
      )
    ).toBe(2);
  });

  it("still breaks on a past sub-threshold day", () => {
    expect(
      currentStreak(
        [day(90, "2026-07-05"), day(20, "2026-07-06"), day(70, "2026-07-07")],
        50,
        "2026-07-07"
      )
    ).toBe(1);
  });
});

describe("pillarWeekTotals", () => {
  const dayScore = (
    date: string,
    entries: Partial<Record<string, [number, number]>>
  ): DayScore => ({
    date,
    score: null,
    pillars: (
      ["identity", "health", "work", "social", "finance"] as const
    ).map((pillar) => {
      const [completed, total] = entries[pillar] ?? [0, 0];
      return {
        pillar,
        completed,
        total,
        score: total > 0 ? Math.round((completed / total) * 100) : null,
      };
    }),
  });

  it("sums completed and total per pillar across days", () => {
    const totals = pillarWeekTotals([
      dayScore("2026-07-06", { health: [1, 2], work: [1, 1] }),
      dayScore("2026-07-07", { health: [2, 2] }),
    ]);

    const health = totals.find((p) => p.pillar === "health")!;
    expect(health).toMatchObject({ completed: 3, total: 4, score: 75 });

    const work = totals.find((p) => p.pillar === "work")!;
    expect(work).toMatchObject({ completed: 1, total: 1, score: 100 });
  });

  it("keeps untouched pillars neutral", () => {
    const totals = pillarWeekTotals([dayScore("2026-07-06", {})]);
    for (const pillar of totals) {
      expect(pillar.score).toBeNull();
    }
  });
});
