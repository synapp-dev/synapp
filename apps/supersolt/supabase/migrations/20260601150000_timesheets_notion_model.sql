-- Timesheets Notion model: expand roster skeleton + pay periods, clock events, disputes, audit

CREATE TYPE public.timesheet_status AS ENUM (
  'open',
  'submitted',
  'approved',
  'disputed',
  'locked'
);

CREATE TYPE public.timesheet_clock_event_type AS ENUM (
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'auto_clock_out',
  'manual_correction'
);

CREATE TYPE public.timesheet_dispute_resolution AS ENUM (
  'pending',
  'accepted',
  'partial',
  'rejected'
);

CREATE TYPE public.pay_period_status AS ENUM (
  'open',
  'closed',
  'exported',
  'locked'
);

CREATE TYPE public.pay_period_frequency AS ENUM (
  'weekly',
  'fortnightly',
  'monthly'
);

CREATE TYPE public.timesheet_break_mode AS ENUM (
  'explicit_events',
  'auto_deduct'
);

-- Organisation + venue settings
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS timesheet_pay_period_frequency public.pay_period_frequency NOT NULL DEFAULT 'fortnightly',
  ADD COLUMN IF NOT EXISTS timesheet_period_start_dow smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS timesheet_match_tolerance_min integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS timesheet_owner_approval_variance_min integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS timesheet_geolocation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timesheet_break_mode public.timesheet_break_mode NOT NULL DEFAULT 'explicit_events',
  ADD COLUMN IF NOT EXISTS timesheet_auto_deduct_break_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS timesheet_auto_deduct_after_hours numeric(4,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS timesheet_rounding_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timesheet_approval_window_hours integer NOT NULL DEFAULT 48;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS location_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS location_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS geolocation_radius_m integer NOT NULL DEFAULT 100;

-- Pay periods
CREATE TABLE public.pay_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  frequency public.pay_period_frequency NOT NULL DEFAULT 'fortnightly',
  status public.pay_period_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  exported_at timestamptz,
  payroll_export_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, start_date, end_date)
);

CREATE INDEX pay_periods_org_status_idx ON public.pay_periods (organisation_id, status);

-- Expand timesheets
ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_shift_uq;
ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_source_check;

ALTER TABLE public.timesheets
  ALTER COLUMN shift_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_period_id uuid REFERENCES public.pay_periods (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.timesheet_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS rostered_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS actual_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS start_variance_min integer,
  ADD COLUMN IF NOT EXISTS end_variance_min integer,
  ADD COLUMN IF NOT EXISTS hours_variance numeric(6,2),
  ADD COLUMN IF NOT EXISTS pay_rate_cents integer,
  ADD COLUMN IF NOT EXISTS is_auto_clocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_no_roster boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_in_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_in_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS geolocation_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_employee text,
  ADD COLUMN IF NOT EXISTS notes_manager text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_in_payroll_export_id uuid,
  ADD COLUMN IF NOT EXISTS work_date date NOT NULL DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX timesheets_shift_uq ON public.timesheets (shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX timesheets_venue_period_status_idx ON public.timesheets (venue_id, pay_period_id, status);
CREATE INDEX timesheets_user_work_date_idx ON public.timesheets (user_profile_id, work_date);

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_source_check
  CHECK (source IN (
    'roster_publish',
    'clock_in',
    'manager_edit',
    'accept_as_rostered',
    'dispute_resolution',
    'auto_clock_out',
    'manual_p1',
    'clock_in_p2'
  ));

-- Clock events
CREATE TABLE public.timesheet_clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  event_type public.timesheet_clock_event_type NOT NULL,
  event_at timestamptz NOT NULL,
  device_info jsonb,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  is_validated_location boolean,
  notes text,
  created_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX timesheet_clock_events_timesheet_idx ON public.timesheet_clock_events (timesheet_id, event_at);

-- Disputes
CREATE TABLE public.timesheet_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  disputed_by uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  disputed_at timestamptz NOT NULL DEFAULT now(),
  claimed_starts_at timestamptz,
  claimed_ends_at timestamptz,
  claimed_hours numeric(6,2),
  claim_notes text NOT NULL,
  resolution public.timesheet_dispute_resolution NOT NULL DEFAULT 'pending',
  resolution_notes text,
  resolved_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX timesheet_disputes_timesheet_idx ON public.timesheet_disputes (timesheet_id);

-- Audit log
CREATE TABLE public.timesheet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  change_type text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX timesheet_audit_log_timesheet_idx ON public.timesheet_audit_log (timesheet_id, created_at);

-- Payroll staging
CREATE TABLE public.payroll_timesheet_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id) ON DELETE CASCADE,
  hours numeric(6,2) NOT NULL,
  base_rate_cents integer NOT NULL,
  overtime_hours numeric(6,2) NOT NULL DEFAULT 0,
  overtime_rate_cents integer,
  gross_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timesheet_id)
);

-- RLS
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_timesheet_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_periods_select ON public.pay_periods
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_periods.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_periods_insert ON public.pay_periods
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_periods.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_periods_update ON public.pay_periods
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_periods.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_clock_events_select ON public.timesheet_clock_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_clock_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_clock_events_insert ON public.timesheet_clock_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_clock_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_disputes_select ON public.timesheet_disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_disputes.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_disputes_insert ON public.timesheet_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_disputes.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_disputes_update ON public.timesheet_disputes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_disputes.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_audit_log_select ON public.timesheet_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY timesheet_audit_log_insert ON public.timesheet_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = timesheet_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_timesheet_lines_select ON public.payroll_timesheet_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_timesheet_lines.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_timesheet_lines_insert ON public.payroll_timesheet_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_timesheet_lines.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );
