import { describe, expect, it } from "vitest";
import {
  confidenceFromHistoryDays,
  isForecastReady,
} from "@/server/forecast/forecast-confidence";

describe("forecast-confidence", () => {
  it("returns null below 14 days", () => {
    expect(confidenceFromHistoryDays(0)).toBeNull();
    expect(confidenceFromHistoryDays(13)).toBeNull();
  });

  it("graduates Low, Medium, High", () => {
    expect(confidenceFromHistoryDays(14)).toBe("low");
    expect(confidenceFromHistoryDays(27)).toBe("low");
    expect(confidenceFromHistoryDays(28)).toBe("medium");
    expect(confidenceFromHistoryDays(41)).toBe("medium");
    expect(confidenceFromHistoryDays(42)).toBe("high");
  });

  it("forecast ready at 14+ days", () => {
    expect(isForecastReady(13)).toBe(false);
    expect(isForecastReady(14)).toBe(true);
  });
});
