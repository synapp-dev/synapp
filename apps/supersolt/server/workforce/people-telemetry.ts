export type PeopleTelemetryEvent =
  | "people.viewed"
  | "people.employee_created"
  | "people.employee_terminated"
  | "people.pay_rate_changed"
  | "people.xero_import_completed"
  | "people.compliance_warning"
  | "people.sensitive_access"
  | "people.failed";

export function trackPeopleEvent(
  event: PeopleTelemetryEvent,
  payload: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[people.telemetry]", event, payload);
  }
}
