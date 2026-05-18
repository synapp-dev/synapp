/** Serializable dashboard prefs (server + client). */
export type DashboardPreferencesRow = {
  timeWindow: string;
  venueScopeMode: string;
  selectedVenueIds: string[] | null;
  customRangeStart: string | null;
  customRangeEnd: string | null;
  updatedAt: string;
};
