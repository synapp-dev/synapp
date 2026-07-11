-- Snapshot supplier-catalog language onto PO lines at creation time
alter table public.purchase_order_lines
  add column if not exists sku_code text,
  add column if not exists pack_label text,
  add column if not exists units_per_pack numeric,
  add column if not exists pack_unit text;
