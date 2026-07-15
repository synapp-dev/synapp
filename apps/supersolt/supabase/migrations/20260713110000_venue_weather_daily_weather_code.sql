-- WMO weather code (Open-Meteo weather_code daily variable) so the UI can show
-- sunny / partly cloudy / overcast / fog / rain / storm icons, not just rain buckets.

alter table public.venue_weather_daily
  add column if not exists weather_code smallint;
