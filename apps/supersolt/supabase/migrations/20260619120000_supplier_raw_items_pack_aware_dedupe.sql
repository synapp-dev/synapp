-- Make supplier raw-item dedupe pack-aware so the same product priced two ways
-- (e.g. "each" vs "bag") is kept as two rows instead of one overwriting the other.
alter table supplier_raw_items
  add column if not exists raw_unit_normalized text not null default '';

-- Backfill existing rows from their current raw_unit.
update supplier_raw_items
  set raw_unit_normalized = lower(btrim(coalesce(raw_unit, '')))
  where raw_unit_normalized = '';

-- Widen the dedupe key to include the normalised unit. The new key is strictly
-- more specific than the old (supplier_id, raw_description_normalized) one, so
-- it can never introduce a collision among already-unique rows.
alter table supplier_raw_items
  drop constraint if exists supplier_raw_items_supplier_dedupe_uq;

alter table supplier_raw_items
  add constraint supplier_raw_items_supplier_dedupe_uq
  unique (supplier_id, raw_description_normalized, raw_unit_normalized);
