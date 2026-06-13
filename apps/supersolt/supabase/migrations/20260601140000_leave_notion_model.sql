-- Leave module: types, balances, requests, accrual, LSL reference, payroll staging.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.leave_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'cancelled'
);

CREATE TYPE public.leave_accrual_basis AS ENUM (
  'hours_worked',
  'years_service',
  'per_occasion',
  'calendar_year',
  'none'
);

CREATE TYPE public.leave_approval_role AS ENUM (
  'manager',
  'owner'
);

CREATE TYPE public.leave_accrual_trigger AS ENUM (
  'timesheet_approval',
  'manual_adjustment',
  'leave_taken',
  'accrual_correction',
  'opening_balance',
  'termination_payout'
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE public.employment_type AS ENUM ('full_time', 'part_time', 'casual');
  END IF;
END $$;

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS leave_owner_approval_min_days integer NOT NULL DEFAULT 5;

ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS employment_type public.employment_type NOT NULL DEFAULT 'casual';

ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS contracted_hours_per_week numeric(4, 1);

-- ---------------------------------------------------------------------------
-- leave_types
-- ---------------------------------------------------------------------------
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_paid boolean NOT NULL DEFAULT true,
  is_accruable boolean NOT NULL DEFAULT true,
  accrual_rate_pct numeric(6, 3),
  accrual_basis public.leave_accrual_basis NOT NULL DEFAULT 'hours_worked',
  default_approval_role public.leave_approval_role NOT NULL DEFAULT 'manager',
  is_per_occasion boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_types_org_code_uq UNIQUE (organisation_id, code)
);

CREATE INDEX leave_types_org_idx ON public.leave_types (organisation_id);

-- ---------------------------------------------------------------------------
-- leave_balances
-- ---------------------------------------------------------------------------
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id) ON DELETE CASCADE,
  current_balance_hours numeric(10, 2) NOT NULL DEFAULT 0,
  accrued_lifetime_hours numeric(12, 2) NOT NULL DEFAULT 0,
  used_lifetime_hours numeric(12, 2) NOT NULL DEFAULT 0,
  last_accrual_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_balances_uq UNIQUE (organisation_id, user_profile_id, leave_type_id)
);

CREATE INDEX leave_balances_user_idx ON public.leave_balances (organisation_id, user_profile_id);

-- ---------------------------------------------------------------------------
-- leave_requests
-- ---------------------------------------------------------------------------
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  total_hours numeric(10, 2) NOT NULL,
  is_paid boolean NOT NULL,
  paid_hours numeric(10, 2) NOT NULL DEFAULT 0,
  unpaid_hours numeric(10, 2) NOT NULL DEFAULT 0,
  reason text,
  comments_to_manager text,
  status public.leave_request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by_user_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  decision_reason text,
  roster_resolution jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_venue_org_fk
    FOREIGN KEY (organisation_id, venue_id) REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT leave_requests_dates_chk CHECK (end_date >= start_date),
  CONSTRAINT leave_requests_hours_split_chk CHECK (paid_hours + unpaid_hours = total_hours)
);

CREATE INDEX leave_requests_venue_status_idx
  ON public.leave_requests (venue_id, status, start_date);

CREATE INDEX leave_requests_user_idx
  ON public.leave_requests (organisation_id, user_profile_id, status);

CREATE INDEX leave_requests_approved_range_idx
  ON public.leave_requests (organisation_id, user_profile_id, start_date, end_date)
  WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- leave_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE public.leave_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  leave_request_id uuid REFERENCES public.leave_requests (id) ON DELETE SET NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  change_type text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leave_audit_log_subject_idx
  ON public.leave_audit_log (organisation_id, user_profile_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- lsl_state_rules (reference)
-- ---------------------------------------------------------------------------
CREATE TABLE public.lsl_state_rules (
  state text PRIMARY KEY,
  min_years_service numeric(4, 1) NOT NULL,
  pro_rata_years_service numeric(4, 1),
  accrual_weeks_per_year numeric(6, 3) NOT NULL
);

INSERT INTO public.lsl_state_rules (state, min_years_service, pro_rata_years_service, accrual_weeks_per_year)
VALUES
  ('VIC', 7, 5, 1.43),
  ('NSW', 10, 5, 1.3),
  ('QLD', 10, 7, 1.3),
  ('WA', 10, 7, 1.3),
  ('SA', 10, 7, 1.3),
  ('TAS', 10, 7, 1.3),
  ('ACT', 7, 5, 1.43),
  ('NT', 10, 7, 1.3)
ON CONFLICT (state) DO NOTHING;

-- ---------------------------------------------------------------------------
-- leave_accrual_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.leave_accrual_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id) ON DELETE CASCADE,
  triggered_by public.leave_accrual_trigger NOT NULL,
  hours_change numeric(10, 2) NOT NULL,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX leave_accrual_events_timesheet_uq
  ON public.leave_accrual_events (organisation_id, source_ref, triggered_by)
  WHERE triggered_by = 'timesheet_approval' AND source_ref IS NOT NULL;

CREATE INDEX leave_accrual_events_user_idx
  ON public.leave_accrual_events (organisation_id, user_profile_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- payroll_leave_lines
-- ---------------------------------------------------------------------------
CREATE TABLE public.payroll_leave_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_request_id uuid REFERENCES public.leave_requests (id) ON DELETE SET NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id) ON DELETE CASCADE,
  hours numeric(10, 2) NOT NULL,
  rate_cents integer NOT NULL DEFAULT 0,
  is_termination_payout boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_leave_lines_user_period_idx
  ON public.payroll_leave_lines (organisation_id, user_profile_id, pay_period_start);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lsl_state_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_accrual_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_leave_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_types_select ON public.leave_types
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_types.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY leave_types_manage ON public.leave_types
  FOR ALL TO authenticated
  USING (public.is_org_admin(organisation_id))
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY leave_balances_select ON public.leave_balances
  FOR SELECT TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_balances.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY leave_balances_write ON public.leave_balances
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_balances.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_balances.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY leave_requests_select ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_venues uv
      JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      WHERE uv.venue_id = leave_requests.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND uv.is_active = true
        AND uv.archived_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_requests.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND public.is_org_admin(leave_requests.organisation_id)
    )
  );

CREATE POLICY leave_requests_insert ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_venues uv
      JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uv.venue_id = leave_requests.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND r.slug IN ('owner', 'admin', 'manager', 'supervisor')
    )
  );

CREATE POLICY leave_requests_update ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_venues uv
      JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uv.venue_id = leave_requests.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND r.slug IN ('owner', 'admin', 'manager', 'supervisor')
    )
    OR public.is_org_admin(organisation_id)
  )
  WITH CHECK (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_venues uv
      JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uv.venue_id = leave_requests.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND r.slug IN ('owner', 'admin', 'manager', 'supervisor')
    )
    OR public.is_org_admin(organisation_id)
  );

CREATE POLICY leave_audit_log_select ON public.leave_audit_log
  FOR SELECT TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY leave_audit_log_insert ON public.leave_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY lsl_state_rules_select ON public.lsl_state_rules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY leave_accrual_events_select ON public.leave_accrual_events
  FOR SELECT TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_accrual_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY leave_accrual_events_insert ON public.leave_accrual_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = leave_accrual_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_leave_lines_select ON public.payroll_leave_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_leave_lines.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_leave_lines_insert ON public.payroll_leave_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_leave_lines.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;
GRANT SELECT, INSERT ON public.leave_audit_log TO authenticated;
GRANT SELECT ON public.lsl_state_rules TO authenticated;
GRANT SELECT, INSERT ON public.leave_accrual_events TO authenticated;
GRANT SELECT, INSERT ON public.payroll_leave_lines TO authenticated;
