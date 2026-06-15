-- Inventory-setup flow rework — additive columns.
-- See apps/supersolt/docs/features/inventory-setup/flow-rework-handoff.md.
--
-- All additive and idempotent (IF NOT EXISTS); applied against the live DB via
-- the Supabase MCP and mirrored into apps/supersolt/drizzle/schema.ts. This file
-- exists so other environments pick the columns up.
--
--   1. is_likely_inventory — per-line AI classification (real stockable product
--      vs. invoice-reference / freight / summary noise), captured at parse time
--      on invoice line items and carried onto the aggregated supplier raw items
--      (true wins on dedupe). Powers the Items step's two-table split.
--   2. suppliers.details_source_invoice_date — the invoice date the supplier's
--      contact/address details were last enriched from, so the most-recent
--      invoice wins when back-filling ABN / email / phone / address.
--   3. suppliers.is_inventory_source — whether this supplier actually delivers
--      inventory. Set by the post-sync selection gate; only these suppliers'
--      invoices get AI-parsed. Defaults true to preserve pre-gate behaviour.

ALTER TABLE public.venue_invoice_line_items
  ADD COLUMN IF NOT EXISTS is_likely_inventory boolean;

ALTER TABLE public.supplier_raw_items
  ADD COLUMN IF NOT EXISTS is_likely_inventory boolean;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS details_source_invoice_date date;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_inventory_source boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.venue_invoice_line_items.is_likely_inventory IS
  'AI classification at parse time: true for real stockable products, false for non-inventory lines (invoice refs, freight, surcharges, totals). Null when not classified.';

COMMENT ON COLUMN public.supplier_raw_items.is_likely_inventory IS
  'Carried from the contributing invoice lines during aggregation; true wins on dedupe. Drives the supplier Items two-table split.';

COMMENT ON COLUMN public.suppliers.details_source_invoice_date IS
  'Invoice date the supplier contact/address details were last enriched from; guards most-recent-invoice-wins enrichment.';

COMMENT ON COLUMN public.suppliers.is_inventory_source IS
  'Whether this supplier delivers inventory. Set by the inventory-setup selection gate; only true suppliers'' invoices are AI-parsed. Defaults true.';
