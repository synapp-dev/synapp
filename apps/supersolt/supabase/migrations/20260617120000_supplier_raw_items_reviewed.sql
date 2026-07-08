-- Per-item "approved" review state for the supplier Items step.
-- When a user confirms an extracted raw item looks correct against its source
-- invoice, we stamp reviewed_at/reviewed_by. Nullable + additive.
ALTER TABLE public.supplier_raw_items
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
