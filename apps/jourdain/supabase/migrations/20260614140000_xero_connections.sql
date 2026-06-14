-- Xero account connections (Finance integration).
-- Holds OAuth access + refresh tokens: RLS is enabled with NO policies, so
-- neither anon nor authenticated clients can ever read this table — access is
-- exclusively server-side via the service role.

CREATE TABLE IF NOT EXISTS public.xero_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xero_tenant_id text NOT NULL,
  xero_tenant_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;
