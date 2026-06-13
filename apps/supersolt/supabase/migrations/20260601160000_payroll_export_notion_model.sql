-- Payroll Export: pay runs, line items, profiles (People triad owns CRUD surface), settings, audit.

CREATE TYPE public.payroll_run_status AS ENUM (
  'draft',
  'returned_for_revision',
  'pending_owner_approval',
  'approved',
  'xero_push_pending',
  'sent_to_xero',
  'finalised_in_xero',
  'paid',
  'payslips_issued',
  'stp_lodged',
  'super_scheduled',
  'super_paid',
  'reconciled'
);

CREATE TYPE public.payroll_override_category AS ENUM (
  'payg_correction',
  'allowance',
  'termination_etp',
  'wage_theft_exemption',
  'other'
);

-- Payroll profile fields (DDL here until People triad; People module owns edit UI).
CREATE TABLE public.employee_payroll_profiles (
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  tfn text,
  tax_treatment_code text,
  stp2_income_type text,
  super_fund_usi text,
  super_member_number text,
  bank_bsb text,
  bank_account_number text,
  bank_account_name text,
  award_code text,
  award_classification text,
  award_grade text,
  pay_rate_cents integer,
  date_of_birth date,
  employment_type public.employment_type,
  fdv_payslip_label text NOT NULL DEFAULT 'other_paid_leave',
  is_terminated boolean NOT NULL DEFAULT false,
  termination_date date,
  cessation_reason_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_profile_id)
);

CREATE TABLE public.organisation_payroll_settings (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  super_rate_pct numeric(5,3) NOT NULL DEFAULT 12.000,
  super_rate_effective_from date NOT NULL DEFAULT '2025-07-01',
  primary_xero_venue_id uuid REFERENCES public.venues (id) ON DELETE SET NULL,
  default_payday_offset_days smallint NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id) ON DELETE RESTRICT,
  frequency public.pay_period_frequency NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  status public.payroll_run_status NOT NULL DEFAULT 'draft',
  total_gross_cents bigint NOT NULL DEFAULT 0,
  total_super_cents bigint NOT NULL DEFAULT 0,
  total_payg_cents bigint NOT NULL DEFAULT 0,
  total_net_cents bigint NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0,
  calculation_snapshot jsonb,
  calculation_version integer NOT NULL DEFAULT 1,
  prepared_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  prepared_at timestamptz,
  submitted_for_approval_at timestamptz,
  owner_return_notes text,
  returned_at timestamptz,
  returned_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  approved_at timestamptz,
  xero_tenant_id text,
  xero_pay_run_id text,
  xero_push_attempted_at timestamptz,
  xero_push_retry_count integer NOT NULL DEFAULT 0,
  xero_finalised_at timestamptz,
  paid_at timestamptz,
  payslips_issued_at timestamptz,
  stp_lodged_at timestamptz,
  super_scheduled_at timestamptz,
  super_paid_at timestamptz,
  reconciled_at timestamptz,
  is_correction_run boolean NOT NULL DEFAULT false,
  corrects_pay_run_id uuid REFERENCES public.pay_runs (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pay_runs_one_primary_per_period_idx
  ON public.pay_runs (organisation_id, pay_period_id)
  WHERE is_correction_run = false;

CREATE INDEX pay_runs_org_status_idx ON public.pay_runs (organisation_id, status);

CREATE TABLE public.pay_run_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  hours_total numeric(8,2) NOT NULL DEFAULT 0,
  hours_breakdown jsonb NOT NULL DEFAULT '{}',
  gross_cents bigint NOT NULL DEFAULT 0,
  super_cents bigint NOT NULL DEFAULT 0,
  payg_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  pay_rate_snapshot_cents integer,
  award_classification_snapshot text,
  tax_treatment_code_snapshot text,
  stp2_income_type_snapshot text,
  super_fund_snapshot jsonb,
  bank_snapshot jsonb,
  is_termination boolean NOT NULL DEFAULT false,
  cessation_reason_code text,
  termination_payout_breakdown jsonb,
  has_overrides boolean NOT NULL DEFAULT false,
  override_reason text,
  override_category public.payroll_override_category,
  has_fdv_leave boolean NOT NULL DEFAULT false,
  fdv_payslip_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pay_run_id, user_profile_id)
);

CREATE TABLE public.payroll_preflight_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  results jsonb NOT NULL,
  hard_block_count integer NOT NULL DEFAULT 0,
  soft_warning_count integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL
);

CREATE TABLE public.payroll_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  line_item_id uuid REFERENCES public.pay_run_line_items (id) ON DELETE SET NULL,
  change_type text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  reason_category public.payroll_override_category,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_xero_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  attempt_number integer NOT NULL,
  payload_digest text NOT NULL,
  response_status integer,
  response_body jsonb,
  success boolean NOT NULL,
  error_code text
);

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_locked_in_payroll_export_id_fkey
  FOREIGN KEY (locked_in_payroll_export_id) REFERENCES public.pay_runs (id) ON DELETE SET NULL;

ALTER TABLE public.pay_periods
  ADD CONSTRAINT pay_periods_payroll_export_id_fkey
  FOREIGN KEY (payroll_export_id) REFERENCES public.pay_runs (id) ON DELETE SET NULL;

ALTER TABLE public.payroll_timesheet_lines
  ADD COLUMN IF NOT EXISTS pay_run_id uuid REFERENCES public.pay_runs (id) ON DELETE SET NULL;

ALTER TABLE public.payroll_leave_lines
  ADD COLUMN IF NOT EXISTS pay_run_id uuid REFERENCES public.pay_runs (id) ON DELETE SET NULL;

ALTER TABLE public.employee_payroll_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_run_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_preflight_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_xero_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_payroll_profiles_select ON public.employee_payroll_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = employee_payroll_profiles.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY employee_payroll_profiles_insert ON public.employee_payroll_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = employee_payroll_profiles.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY employee_payroll_profiles_update ON public.employee_payroll_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = employee_payroll_profiles.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY organisation_payroll_settings_select ON public.organisation_payroll_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = organisation_payroll_settings.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY organisation_payroll_settings_all ON public.organisation_payroll_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = organisation_payroll_settings.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY pay_runs_select ON public.pay_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_runs.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_runs_insert ON public.pay_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_runs.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_runs_update ON public.pay_runs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_runs.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_run_line_items_select ON public.pay_run_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_run_line_items.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_run_line_items_insert ON public.pay_run_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_run_line_items.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY pay_run_line_items_update ON public.pay_run_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = pay_run_line_items.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_preflight_checks_select ON public.payroll_preflight_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_preflight_checks.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_preflight_checks_insert ON public.payroll_preflight_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_preflight_checks.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_audit_log_select ON public.payroll_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_audit_log_insert ON public.payroll_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_audit_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY payroll_xero_push_log_select ON public.payroll_xero_push_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = payroll_xero_push_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY payroll_xero_push_log_insert ON public.payroll_xero_push_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = payroll_xero_push_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.employee_payroll_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organisation_payroll_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pay_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pay_run_line_items TO authenticated;
GRANT SELECT, INSERT ON public.payroll_preflight_checks TO authenticated;
GRANT SELECT, INSERT ON public.payroll_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.payroll_xero_push_log TO authenticated;
