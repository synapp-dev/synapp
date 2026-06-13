-- Xero OAuth tokens per venue (org admins only; tokens are sensitive — RLS limits exposure).

CREATE TABLE public.venue_xero_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  xero_tenant_id text NOT NULL,
  xero_tenant_name text,
  xero_access_token text NOT NULL,
  xero_refresh_token text NOT NULL,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_xero_connections_venue_uq UNIQUE (venue_id)
);

CREATE INDEX venue_xero_connections_org_idx ON public.venue_xero_connections (organisation_id);

ALTER TABLE public.venue_xero_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_xero_connections_select ON public.venue_xero_connections
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organisation_id));

CREATE POLICY venue_xero_connections_insert ON public.venue_xero_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY venue_xero_connections_update ON public.venue_xero_connections
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organisation_id))
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY venue_xero_connections_delete ON public.venue_xero_connections
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organisation_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_xero_connections TO authenticated;
