-- Roster Phase 1: week aggregates, shift costing, compliance flags, timesheet handoff.

ALTER TYPE public.roster_shift_lifecycle ADD VALUE IF NOT EXISTS 'modified';

-- ---------------------------------------------------------------------------
-- roster_weeks
-- ---------------------------------------------------------------------------
CREATE TABLE public.roster_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  week_start date NOT NULL,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'modified')),
  target_labour_pct numeric(5, 2),
  forecast_sales_cents bigint,
  labour_budget_cents bigint,
  total_cost_cents bigint,
  total_base_cost_cents bigint,
  total_penalty_cost_cents bigint,
  splh_planned numeric(12, 4),
  published_at timestamptz,
  published_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roster_weeks_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT roster_weeks_venue_week_uq UNIQUE (venue_id, week_start)
);

CREATE INDEX roster_weeks_venue_week_idx ON public.roster_weeks (venue_id, week_start);

-- ---------------------------------------------------------------------------
-- Extend roster_shifts
-- ---------------------------------------------------------------------------
ALTER TABLE public.roster_shifts
  ALTER COLUMN user_profile_id DROP NOT NULL;

ALTER TABLE public.roster_shifts
  ADD COLUMN IF NOT EXISTS award_code text,
  ADD COLUMN IF NOT EXISTS computed_cost_cents integer,
  ADD COLUMN IF NOT EXISTS base_cost_cents integer,
  ADD COLUMN IF NOT EXISTS penalty_cost_cents integer,
  ADD COLUMN IF NOT EXISTS roster_week_id uuid REFERENCES public.roster_weeks (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clocked_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS clocked_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS clocked_break_minutes integer;

-- ---------------------------------------------------------------------------
-- shift_compliance_flags
-- ---------------------------------------------------------------------------
CREATE TYPE public.shift_compliance_rule AS ENUM (
  'leave_clash',
  'cert_missing',
  'cert_expired',
  'under18_hours',
  'visa_expired',
  'rest_gap',
  'max_hours',
  'availability',
  'over_budget',
  'min_engagement',
  'pt_pattern'
);

CREATE TYPE public.shift_compliance_tier AS ENUM ('hard_block', 'warn');

CREATE TABLE public.shift_compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  rule public.shift_compliance_rule NOT NULL,
  tier public.shift_compliance_tier NOT NULL,
  message text NOT NULL,
  overridden boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_compliance_flags_shift_idx ON public.shift_compliance_flags (shift_id);

-- ---------------------------------------------------------------------------
-- roster_publish_deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE public.roster_publish_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  roster_week_id uuid NOT NULL REFERENCES public.roster_weeks (id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'pdf')),
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX roster_publish_deliveries_week_idx ON public.roster_publish_deliveries (roster_week_id);

-- ---------------------------------------------------------------------------
-- timesheets (Phase 1 manual baseline from published roster)
-- ---------------------------------------------------------------------------
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  rostered_starts_at timestamptz NOT NULL,
  rostered_ends_at timestamptz NOT NULL,
  rostered_break_minutes integer NOT NULL DEFAULT 0,
  actual_starts_at timestamptz,
  actual_ends_at timestamptz,
  actual_break_minutes integer,
  source text NOT NULL DEFAULT 'manual_p1'
    CHECK (source IN ('manual_p1', 'clock_in_p2', 'accept_as_rostered')),
  approved_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timesheets_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT timesheets_shift_uq UNIQUE (shift_id)
);

CREATE INDEX timesheets_venue_idx ON public.timesheets (venue_id);

-- ---------------------------------------------------------------------------
-- shift_breaks
-- ---------------------------------------------------------------------------
CREATE TABLE public.shift_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  break_type text NOT NULL CHECK (break_type IN ('meal_unpaid', 'rest_paid')),
  minutes integer NOT NULL CHECK (minutes >= 0),
  taken boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shift_breaks_shift_idx ON public.shift_breaks (shift_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.roster_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_compliance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_publish_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY roster_weeks_select ON public.roster_weeks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = roster_weeks.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_weeks_insert ON public.roster_weeks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = roster_weeks.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_weeks_update ON public.roster_weeks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = roster_weeks.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_weeks_delete ON public.roster_weeks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = roster_weeks.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_compliance_flags_select ON public.shift_compliance_flags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_compliance_flags.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_compliance_flags_insert ON public.shift_compliance_flags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_compliance_flags.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_compliance_flags_update ON public.shift_compliance_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_compliance_flags.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_compliance_flags_delete ON public.shift_compliance_flags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_compliance_flags.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_publish_deliveries_select ON public.roster_publish_deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_weeks rw
      JOIN public.user_organisations uo ON uo.organisation_id = rw.organisation_id
      WHERE rw.id = roster_publish_deliveries.roster_week_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roster_publish_deliveries_insert ON public.roster_publish_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.roster_weeks rw
      JOIN public.user_organisations uo ON uo.organisation_id = rw.organisation_id
      WHERE rw.id = roster_publish_deliveries.roster_week_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheets_select ON public.timesheets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = timesheets.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheets_insert ON public.timesheets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = timesheets.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheets_update ON public.timesheets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = timesheets.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_breaks_select ON public.shift_breaks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_breaks.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY shift_breaks_insert ON public.shift_breaks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.roster_shifts rs
      JOIN public.user_organisations uo ON uo.organisation_id = rs.organisation_id
      WHERE rs.id = shift_breaks.shift_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );
