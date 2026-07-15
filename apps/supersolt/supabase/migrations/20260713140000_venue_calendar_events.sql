-- Operator-entered calendar events (closures, promotions, one-off events, price/menu changes).
-- Feeds the forecast engine: closures force a zero forecast and are excluded from baselines;
-- price/menu changes act as a level-shift floor; promotions/events apply an optional expected
-- multiplier and widen the confidence band. Also surfaced in the morning digest.

create table public.venue_calendar_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  kind text not null,
  start_date date not null,
  end_date date not null,
  title text not null,
  note text,
  expected_multiplier numeric(5, 3),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_calendar_events_kind_chk
    check (kind = any (array['closure', 'promotion', 'event', 'price_change', 'menu_change'])),
  constraint venue_calendar_events_dates_chk check (end_date >= start_date),
  constraint venue_calendar_events_multiplier_chk
    check (expected_multiplier is null or (expected_multiplier > 0 and expected_multiplier <= 5))
);

create index venue_calendar_events_venue_dates_idx
  on public.venue_calendar_events (venue_id, start_date, end_date);

alter table public.venue_calendar_events enable row level security;

create policy venue_calendar_events_select on public.venue_calendar_events
  for select to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = venue_calendar_events.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create policy venue_calendar_events_insert on public.venue_calendar_events
  for insert to authenticated
  with check (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = venue_calendar_events.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create policy venue_calendar_events_update on public.venue_calendar_events
  for update to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = venue_calendar_events.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create policy venue_calendar_events_delete on public.venue_calendar_events
  for delete to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = venue_calendar_events.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));
