export const forecastKeys = {
  all: ["forecast"] as const,
  dailySales: (org: string, venue: string, from: string, to: string) =>
    [...forecastKeys.all, "daily-sales", org, venue, from, to] as const,
  forecasts: (org: string, venue: string, from: string, to: string) =>
    [...forecastKeys.all, "forecasts", org, venue, from, to] as const,
};
