-- purchase_order_number_sequences had RLS enabled with no policies (deny-all):
-- every first PO of the year failed at number allocation. Venue members
-- may read/insert/update their venue's sequence rows.
create policy purchase_order_number_sequences_all on public.purchase_order_number_sequences
  for all to authenticated
  using (exists (
    select 1 from public.venues v
    join public.user_organisations uo on uo.organisation_id = v.organisation_id
    where v.id = purchase_order_number_sequences.venue_id
      and uo.user_profile_id = (select auth.uid())
      and uo.is_active = true
      and uo.archived_at is null
  ))
  with check (exists (
    select 1 from public.venues v
    join public.user_organisations uo on uo.organisation_id = v.organisation_id
    where v.id = purchase_order_number_sequences.venue_id
      and uo.user_profile_id = (select auth.uid())
      and uo.is_active = true
      and uo.archived_at is null
  ));
