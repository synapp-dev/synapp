/** Master switch for weather-aware forecasting (ingestion cron + forecast multiplier). */
export function isWeatherForecastEnabled(): boolean {
  return process.env.WEATHER_FORECAST_ENABLED === "true";
}
