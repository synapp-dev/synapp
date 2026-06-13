export type TimesheetTelemetryEvent =
  | "timesheets.viewed"
  | "timesheets.clock_in"
  | "timesheets.clock_out"
  | "timesheets.auto_clock_out"
  | "timesheets.approved"
  | "timesheets.bulk_approved"
  | "timesheets.disputed"
  | "timesheets.dispute_resolved"
  | "timesheets.edited"
  | "timesheets.period_closed"
  | "timesheets.locked"
  | "timesheets.forbidden"
  | "timesheets.failed";

export function trackTimesheetEvent(
  event: TimesheetTelemetryEvent,
  payload: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[timesheet-telemetry]", event, payload);
  }
}
