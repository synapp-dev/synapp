-- Persist Square order-line variation names and modifiers in the sales mirror
-- so item analytics can show sizes and add-ons without live API calls.
-- modifiers: jsonb array of { name, quantity, amountCents, catalogObjectId }.
alter table public.venue_square_order_lines
  add column if not exists variation_name text,
  add column if not exists modifiers jsonb;
