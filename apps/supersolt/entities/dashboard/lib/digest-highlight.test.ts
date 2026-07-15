import { describe, expect, it } from "vitest";

import { segmentDigestLine } from "@/entities/dashboard/lib/digest-highlight";

function highlighted(line: string): string[] {
  return segmentDigestLine(line)
    .filter((s) => s.highlight)
    .map((s) => s.text);
}

describe("segmentDigestLine", () => {
  it("highlights dollars, percentages, and bare counts", () => {
    expect(
      highlighted("Yesterday closed at $3,561, a 98% miss across 581 invoices."),
    ).toEqual(["$3,561", "98%", "581"]);
  });

  it("highlights date shapes without splitting them", () => {
    expect(highlighted("Oldest dates back to August 2025.")).toEqual([
      "August 2025",
    ]);
    expect(highlighted("Confirm the venue was open on 2026-07-12.")).toEqual([
      "2026-07-12",
    ]);
    expect(highlighted("The July 4 spike ($5k) stood out.")).toEqual([
      "July 4",
      "$5k",
    ]);
  });

  it("reassembles to the original line", () => {
    const line = "COGS sits at 23.6%, down 1.2 pts on $21,216 revenue.";
    expect(
      segmentDigestLine(line)
        .map((s) => s.text)
        .join(""),
    ).toBe(line);
  });

  it("returns a single plain segment when nothing matches", () => {
    expect(segmentDigestLine("No numbers here.")).toEqual([
      { text: "No numbers here.", highlight: false },
    ]);
  });
});
