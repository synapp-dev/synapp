/**
 * Get the display status for a lesson.
 * If the lesson status is 'ready' and has a scheduledFor time in the future,
 * it will display as 'scheduled' in the UI.
 * 
 * @param status - The actual lesson status from the database
 * @param scheduledFor - The scheduled date/time string (ISO format) or null/undefined
 * @returns The status to display in the UI
 */
export function getDisplayStatus(
  status: string,
  scheduledFor?: string | null
): string {
  // If status is 'ready' and has a scheduled time in the future, show as 'scheduled'
  if (status === "ready" && scheduledFor) {
    try {
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();
      if (scheduledDate > now) {
        return "scheduled";
      }
    } catch (e) {
      // If date parsing fails, just return the actual status
      console.warn("Failed to parse scheduledFor date:", scheduledFor, e);
    }
  }
  
  return status;
}
