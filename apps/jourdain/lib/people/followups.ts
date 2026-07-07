import { differenceInDays, parseISO } from "date-fns";
import type { Person } from "@/entities/people/model/types";

// Server-safe twin of touchOverdueDays/isTouchOverdue in person-card.tsx (a
// client module that API routes can't call).

/** Days past the cadence; Infinity when never contacted, null when no cadence applies. */
export function followupOverdueDays(person: Person): number | null {
  if (!person.touchBaseDays) return null;
  if (!person.lastTouchAt) return Number.POSITIVE_INFINITY;
  return (
    differenceInDays(new Date(), parseISO(person.lastTouchAt)) -
    person.touchBaseDays
  );
}

export function isFollowupOverdue(person: Person): boolean {
  const overdue = followupOverdueDays(person);
  return overdue !== null && overdue > 0;
}
