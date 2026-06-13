export type StockCountsTelemetryEvent =
  | "stock_counts.viewed"
  | "stock_counts.created"
  | "stock_counts.entry_saved"
  | "stock_counts.submitted"
  | "stock_counts.approved"
  | "stock_counts.rejected"
  | "stock_counts.recount_requested"
  | "stock_counts.reopened"
  | "stock_counts.schedule_created"
  | "stock_counts.scheduled_spawned"
  | "stock_counts.reminder_overdue"
  | "stock_counts.export_csv"
  | "stock_counts.failed";

export function trackStockCountsEvent(
  event: StockCountsTelemetryEvent,
  payload: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[stock-counts-telemetry]", event, payload);
  }
}
