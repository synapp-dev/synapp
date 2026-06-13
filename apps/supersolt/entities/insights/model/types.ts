export type InsightsDatePreset =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "custom";

export type InsightsDateRange = {
  start: Date;
  end: Date;
};

export type InsightsAlertModule = "sales" | "labour" | "inventory" | "forecast";

export type InsightsAlertSeverity = "urgent" | "notable" | "informational";

export type InsightsAlertRow = {
  id: string;
  organisationId: string;
  venueId: string | null;
  module: InsightsAlertModule;
  severity: InsightsAlertSeverity;
  headline: string;
  supportingMetric: string | null;
  destinationKey: string | null;
  destinationPayload: Record<string, unknown> | null;
  detectedAt: string;
  expiresAt: string | null;
};
