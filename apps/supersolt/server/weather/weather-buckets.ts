export const WEATHER_BUCKETS = ["dry", "light_rain", "heavy_rain"] as const;

export type WeatherBucket = (typeof WEATHER_BUCKETS)[number];

const LIGHT_RAIN_MIN_MM = 1;
const HEAVY_RAIN_MIN_MM = 6;

/** Coarse buckets on daily rainfall; kept to three so per-bucket samples stay meaningful. */
export function conditionBucketForRain(rainMm: number): WeatherBucket {
  if (rainMm >= HEAVY_RAIN_MIN_MM) {
    return "heavy_rain";
  }
  if (rainMm >= LIGHT_RAIN_MIN_MM) {
    return "light_rain";
  }
  return "dry";
}

export function isWeatherBucket(value: string): value is WeatherBucket {
  return (WEATHER_BUCKETS as readonly string[]).includes(value);
}
