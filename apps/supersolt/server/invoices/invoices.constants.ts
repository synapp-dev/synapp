/** Review statuses set by operators — never overwritten by Xero sync. */
export const OPERATOR_LOCKED_REVIEW_STATUSES = new Set([
  "confirmed",
  "disputed",
  "duplicate",
  "archived",
  "pending_approval",
]);

export function shouldPreserveReviewStatus(status: string | null | undefined): boolean {
  return status != null && OPERATOR_LOCKED_REVIEW_STATUSES.has(status);
}
