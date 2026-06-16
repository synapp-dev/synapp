import { describe, expect, it } from "vitest";
import {
  evaluateBenchmark,
  evaluateRetry,
  proposeBenchmark,
  setE1rm,
} from "./benchmark";
import type { StandardsRow } from "@/entities/gym/model/types";

// [bodyweight, beginner, novice, intermediate, advanced, elite] (kg).
const STANDARDS: StandardsRow[] = [[80, 40, 60, 85, 115, 150]];

describe("proposeBenchmark", () => {
  it("seeds near the beginner level from standards", () => {
    const p = proposeBenchmark({ standardsRows: STANDARDS, bodyweight: 80, isBodyweight: false });
    expect(p.basis).toBe("standards");
    // beginner 1RM 40 → weight for 8 reps ≈ 40 / (1 + 8/30) ≈ 31.6 kg.
    expect(p.weight).toBeGreaterThan(25);
    expect(p.weight).toBeLessThan(40);
  });

  it("falls back to asking when there are no standards", () => {
    const p = proposeBenchmark({ standardsRows: null, bodyweight: 80, isBodyweight: false });
    expect(p.basis).toBe("ask");
    expect(p.weight).toBeNull();
  });

  it("subtracts bodyweight for bodyweight movements", () => {
    const p = proposeBenchmark({ standardsRows: STANDARDS, bodyweight: 80, isBodyweight: true });
    // beginner total 40 < bodyweight 80 ⇒ assisted (negative added weight).
    expect(p.weight).toBeLessThan(0);
  });
});

describe("evaluateBenchmark", () => {
  it("locks in a set inside the reliable rep range", () => {
    const v = evaluateBenchmark({ weight: 40, reps: 8, isBodyweight: false, bodyweight: 80 })!;
    expect(v.quality).toBe("good");
    expect(v.retryWeight).toBeNull();
    expect(v.workingWeight).toBeGreaterThan(0);
  });

  it("flags a too-light set and suggests a heavier retry with rest", () => {
    const v = evaluateBenchmark({ weight: 20, reps: 25, isBodyweight: false, bodyweight: 80 })!;
    expect(v.quality).toBe("too_light");
    expect(v.retryWeight!).toBeGreaterThan(20);
    expect(v.restBeforeRetry).toBe(true);
  });

  it("flags a too-heavy set and suggests a lighter retry", () => {
    const v = evaluateBenchmark({ weight: 100, reps: 2, isBodyweight: false, bodyweight: 80 })!;
    expect(v.quality).toBe("too_heavy");
    expect(v.retryWeight!).toBeLessThan(100);
  });
});

describe("evaluateRetry", () => {
  it("corrects the retry estimate upward for fatigue, but within the cap", () => {
    const raw = setE1rm({ weight: 30, reps: 8, isBodyweight: false, bodyweight: 80 })!;
    const v = evaluateRetry({
      retryWeight: 30,
      retryReps: 8,
      priorReps: 25,
      isBodyweight: false,
      bodyweight: 80,
    })!;
    expect(v.e1rm).toBeGreaterThan(raw); // nudged up for fatigue
    expect(v.e1rm).toBeLessThanOrEqual(raw * 1.08 + 0.1); // ≤ 8% cap
  });
});
