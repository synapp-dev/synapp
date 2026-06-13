-- Cache attachment parse results so we do not re-run LLM on every invoice open.

ALTER TABLE public.venue_invoices
  ADD COLUMN IF NOT EXISTS attachment_parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_parse_fingerprint text,
  ADD COLUMN IF NOT EXISTS attachment_parse_error text;
