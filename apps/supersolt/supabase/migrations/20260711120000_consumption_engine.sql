-- Consumption engine: fact immutability + cost, exception capture, waste entries

alter table public.ingredient_consumption_daily
  add column if not exists cost_cents bigint not null default 0,
  add column if not exists is_final boolean not null default false;

-- Grandfather previously computed closed days as final so history stops moving
update public.ingredient_consumption_daily set is_final = true where date < current_date;

create table public.consumption_exceptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  date date not null,
  kind text not null,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  detail jsonb not null default '{}'::jsonb,
  qty numeric,
  value_cents bigint,
  computed_at timestamptz not null default now(),
  constraint consumption_exceptions_kind_chk check (kind = any (array['unmapped_sale'::text, 'empty_recipe'::text, 'missing_modifier_recipe'::text, 'unit_conversion_failure'::text, 'recipe_cycle'::text]))
);

create index idx_consumption_exceptions_venue_date
  on public.consumption_exceptions (venue_id, date desc);

alter table public.consumption_exceptions enable row level security;

create policy consumption_exceptions_select on public.consumption_exceptions
  for select to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = consumption_exceptions.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create table public.waste_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  parent_entry_id uuid references public.waste_entries(id) on delete cascade,
  qty numeric not null,
  unit text not null,
  qty_base_units numeric,
  cost_cents bigint not null default 0,
  reason text not null,
  note text,
  source text not null default 'manual',
  occurred_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint waste_entries_target_chk check (ingredient_id is not null or recipe_id is not null),
  constraint waste_entries_reason_chk check (reason = any (array['spoilage'::text, 'prep_error'::text, 'breakage'::text, 'theft'::text, 'correction'::text, 'other'::text])),
  constraint waste_entries_source_chk check (source = any (array['manual'::text, 'batch_explosion'::text]))
);

create index idx_waste_entries_venue_occurred
  on public.waste_entries (venue_id, occurred_at desc);
create index idx_waste_entries_parent
  on public.waste_entries (parent_entry_id) where parent_entry_id is not null;

alter table public.waste_entries enable row level security;

create policy waste_entries_select on public.waste_entries
  for select to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = waste_entries.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create policy waste_entries_insert on public.waste_entries
  for insert to authenticated
  with check (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = waste_entries.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));

create policy waste_entries_delete on public.waste_entries
  for delete to authenticated
  using (exists (
    select 1 from public.user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = waste_entries.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));
