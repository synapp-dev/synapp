-- Per-calendar-week availability (Monday week_start), separate from recurring `venue_staff_weekly_availability`.
-- Roster merges: week instance overrides recurring template for that week.

CREATE TABLE public.venue_staff_week_instance_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  week_start_monday date NOT NULL,
  day_of_week smallint NOT NULL,
  is_available boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_staff_week_instance_availability_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT venue_staff_week_instance_availability_day_chk CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

CREATE UNIQUE INDEX venue_staff_week_instance_availability_uq
  ON public.venue_staff_week_instance_availability (venue_id, user_profile_id, week_start_monday, day_of_week);

CREATE INDEX venue_staff_week_instance_availability_week_lookup_idx
  ON public.venue_staff_week_instance_availability (venue_id, week_start_monday);

CREATE OR REPLACE FUNCTION public.validate_venue_staff_week_instance_availability_staff_venue()
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

REVOKE ALL ON FUNCTION public.validate_venue_staff_week_instance_availability_staff_venue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_venue_staff_week_instance_availability_staff_venue() TO authenticated;

DROP TRIGGER IF EXISTS venue_staff_week_instance_availability_validate_staff ON public.venue_staff_week_instance_availability;
CREATE TRIGGER venue_staff_week_instance_availability_validate_staff
  BEFORE INSERT OR UPDATE OF user_profile_id, venue_id, organisation_id ON public.venue_staff_week_instance_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_venue_staff_week_instance_availability_staff_venue();

ALTER TABLE public.venue_staff_week_instance_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_staff_week_instance_availability_select ON public.venue_staff_week_instance_availability
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_staff_week_instance_availability.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_staff_week_instance_availability_insert ON public.venue_staff_week_instance_availability
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_staff_week_instance_availability.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_staff_week_instance_availability_update ON public.venue_staff_week_instance_availability
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_staff_week_instance_availability.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_staff_week_instance_availability_delete ON public.venue_staff_week_instance_availability
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_staff_week_instance_availability.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );
