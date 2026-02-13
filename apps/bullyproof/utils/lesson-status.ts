/**
 * Get the display status for a lesson.
 * If the lesson status is 'ready' and has a scheduledFor time:
 * - Future → display as 'scheduled'
 * - Past → display as 'overdue'
 *
 * @param status - The actual lesson status from the database
 * @param scheduledFor - The scheduled date/time string (ISO format) or null/undefined
 * @returns The status to display in the UI
 */
export function getDisplayStatus(
  status: string,
  scheduledFor?: string | null
): string {
  if (status === "ready" && scheduledFor) {
    try {
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();
      if (scheduledDate > now) return "scheduled";
      if (scheduledDate <= now) return "overdue";
    } catch (e) {
      console.warn("Failed to parse scheduledFor date:", scheduledFor, e);
    }
  }

  return status;
}

/** Status color configuration for lesson UI (badges, borders, dots) */
export const statusColors: Record<
  string,
  { bg: string; dot: string; border: string }
> = {
  preparing: { bg: "bg-yellow-500/10", dot: "bg-yellow-500", border: "border-yellow-500" },
  ready: { bg: "bg-green-500/10", dot: "bg-green-500", border: "border-green-500" },
  scheduled: { bg: "bg-blue-500/10", dot: "bg-blue-500", border: "border-blue-500" },
  overdue: { bg: "bg-orange-500/10", dot: "bg-orange-500", border: "border-orange-500" },
  in_progress: { bg: "bg-orange-500/10", dot: "bg-orange-500", border: "border-orange-500" },
  feedback: { bg: "bg-purple-500/10", dot: "bg-purple-500", border: "border-purple-500" },
  completed: { bg: "bg-gray-500/10", dot: "bg-gray-500", border: "border-gray-500" },
  cancelled: { bg: "bg-red-500/10", dot: "bg-red-500", border: "border-red-500" },
};

export function getStatusColors(
  status: string
): { bg: string; dot: string; border: string } {
  return (
    statusColors[status] || {
      bg: "bg-gray-500/10",
      dot: "bg-gray-500",
      border: "border-gray-500",
    }
  );
}
