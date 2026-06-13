-- People module: Compliance Floor A — employment columns, sensitive profile RLS, satellite tables.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.employee_employment_status AS ENUM (
    'active',
    'on_leave',
    'on_parental_leave',
    'terminated',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_tfn_status AS ENUM (
    'provided',
    'pending',
    'under_18_low_earnings',
    'no_tfn_withholding'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stapled_check_status AS ENUM (
    'not_required',
    'pending',
    'checked',
    'default_fund_used'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pay_rate_reason_category AS ENUM (
    'annual_review',
    'award_uplift',
    'promotion',
    'market_correction',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_document_type AS ENUM (
    'employment_contract',
    'photo_id',
    'work_rights',
    'tfn_declaration',
    'super_choice',
    'certification',
    'termination_letter',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.xero_sync_direction AS ENUM (
    'xero_to_supersolt',
    'supersolt_to_xero'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.employment_type ADD VALUE IF NOT EXISTS 'fixed_term';

-- ---------------------------------------------------------------------------
-- user_profiles — personal
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS residential_address jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb;

-- ---------------------------------------------------------------------------
-- user_organisations — employment
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS continuous_service_start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS employment_status public.employee_employment_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS probation_start_date date,
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS weekly_hours_commitment numeric(4, 1),
  ADD COLUMN IF NOT EXISTS pay_rate_cents integer,
  ADD COLUMN IF NOT EXISTS pay_rate_period text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS award_code text,
  ADD COLUMN IF NOT EXISTS classification_level text,
  ADD COLUMN IF NOT EXISTS classification_grade text,
  ADD COLUMN IF NOT EXISTS classification_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS secondary_position_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS xero_employee_id text,
  ADD COLUMN IF NOT EXISTS needs_supersolt_detail boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fwis_issued_date date,
  ADD COLUMN IF NOT EXISTS ceis_issued_date date,
  ADD COLUMN IF NOT EXISTS fixed_term_statement_issued_date date,
  ADD COLUMN IF NOT EXISTS casual_conversion_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS casual_conversion_eligible_at date,
  ADD COLUMN IF NOT EXISTS lsl_eligible_at date,
  ADD COLUMN IF NOT EXISTS lsl_balance_weeks numeric(8, 2),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz;

-- ---------------------------------------------------------------------------
-- employee_payroll_profiles — expand sensitive + tighten RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_payroll_profiles
  ADD COLUMN IF NOT EXISTS tfn_status public.employee_tfn_status,
  ADD COLUMN IF NOT EXISTS super_fund_abn text,
  ADD COLUMN IF NOT EXISTS super_fund_name text,
  ADD COLUMN IF NOT EXISTS super_choice_form_date date,
  ADD COLUMN IF NOT EXISTS stapled_check_status public.stapled_check_status,
  ADD COLUMN IF NOT EXISTS stapled_check_date date,
  ADD COLUMN IF NOT EXISTS stapled_check_performed_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visa_subclass text,
  ADD COLUMN IF NOT EXISTS country_code char(2),
  ADD COLUMN IF NOT EXISTS visa_expiry date,
  ADD COLUMN IF NOT EXISTS last_vevo_check_date date,
  ADD COLUMN IF NOT EXISTS vevo_reference text,
  ADD COLUMN IF NOT EXISTS is_bridging_visa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xero_managed_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS employee_payroll_profiles_select ON public.employee_payroll_profiles;
DROP POLICY IF EXISTS employee_payroll_profiles_insert ON public.employee_payroll_profiles;
DROP POLICY IF EXISTS employee_payroll_profiles_update ON public.employee_payroll_profiles;

CREATE OR REPLACE FUNCTION public.can_read_employee_sensitive(
  p_org_id uuid,
  p_subject_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_subject_profile_id
    OR public.is_org_admin(p_org_id);
$$;

REVOKE ALL ON FUNCTION public.can_read_employee_sensitive(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_employee_sensitive(uuid, uuid) TO authenticated;

CREATE POLICY employee_payroll_profiles_select ON public.employee_payroll_profiles
  FOR SELECT TO authenticated
  USING (public.can_read_employee_sensitive(organisation_id, user_profile_id));

CREATE POLICY employee_payroll_profiles_insert ON public.employee_payroll_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_read_employee_sensitive(organisation_id, user_profile_id));

CREATE POLICY employee_payroll_profiles_update ON public.employee_payroll_profiles
  FOR UPDATE TO authenticated
  USING (public.can_read_employee_sensitive(organisation_id, user_profile_id))
  WITH CHECK (public.can_read_employee_sensitive(organisation_id, user_profile_id));

-- ---------------------------------------------------------------------------
-- Satellite tables (employee_pay_rate_history owned by award_rate_library migration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  cert_type text NOT NULL,
  cert_state text,
  certificate_number text,
  issue_date date NOT NULL,
  expiry_date date,
  issuing_authority text,
  document_storage_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_certifications_lookup_idx
  ON public.employee_certifications (organisation_id, user_profile_id);

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  document_type public.employee_document_type NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  uploaded_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE TABLE IF NOT EXISTS public.employee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  field_path text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  is_sensitive boolean NOT NULL DEFAULT false,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  justification text,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_audit_log_lookup_idx
  ON public.employee_audit_log (organisation_id, user_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.xero_employee_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  direction public.xero_sync_direction NOT NULL,
  field_path text NOT NULL,
  xero_value jsonb,
  supersolt_value jsonb,
  resolution text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_onboarding_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_organisation_id uuid NOT NULL REFERENCES public.user_organisations (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS — satellite tables (org member read; operators write via service + admin)
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xero_employee_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_certifications_select ON public.employee_certifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = employee_certifications.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY employee_certifications_manage ON public.employee_certifications
  FOR ALL TO authenticated
  USING (
    public.is_org_admin(organisation_id)
    OR user_profile_id = auth.uid()
  )
  WITH CHECK (
    public.is_org_admin(organisation_id)
    OR user_profile_id = auth.uid()
  );

CREATE POLICY employee_documents_select ON public.employee_documents
  FOR SELECT TO authenticated
  USING (
    public.can_read_employee_sensitive(organisation_id, user_profile_id)
    OR (
      NOT is_sensitive
      AND EXISTS (
        SELECT 1 FROM public.user_organisations uo
        WHERE uo.organisation_id = employee_documents.organisation_id
          AND uo.user_profile_id = auth.uid()
          AND uo.is_active = true
          AND uo.archived_at IS NULL
      )
    )
  );

CREATE POLICY employee_documents_manage ON public.employee_documents
  FOR ALL TO authenticated
  USING (public.can_read_employee_sensitive(organisation_id, user_profile_id))
  WITH CHECK (public.can_read_employee_sensitive(organisation_id, user_profile_id));

CREATE POLICY employee_audit_log_select ON public.employee_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organisation_id)
    OR user_profile_id = auth.uid()
  );

CREATE POLICY employee_audit_log_insert ON public.employee_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY xero_employee_sync_log_select ON public.xero_employee_sync_log
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organisation_id));

CREATE POLICY employee_onboarding_tokens_admin ON public.employee_onboarding_tokens
  FOR ALL TO authenticated
  USING (public.is_org_admin(organisation_id))
  WITH CHECK (public.is_org_admin(organisation_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT SELECT, INSERT ON public.employee_audit_log TO authenticated;
GRANT SELECT ON public.xero_employee_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.employee_onboarding_tokens TO authenticated;

-- Backfill continuous service from joined_at where missing
UPDATE public.user_organisations uo
SET
  start_date = COALESCE(uo.start_date, (uo.joined_at AT TIME ZONE 'UTC')::date, (uo.created_at AT TIME ZONE 'UTC')::date),
  continuous_service_start_date = COALESCE(
    uo.continuous_service_start_date,
    (uo.joined_at AT TIME ZONE 'UTC')::date,
    (uo.created_at AT TIME ZONE 'UTC')::date
  )
WHERE uo.archived_at IS NULL;
