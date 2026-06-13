import { evaluateReadinessChecks } from "@/server/readiness/evaluate-readiness-checks";
import type { ReadinessVenueCounts } from "@/server/readiness/readiness.repo";
import { describe, expect, it } from "vitest";

describe("evaluateReadinessChecks", () => {
  it("requires at least one supplier", () => {
    const checks = evaluateReadinessChecks({
      supplierCount: 0,
      mappedIngredientCount: 0,
      venueStaffCount: 0,
    });
    expect(checks.has_suppliers).toBe(false);
  });

  it("marks core green when spine data exists", () => {
    const checks = evaluateReadinessChecks({
      supplierCount: 2,
      mappedIngredientCount: 3,
      venueStaffCount: 4,
    } satisfies ReadinessVenueCounts);
    expect(checks.has_suppliers).toBe(true);
    expect(checks.has_mapped_ingredients).toBe(true);
    expect(checks.has_team_members).toBe(true);
  });

  it("requires two venue staff members for roster readiness", () => {
    const checks = evaluateReadinessChecks({
      supplierCount: 1,
      mappedIngredientCount: 1,
      venueStaffCount: 1,
    });
    expect(checks.has_team_members).toBe(false);
  });
});
