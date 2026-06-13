-- Award Rate Library: platform-global reference data + org config.

CREATE TYPE public.penalty_uplift_type AS ENUM ('percentage', 'dollar_per_hour');
CREATE TYPE public.penalty_employment_scope AS ENUM ('ft_pt', 'casual', 'all');
CREATE TYPE public.penalty_day_type AS ENUM ('mon_fri', 'saturday', 'sunday', 'public_holiday');
CREATE TYPE public.library_update_type AS ENUM ('annual_awr', 'fwc_variation', 'correction');
CREATE TYPE public.pay_rate_change_reason AS ENUM (
  'hire',
  'manual_adjustment',
  'award_uplift',
  'awr_percentage_uplift',
  'correction'
);

CREATE TABLE public.awards (
  award_code text PRIMARY KEY,
  award_name text NOT NULL,
  award_short_name text NOT NULL,
  current_version_pr_reference text NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  source_url text NOT NULL,
  casual_loading_pct numeric(5, 3) NOT NULL DEFAULT 25.000,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.award_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text NOT NULL,
  classification_grade text NOT NULL DEFAULT '',
  display_order smallint NOT NULL DEFAULT 0,
  description text NOT NULL,
  is_junior_eligible boolean NOT NULL DEFAULT true,
  is_liquor_service_eligible boolean NOT NULL DEFAULT false,
  notes text,
  UNIQUE (award_code, classification_level, classification_grade)
);

CREATE TABLE public.award_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text NOT NULL,
  classification_grade text NOT NULL DEFAULT '',
  employment_type public.employment_type NOT NULL,
  age_bracket smallint,
  base_hourly_cents integer NOT NULL,
  casual_loaded_hourly_cents integer NOT NULL,
  weekly_minimum_cents integer,
  effective_from date NOT NULL,
  effective_until date,
  source_pr_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX award_rates_lookup_idx ON public.award_rates (
  award_code,
  classification_level,
  classification_grade,
  employment_type,
  effective_from DESC
);

CREATE TABLE public.penalty_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text,
  employment_type_scope public.penalty_employment_scope NOT NULL DEFAULT 'all',
  day_type public.penalty_day_type NOT NULL,
  time_start time NOT NULL DEFAULT '00:00',
  time_end time NOT NULL DEFAULT '24:00',
  is_overtime boolean NOT NULL DEFAULT false,
  uplift_type public.penalty_uplift_type NOT NULL,
  uplift_value numeric(10, 4) NOT NULL,
  applies_after_ordinary_hours boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  effective_until date,
  notes text
);

CREATE TABLE public.junior_rate_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text,
  age smallint NOT NULL CHECK (age BETWEEN 16 AND 20),
  percentage_of_adult numeric(5, 2) NOT NULL,
  effective_from date NOT NULL,
  effective_until date
);

CREATE TABLE public.minimum_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  employment_type public.employment_type NOT NULL,
  day_type text NOT NULL DEFAULT 'regular',
  minimum_hours numeric(4, 2) NOT NULL,
  notes text
);

CREATE TABLE public.award_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  allowance_code text NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  unit text NOT NULL,
  conditions text,
  effective_from date NOT NULL,
  effective_until date,
  source_pr_reference text
);

CREATE TABLE public.library_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text REFERENCES public.awards (award_code),
  update_type public.library_update_type NOT NULL,
  affected_record_count integer NOT NULL DEFAULT 0,
  source_reference text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE TABLE public.organisation_award_config (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  default_award_code text REFERENCES public.awards (award_code),
  is_eba_covered boolean NOT NULL DEFAULT false,
  casual_loading_pct_override numeric(5, 3),
  annualised_salary_buffer_pct numeric(5, 3) NOT NULL DEFAULT 25.000,
  above_award_high_income_threshold_cents bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.awr_uplift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  award_code text NOT NULL REFERENCES public.awards (award_code),
  awr_year smallint NOT NULL,
  effective_date date NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  affected_employee_count integer NOT NULL DEFAULT 0,
  skipped_employee_count integer NOT NULL DEFAULT 0,
  total_uplift_cents bigint,
  source_pr_reference text NOT NULL,
  notes text
);

CREATE TABLE public.employee_pay_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  pay_rate_cents integer NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  reason_category public.pay_rate_change_reason NOT NULL,
  source_reference text,
  created_by_user_id uuid REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX employee_pay_rate_history_lookup_idx
  ON public.employee_pay_rate_history (organisation_id, user_profile_id, effective_from DESC);

-- RLS: platform-global read-only for authenticated
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.junior_rate_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minimum_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY awards_select ON public.awards FOR SELECT TO authenticated USING (true);
CREATE POLICY award_classifications_select ON public.award_classifications FOR SELECT TO authenticated USING (true);
CREATE POLICY award_rates_select ON public.award_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY penalty_rates_select ON public.penalty_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY junior_rate_scales_select ON public.junior_rate_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY minimum_engagements_select ON public.minimum_engagements FOR SELECT TO authenticated USING (true);
CREATE POLICY award_allowances_select ON public.award_allowances FOR SELECT TO authenticated USING (true);
CREATE POLICY library_update_log_select ON public.library_update_log FOR SELECT TO authenticated USING (true);

ALTER TABLE public.organisation_award_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awr_uplift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_pay_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisation_award_config_select ON public.organisation_award_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = organisation_award_config.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY organisation_award_config_all ON public.organisation_award_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = organisation_award_config.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = organisation_award_config.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY awr_uplift_events_select ON public.awr_uplift_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = awr_uplift_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY awr_uplift_events_insert ON public.awr_uplift_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = awr_uplift_events.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

CREATE POLICY employee_pay_rate_history_select ON public.employee_pay_rate_history
  FOR SELECT TO authenticated
  USING (
    user_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = employee_pay_rate_history.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY employee_pay_rate_history_insert ON public.employee_pay_rate_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      JOIN public.roles r ON r.id = uo.role_id
      WHERE uo.organisation_id = employee_pay_rate_history.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.grants_org_admin = true
    )
  );

GRANT SELECT ON public.awards TO authenticated;
GRANT SELECT ON public.award_classifications TO authenticated;
GRANT SELECT ON public.award_rates TO authenticated;
GRANT SELECT ON public.penalty_rates TO authenticated;
GRANT SELECT ON public.junior_rate_scales TO authenticated;
GRANT SELECT ON public.minimum_engagements TO authenticated;
GRANT SELECT ON public.award_allowances TO authenticated;
GRANT SELECT ON public.library_update_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organisation_award_config TO authenticated;
GRANT SELECT, INSERT ON public.awr_uplift_events TO authenticated;
GRANT SELECT, INSERT ON public.employee_pay_rate_history TO authenticated;

-- Seed MA000119 + MA000009 (AWR 2025, effective 1 July 2025)
INSERT INTO public.awards (
  award_code, award_name, award_short_name, current_version_pr_reference,
  effective_from, source_url, casual_loading_pct
) VALUES
  (
    'MA000119',
    'Restaurant Industry Award 2020',
    'Restaurant',
    'PR786658',
    '2025-07-01',
    'https://www.fairwork.gov.au/employment-conditions/awards/award-summary/ma000119-summary',
    25.000
  ),
  (
    'MA000009',
    'Hospitality Industry (General) Award 2020',
    'Hospitality',
    'PR786658',
    '2025-07-01',
    'https://www.fairwork.gov.au/employment-conditions/awards/award-summary/ma000009-summary',
    25.000
  );

INSERT INTO public.award_classifications (
  award_code, classification_level, classification_grade, display_order, description, is_liquor_service_eligible
) VALUES
  ('MA000119', 'Level 1', '1', 1, 'Introductory / F&B Attendant Grade 1', false),
  ('MA000119', 'Level 2', '2', 2, 'F&B Attendant Grade 2 / Cook Grade 1', false),
  ('MA000119', 'Level 3', '3', 3, 'F&B Supervisor / Cook Grade 2', true),
  ('MA000009', 'Level 1', '1', 1, 'Introductory', false),
  ('MA000009', 'Level 2', '2', 2, 'Level 2', false);

INSERT INTO public.award_rates (
  award_code, classification_level, classification_grade, employment_type,
  base_hourly_cents, casual_loaded_hourly_cents, effective_from, source_pr_reference
) VALUES
  ('MA000119', 'Level 1', '1', 'full_time', 2310, 2888, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 1', '1', 'part_time', 2310, 2888, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 1', '1', 'casual', 2310, 2888, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 2', '2', 'full_time', 2520, 3150, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 2', '2', 'part_time', 2520, 3150, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 2', '2', 'casual', 2520, 3150, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 3', '3', 'full_time', 2730, 3413, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 3', '3', 'part_time', 2730, 3413, '2025-07-01', 'PR786658'),
  ('MA000119', 'Level 3', '3', 'casual', 2730, 3413, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 1', '1', 'full_time', 2280, 2850, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 1', '1', 'part_time', 2280, 2850, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 1', '1', 'casual', 2280, 2850, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 2', '2', 'full_time', 2490, 3113, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 2', '2', 'part_time', 2490, 3113, '2025-07-01', 'PR786658'),
  ('MA000009', 'Level 2', '2', 'casual', 2490, 3113, '2025-07-01', 'PR786658');

INSERT INTO public.penalty_rates (
  award_code, employment_type_scope, day_type, time_start, time_end,
  uplift_type, uplift_value, effective_from, notes
) VALUES
  ('MA000119', 'ft_pt', 'saturday', '00:00', '24:00', 'percentage', 25, '2025-07-01', 'Saturday +25%'),
  ('MA000119', 'casual', 'saturday', '00:00', '24:00', 'percentage', 50, '2025-07-01', 'Saturday casual +50%'),
  ('MA000119', 'ft_pt', 'sunday', '00:00', '24:00', 'percentage', 50, '2025-07-01', 'Sunday +50%'),
  ('MA000119', 'casual', 'sunday', '00:00', '24:00', 'percentage', 75, '2025-07-01', 'Sunday casual +75%'),
  ('MA000119', 'all', 'mon_fri', '18:00', '24:00', 'dollar_per_hour', 281, '2025-07-01', 'Evening +$2.81/hr'),
  ('MA000119', 'all', 'mon_fri', '00:00', '06:00', 'dollar_per_hour', 422, '2025-07-01', 'Early morning +$4.22/hr'),
  ('MA000009', 'ft_pt', 'saturday', '00:00', '24:00', 'percentage', 25, '2025-07-01', 'Saturday +25%'),
  ('MA000009', 'casual', 'saturday', '00:00', '24:00', 'percentage', 50, '2025-07-01', 'Saturday casual +50%'),
  ('MA000009', 'ft_pt', 'sunday', '00:00', '24:00', 'percentage', 50, '2025-07-01', 'Sunday +50%'),
  ('MA000009', 'casual', 'sunday', '00:00', '24:00', 'percentage', 75, '2025-07-01', 'Sunday casual +75%');

INSERT INTO public.minimum_engagements (award_code, employment_type, day_type, minimum_hours, notes) VALUES
  ('MA000119', 'casual', 'regular', 3.00, 'MA000119 casual min engagement'),
  ('MA000119', 'full_time', 'public_holiday', 4.00, 'PH min engagement FT'),
  ('MA000009', 'casual', 'regular', 3.00, 'MA000009 casual min engagement');

INSERT INTO public.library_update_log (
  award_code, update_type, affected_record_count, source_reference, notes
) VALUES
  ('MA000119', 'annual_awr', 15, 'PR786658', 'Initial AWR 2025 seed MA000119'),
  ('MA000009', 'annual_awr', 12, 'PR786658', 'Initial AWR 2025 seed MA000009');
