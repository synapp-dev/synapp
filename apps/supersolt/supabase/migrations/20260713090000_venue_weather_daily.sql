-- Daily weather per venue (Open-Meteo): actuals backfilled from archive, forward days from forecast.
-- Feeds the forecast weatherMultiplier (gated by WEATHER_FORECAST_ENABLED).

create table public.venue_weather_daily (
  venue_id uuid not null references public.venues(id) on delete cascade,
  date date not null,
  rain_mm numeric(6, 2) not null default 0,
  temp_max_c numeric(5, 2),
  temp_min_c numeric(5, 2),
  condition_bucket text not null,
  is_forecast boolean not null default false,
  source text not null default 'open-meteo',
  fetched_at timestamptz not null default now(),
  constraint venue_weather_daily_pkey primary key (venue_id, date)
);

create index venue_weather_daily_venue_date_idx
  on public.venue_weather_daily (venue_id, date desc);

alter table public.venue_weather_daily enable row level security;

create policy venue_weather_daily_select on public.venue_weather_daily
  for select to authenticated
  using (exists (
    select 1
    from public.venues v
    join public.user_organisations uo on uo.organisation_id = v.organisation_id
    where v.id = venue_weather_daily.venue_id
      and uo.user_profile_id = (select auth.uid())
      and uo.is_active = true
      and uo.archived_at is null
  ));
