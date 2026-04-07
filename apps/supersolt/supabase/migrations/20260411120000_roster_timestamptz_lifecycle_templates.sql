-- roster_shifts: timestamptz bounds, draft/published lifecycle, provenance.
-- roster_templates + roster_template_shifts: weekday patterns (apply → draft shifts in app).

CREATE TYPE public.roster_shift_lifecycle AS ENUM ('draft', 'published');

CREATE TYPE public.roster_shift_source AS ENUM (
  'manual',
  'copy_week',
  'template_apply',
  'autofill',
  'demand_fill'
);

-- ---------------------------------------------------------------------------
-- roster_templates (per venue)
-- ---------------------------------------------------------------------------
CREATE TABLE public.roster_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  name text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roster_templates_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE
);

CREATE INDEX roster_templates_venue_list_idx
  ON public.roster_templates (venue_id)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- roster_template_shifts (day-of-week pattern lines)
-- ---------------------------------------------------------------------------
CREATE TABLE public.roster_template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid NOT NULL REFERENCES public.roster_templates (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0,
  position_id uuid NOT NULL REFERENCES public.positions (id) ON DELETE RESTRICT,
  user_profile_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roster_template_shifts_day_chk CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT roster_template_shifts_break_chk CHECK (break_minutes >= 0)
);

CREATE INDEX roster_template_shifts_template_idx ON public.roster_template_shifts (template_id);

CREATE OR REPLACE FUNCTION public.validate_roster_template_shift_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.roster_templates t
    INNER JOIN public.positions p ON p.id = NEW.position_id
    WHERE t.id = NEW.template_id
      AND p.venue_id = t.venue_id
      AND p.organisation_id = t.organisation_id
      AND p.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'position_id must be an active position for the template venue';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roster_template_shifts_validate_position ON public.roster_template_shifts;
CREATE TRIGGER roster_template_shifts_validate_position
  BEFORE INSERT OR UPDATE OF template_id, position_id ON public.roster_template_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_roster_template_shift_position();

-- ---------------------------------------------------------------------------
-- roster_shifts: new columns, backfill, drop legacy date/time
-- ---------------------------------------------------------------------------
ALTER TABLE public.roster_shifts
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN lifecycle public.roster_shift_lifecycle NOT NULL DEFAULT 'published',
  ADD COLUMN source public.roster_shift_source NOT NULL DEFAULT 'manual',
  ADD COLUMN template_id uuid REFERENCES public.roster_templates (id) ON DELETE SET NULL;

UPDATE public.roster_shifts rs
SET
  starts_at = (
    (rs.shift_date::text || ' ' || rs.start_time::text)::timestamp
    AT TIME ZONE v.timezone
  ),
  ends_at = (
    CASE
      WHEN rs.end_time > rs.start_time THEN
        (rs.shift_date::text || ' ' || rs.end_time::text)::timestamp
        AT TIME ZONE v.timezone
      ELSE
        ((rs.shift_date + 1)::text || ' ' || rs.end_time::text)::timestamp
        AT TIME ZONE v.timezone
    END
  )
FROM public.venues v
WHERE v.id = rs.venue_id
  AND v.organisation_id = rs.organisation_id;

ALTER TABLE public.roster_shifts
  ALTER COLUMN starts_at SET NOT NULL,
  ALTER COLUMN ends_at SET NOT NULL;

ALTER TABLE public.roster_shifts
  ADD CONSTRAINT roster_shifts_time_order_chk CHECK (ends_at > starts_at);

DROP INDEX IF EXISTS public.roster_shifts_venue_date_idx;

ALTER TABLE public.roster_shifts
  DROP COLUMN shift_date,
  DROP COLUMN start_time,
  DROP COLUMN end_time;

CREATE INDEX roster_shifts_venue_published_starts_idx
  ON public.roster_shifts (venue_id, starts_at)
  WHERE lifecycle = 'published'::public.roster_shift_lifecycle;

CREATE INDEX roster_shifts_venue_draft_starts_idx
  ON public.roster_shifts (venue_id, starts_at)
  WHERE lifecycle = 'draft'::public.roster_shift_lifecycle;

CREATE INDEX roster_shifts_venue_overlap_idx ON public.roster_shifts (venue_id, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- RLS: templates
-- ---------------------------------------------------------------------------
ALTER TABLE public.roster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_template_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY roster_templates_select ON public.roster_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_templates.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_templates_insert ON public.roster_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_templates.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_templates_update ON public.roster_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_templates.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_templates_delete ON public.roster_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roster_templates.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_template_shifts_select ON public.roster_template_shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_templates t
      INNER JOIN public.user_organisations uo
        ON uo.organisation_id = t.organisation_id
      WHERE t.id = roster_template_shifts.template_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_template_shifts_insert ON public.roster_template_shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.roster_templates t
      INNER JOIN public.user_organisations uo
        ON uo.organisation_id = t.organisation_id
      WHERE t.id = roster_template_shifts.template_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_template_shifts_update ON public.roster_template_shifts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_templates t
      INNER JOIN public.user_organisations uo
        ON uo.organisation_id = t.organisation_id
      WHERE t.id = roster_template_shifts.template_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_template_shifts_delete ON public.roster_template_shifts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_templates t
      INNER JOIN public.user_organisations uo
        ON uo.organisation_id = t.organisation_id
      WHERE t.id = roster_template_shifts.template_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );
