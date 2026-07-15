-- Cached Superbot digests per venue: generated text is frozen until the
-- grounding data changes materially (hash mismatch) or a user forces refresh.

create table public.venue_digest_cache (
  venue_id uuid not null references public.venues(id) on delete cascade,
  kind text not null default 'dashboard',
  digest text not null,
  grounding_hash text not null,
  generated_at timestamptz not null default now(),
  constraint venue_digest_cache_pkey primary key (venue_id, kind)
);

alter table public.venue_digest_cache enable row level security;

create policy venue_digest_cache_select on public.venue_digest_cache
  for select to authenticated
  using (exists (
    select 1
    from public.venues v
    join public.user_organisations uo on uo.organisation_id = v.organisation_id
    where v.id = venue_digest_cache.venue_id
      and uo.user_profile_id = (select auth.uid())
      and uo.is_active = true
      and uo.archived_at is null
  ));
