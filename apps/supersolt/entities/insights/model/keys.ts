export const insightsAlertKeys = {
  all: ["insights-alerts"] as const,
  list: (
    organisationSlug: string,
    venueSlug: string,
    module?: string,
  ) =>
    [...insightsAlertKeys.all, organisationSlug, venueSlug, module ?? "all"] as const,
};
