-- Google account connections (Calendar integration).
-- Holds OAuth refresh tokens: RLS is enabled with NO policies, so neither anon
-- nor authenticated clients can ever read this table — access is exclusively
-- server-side via the service role.

CREATE TABLE IF NOT EXISTS public.google_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text NOT NULL,
  refresh_token text NOT NULL,
  jourdain_calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
