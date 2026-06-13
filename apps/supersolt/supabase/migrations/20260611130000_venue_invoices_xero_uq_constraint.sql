-- Restore a full UNIQUE constraint on (venue_id, xero_invoice_id) so Drizzle
-- ON CONFLICT (venue_id, xero_invoice_id) matches. The partial unique index from
-- 20260529120000 breaks upserts (Postgres 42P10). Nullable xero_invoice_id is
-- still allowed; multiple NULLs remain distinct under standard UNIQUE.

DROP INDEX IF EXISTS public.venue_invoices_venue_xero_uq;

ALTER TABLE public.venue_invoices
  ADD CONSTRAINT venue_invoices_venue_xero_uq UNIQUE (venue_id, xero_invoice_id);
