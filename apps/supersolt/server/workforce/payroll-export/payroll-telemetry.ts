export type PayrollTelemetryEvent =
  | "payroll.viewed"
  | "payroll.prepared"
  | "payroll.preflight_blocked"
  | "payroll.calculated"
  | "payroll.submitted_for_approval"
  | "payroll.returned_by_owner"
  | "payroll.approved"
  | "payroll.xero_push_started"
  | "payroll.xero_push_failed"
  | "payroll.xero_webhook_received"
  | "payroll.reconciled"
  | "payroll.forbidden"
  | "payroll.failed";

export function trackPayrollEvent(
  event: PayrollTelemetryEvent,
  payload: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[payroll-telemetry]", event, payload);
  }
}
