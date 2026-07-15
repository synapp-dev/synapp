import type { WeatherBucket } from "@/server/weather/weather-buckets";

export type WeatherIconKind =
  | "sun"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow";

export const WEATHER_KIND_LABELS: Record<WeatherIconKind, string> = {
  sun: "Sunny",
  partly_cloudy: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  drizzle: "Light rain",
  rain: "Rain",
  storm: "Storm",
  snow: "Snow",
};

/** WMO interpretation codes (Open-Meteo `weather_code`) to an icon kind. */
function kindFromWmoCode(code: number): WeatherIconKind | null {
  if (code === 0) return "sun";
  if (code === 1 || code === 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return null;
}

/** Rain-bucket fallback for rows ingested before weather_code was stored. */
function kindFromBucket(bucket: WeatherBucket): WeatherIconKind {
  switch (bucket) {
    case "heavy_rain":
      return "rain";
    case "light_rain":
      return "drizzle";
    default:
      return "sun";
  }
}

export function weatherIconKind(args: {
  weatherCode: number | null;
  bucket: WeatherBucket;
}): WeatherIconKind {
  if (args.weatherCode !== null) {
    const kind = kindFromWmoCode(args.weatherCode);
    if (kind) {
      return kind;
    }
  }
  return kindFromBucket(args.bucket);
}
