import { describe, expect, it } from "vitest";
import {
  estimateSessionMinutes,
  exerciseCountForMinutes,
  exerciseSeconds,
  type DurationRow,
} from "./duration";
import { SESSION_DEFAULTS } from "@/entities/gym/model/types";

const defaultRow: DurationRow = {
  warmupSets: SESSION_DEFAULTS.warmupSets,
  workingSets: SESSION_DEFAULTS.workingSets,
  dropSets: SESSION_DEFAULTS.dropSets,
  restSeconds: null,
};

describe("duration math", () => {
  it("puts a default-structured exercise around 11-12 minutes", () => {
    const minutes = exerciseSeconds(defaultRow) / 60;
    expect(minutes).toBeGreaterThanOrEqual(11);
    expect(minutes).toBeLessThanOrEqual(12);
  });

  it("maps target durations to sensible exercise counts", () => {
    expect(exerciseCountForMinutes(30)).toBe(3);
    expect(exerciseCountForMinutes(45)).toBe(4);
    expect(exerciseCountForMinutes(60)).toBe(5);
    expect(exerciseCountForMinutes(90)).toBe(8);
  });

  it("clamps counts to the 2..10 range", () => {
    expect(exerciseCountForMinutes(1)).toBe(2);
    expect(exerciseCountForMinutes(600)).toBe(10);
  });

  it("estimates a whole plan monotonically as rows are added", () => {
    const rows: DurationRow[] = [];
    let prev = 0;
    for (let n = 1; n <= 6; n++) {
      rows.push(defaultRow);
      const est = estimateSessionMinutes(rows);
      expect(est).toBeGreaterThan(prev);
      prev = est;
    }
  });
});
