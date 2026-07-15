alter table public.venue_invoices
  add column if not exists setup_import boolean not null default false;

comment on column public.venue_invoices.setup_import is
  'True when the invoice was ingested to seed the supplier catalog during inventory setup. These never enter the pending-review queue; only invoices arriving after setup (e.g. against a sent purchase order) do.';

-- Backfill: bills synced from Xero to build the supplier catalog are still
-- sitting in pending_review with no linked PO. Flag them and take them out
-- of the review queue.
update public.venue_invoices
set setup_import = true,
    review_status = 'archived',
    updated_at = now()
where source = 'xero'
  and review_status = 'pending_review'
  and purchase_order_id is null;
