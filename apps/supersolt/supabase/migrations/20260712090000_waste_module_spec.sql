-- Waste module to Notion spec: expanded reason taxonomy, dispute status,
-- audit trail, and an RLS update policy (manager edits were impossible
-- without one). NOT YET APPLIED to supabase-fclph; apply before shipping
-- the edit/dispute UI or expanded reasons.

alter table public.waste_entries drop constraint waste_entries_reason_chk;
alter table public.waste_entries add constraint waste_entries_reason_chk check (
  reason = any (array[
    'spoilage'::text,
    'prep_error'::text,
    'customer_return'::text,
    'overcooked'::text,
    'dropped'::text,
    'over_portioning'::text,
    'expired'::text,
    'training'::text,
    'end_of_day'::text,
    'breakage'::text,
    'theft'::text,
    'correction'::text,
    'other'::text
  ])
);

alter table public.waste_entries add column status text not null default 'active';
alter table public.waste_entries add constraint waste_entries_status_chk check (
  status = any (array['active'::text, 'disputed'::text])
);
alter table public.waste_entries add column dispute_reason text;
alter table public.waste_entries add column disputed_by uuid references public.user_profiles(id) on delete set null;
alter table public.waste_entries add column disputed_at timestamptz;
alter table public.waste_entries add column audit_log jsonb not null default '[]'::jsonb;

create policy waste_entries_update on public.waste_entries
  for update to authenticated
  using (exists (
    select 1 from user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = waste_entries.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ))
  with check (exists (
    select 1 from user_organisations uo
    where uo.user_profile_id = (select auth.uid())
      and uo.organisation_id = waste_entries.organisation_id
      and uo.is_active = true
      and uo.archived_at is null
  ));
