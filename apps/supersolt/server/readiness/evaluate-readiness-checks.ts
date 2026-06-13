import type { ReadinessVenueCounts } from "@/server/readiness/readiness.repo";
import type { ReadinessCheckResults } from "@/server/readiness/readiness.errors";
import type { ReadinessCheckId } from "@/entities/readiness/model/types";

export function evaluateReadinessChecks(
  counts: ReadinessVenueCounts,
): ReadinessCheckResults {
  return {
    has_suppliers: counts.supplierCount >= 1,
    has_mapped_ingredients: counts.mappedIngredientCount >= 1,
    has_team_members: counts.venueStaffCount >= 2,
  };
}

export function isCheckSatisfied(
  checks: ReadinessCheckResults,
  checkId: ReadinessCheckId,
): boolean {
  return checks[checkId] === true;
}

export function isCoreGreen(checks: ReadinessCheckResults): boolean {
  return (
    checks.has_suppliers &&
    checks.has_mapped_ingredients &&
    checks.has_team_members
  );
}
