-- Portion (piece) size for supplier products where the priced unit differs from
-- how the product is physically portioned — e.g. chicken breast priced per kg but
-- supplied as 160 g pieces. Captured from invoice "@160g" wording at normalisation
-- (extractPackHint), so the piece dimension isn't lost when the quantity variants
-- collapse into a single product. Nullable: most products portion in their pack unit.

ALTER TABLE public.supplier_products
  ADD COLUMN portion_size numeric,
  ADD COLUMN portion_unit text,
  ADD COLUMN portion_label text;

COMMENT ON COLUMN public.supplier_products.portion_size IS
  'Measurable content of one portion/piece in portion_unit (e.g. 160 for a 160g fillet). Null when the product is not piece-portioned.';
COMMENT ON COLUMN public.supplier_products.portion_unit IS
  'Unit of portion_size: g | kg | mL | L. Null when portion_size is null.';
COMMENT ON COLUMN public.supplier_products.portion_label IS
  'What one portion is called (e.g. "piece", "fillet"). Null when not piece-portioned.';
