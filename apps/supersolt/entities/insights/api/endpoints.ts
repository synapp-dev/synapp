export function insightsAlertsEndpoint(
  organisationSlug: string,
  venueSlug: string,
  module?: string,
): string {
  const base = `/api/organisations/${organisationSlug}/venues/${venueSlug}/insights/alerts`;
  if (!module) {
    return base;
  }
  const params = new URLSearchParams({ module });
  return `${base}?${params.toString()}`;
}

export function insightsAlertDismissEndpoint(
  organisationSlug: string,
  venueSlug: string,
  alertId: string,
): string {
  return `/api/organisations/${organisationSlug}/venues/${venueSlug}/insights/alerts/${alertId}`;
}
