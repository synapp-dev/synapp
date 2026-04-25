-- Square OAuth tokens per venue (org admins only; tokens are sensitive — RLS limits exposure).

CREATE TABLE public.venue_square_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  square_merchant_id text NOT NULL,
  square_access_token text NOT NULL,
  square_refresh_token text NOT NULL,
  token_expires_at timestamptz,
  environment text NOT NULL,
  square_location_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_square_connections_environment_chk CHECK (environment IN ('sandbox', 'production')),
  CONSTRAINT venue_square_connections_venue_uq UNIQUE (venue_id)
);

CREATE INDEX venue_square_connections_org_idx ON public.venue_square_connections (organisation_id);

ALTER TABLE public.venue_square_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_square_connections_select ON public.venue_square_connections
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organisation_id));

CREATE POLICY venue_square_connections_insert ON public.venue_square_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY venue_square_connections_update ON public.venue_square_connections
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organisation_id))
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY venue_square_connections_delete ON public.venue_square_connections
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organisation_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_square_connections TO authenticated;
