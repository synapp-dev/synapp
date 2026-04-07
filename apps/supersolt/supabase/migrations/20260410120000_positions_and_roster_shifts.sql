-- Roster positions (venue job stations) separate from public.roles (access / permissions).
-- roster_shifts stores scheduled shifts per staff member and week.

-- ---------------------------------------------------------------------------
-- 1. positions
-- ---------------------------------------------------------------------------
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  slug text NOT NULL,
  display_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positions_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT positions_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)
);

CREATE UNIQUE INDEX positions_venue_slug_uq
  ON public.positions (venue_id, slug)
  WHERE archived_at IS NULL;

CREATE INDEX positions_venue_list_idx
  ON public.positions (venue_id)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Seed default positions for every active venue
-- ---------------------------------------------------------------------------
INSERT INTO public.positions (organisation_id, venue_id, slug, display_name, sort_order)
SELECT v.organisation_id, v.id, s.slug, s.display_name, s.sort_order
FROM public.venues v
CROSS JOIN (
  VALUES
    ('chef', 'Chef', 10),
    ('sous', 'Sous', 20),
    ('cdp', 'CDP', 30),
    ('foh', 'FOH', 40),
    ('bar', 'Bar', 50),
    ('host', 'Host', 60),
    ('manager', 'Manager', 70)
) AS s(slug, display_name, sort_order)
WHERE v.archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. user_venues.default_position_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_venues
  ADD COLUMN default_position_id uuid REFERENCES public.positions (id) ON DELETE SET NULL;

CREATE INDEX user_venues_default_position_idx
  ON public.user_venues (default_position_id)
  WHERE archived_at IS NULL AND default_position_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_user_venues_default_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.default_position_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.positions p
    WHERE p.id = NEW.default_position_id
      AND p.venue_id = NEW.venue_id
      AND p.organisation_id = NEW.organisation_id
      AND p.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'default_position_id must reference an active position for this venue';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_venues_validate_default_position ON public.user_venues;
CREATE TRIGGER user_venues_validate_default_position
  BEFORE INSERT OR UPDATE OF default_position_id, venue_id, organisation_id ON public.user_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_venues_default_position();

-- ---------------------------------------------------------------------------
-- 4. roster_shifts
-- ---------------------------------------------------------------------------
CREATE TABLE public.roster_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  position_id uuid NOT NULL REFERENCES public.positions (id) ON DELETE RESTRICT,
  break_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roster_shifts_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT roster_shifts_break_non_negative_chk CHECK (break_minutes >= 0)
);

CREATE INDEX roster_shifts_venue_date_idx ON public.roster_shifts (venue_id, shift_date);

CREATE OR REPLACE FUNCTION public.validate_roster_shift_position_venue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.positions p
    WHERE p.id = NEW.position_id
      AND p.venue_id = NEW.venue_id
      AND p.organisation_id = NEW.organisation_id
      AND p.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'position_id must reference an active position for this venue';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roster_shifts_validate_position ON public.roster_shifts;
CREATE TRIGGER roster_shifts_validate_position
  BEFORE INSERT OR UPDATE OF position_id, venue_id, organisation_id ON public.roster_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_roster_shift_position_venue();

CREATE OR REPLACE FUNCTION public.validate_roster_shift_staff_venue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_organisations uo
    INNER JOIN public.user_venues uv ON uv.user_organisation_id = uo.id
    WHERE uo.user_profile_id = NEW.user_profile_id
      AND uv.venue_id = NEW.venue_id
      AND uv.organisation_id = NEW.organisation_id
      AND uo.is_active = true
      AND uv.is_active = true
      AND uo.archived_at IS NULL
      AND uv.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user_profile_id must be assigned to this venue';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_roster_shift_staff_venue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_roster_shift_staff_venue() TO authenticated;

DROP TRIGGER IF EXISTS roster_shifts_validate_staff ON public.roster_shifts;
CREATE TRIGGER roster_shifts_validate_staff
  BEFORE INSERT OR UPDATE OF user_profile_id, venue_id, organisation_id ON public.roster_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_roster_shift_staff_venue();

-- ---------------------------------------------------------------------------
-- 5. RLS (align with ingredients: org membership on organisation_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY positions_select ON public.positions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = positions.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY positions_insert ON public.positions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = positions.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY positions_update ON public.positions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = positions.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY positions_delete ON public.positions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = positions.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_shifts_select ON public.roster_shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_shifts.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_shifts_insert ON public.roster_shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_shifts.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_shifts_update ON public.roster_shifts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_shifts.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_shifts_delete ON public.roster_shifts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_shifts.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );
