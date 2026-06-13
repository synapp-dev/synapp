-- Stock counts module: locations, counts, entries, consumption, variance, schedules, templates.

CREATE TABLE public.venue_storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_storage_locations_venue_name_uq UNIQUE (venue_id, name)
);

CREATE INDEX idx_venue_storage_locations_venue ON public.venue_storage_locations (venue_id, display_order);

ALTER TABLE public.venue_storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_storage_locations_all ON public.venue_storage_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_storage_locations.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_storage_locations.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_storage_locations TO authenticated;

CREATE TABLE public.ingredient_storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.venue_storage_locations (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT ingredient_storage_locations_uq UNIQUE (ingredient_id, location_id)
);

CREATE INDEX idx_ingredient_storage_locations_location ON public.ingredient_storage_locations (location_id);

ALTER TABLE public.ingredient_storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredient_storage_locations_all ON public.ingredient_storage_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ingredients i
      JOIN public.user_organisations uo ON uo.organisation_id = i.organisation_id
      WHERE i.id = ingredient_storage_locations.ingredient_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ingredients i
      JOIN public.user_organisations uo ON uo.organisation_id = i.organisation_id
      WHERE i.id = ingredient_storage_locations.ingredient_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_storage_locations TO authenticated;

CREATE TABLE public.stock_count_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  cadence text NOT NULL DEFAULT 'weekly',
  cron_expression text,
  default_assignee_user_id uuid,
  default_scope_type text NOT NULL DEFAULT 'full',
  default_scope_filter jsonb NOT NULL DEFAULT '{}',
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_count_schedules_cadence_chk CHECK (
    cadence IN ('weekly', 'fortnightly', 'monthly', 'custom')
  ),
  CONSTRAINT stock_count_schedules_scope_type_chk CHECK (
    default_scope_type IN ('full', 'location', 'cycle', 'category')
  )
);

CREATE INDEX idx_stock_count_schedules_venue ON public.stock_count_schedules (venue_id);

ALTER TABLE public.stock_count_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_count_schedules_all ON public.stock_count_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = stock_count_schedules.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = stock_count_schedules.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_schedules TO authenticated;

CREATE TABLE public.stock_count_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  location_order jsonb NOT NULL DEFAULT '[]',
  ingredient_groupings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_count_templates_venue ON public.stock_count_templates (venue_id);

ALTER TABLE public.stock_count_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_count_templates_all ON public.stock_count_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = stock_count_templates.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venues v
      JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = stock_count_templates.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_templates TO authenticated;

CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.stock_count_schedules (id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.stock_count_templates (id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scope_type text NOT NULL DEFAULT 'full',
  scope_filter jsonb NOT NULL DEFAULT '{}',
  assignee_user_id uuid,
  created_by_user_id uuid NOT NULL,
  scheduled_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid,
  rejected_at timestamptz,
  rejected_by_user_id uuid,
  rejection_reason text,
  is_baseline boolean NOT NULL DEFAULT false,
  total_variance_cents bigint,
  total_variance_pct numeric,
  large_variance_owner_required boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_counts_status_chk CHECK (
    status IN (
      'scheduled',
      'in_progress',
      'pending_approval',
      'approved',
      'rejected',
      'archived'
    )
  ),
  CONSTRAINT stock_counts_scope_type_chk CHECK (
    scope_type IN ('full', 'location', 'cycle', 'category')
  )
);

CREATE INDEX idx_stock_counts_venue_status ON public.stock_counts (venue_id, status, created_at DESC);

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_counts_all ON public.stock_counts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = stock_counts.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = stock_counts.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;

CREATE TABLE public.stock_count_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.venue_storage_locations (id) ON DELETE SET NULL,
  previous_count_qty numeric,
  expected_qty numeric,
  counted_qty numeric,
  unit_used text,
  mixed_unit_breakdown jsonb,
  variance_qty numeric,
  variance_cents bigint,
  notes text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  needs_verification boolean NOT NULL DEFAULT false,
  is_recount_required boolean NOT NULL DEFAULT false,
  is_skipped boolean NOT NULL DEFAULT false,
  is_row_complete boolean NOT NULL DEFAULT false,
  counted_by_user_id uuid,
  counted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_count_entries_count_ingredient_uq UNIQUE (count_id, ingredient_id)
);

CREATE INDEX idx_stock_count_entries_count ON public.stock_count_entries (count_id);

ALTER TABLE public.stock_count_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_count_entries_all ON public.stock_count_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_entries.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_entries.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_entries TO authenticated;

CREATE TABLE public.ingredient_consumption_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  date date NOT NULL,
  qty_consumed_base_units numeric NOT NULL DEFAULT 0,
  source_recipe_count integer NOT NULL DEFAULT 0,
  source_sales_count integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_consumption_daily_uq UNIQUE (venue_id, ingredient_id, date)
);

CREATE INDEX idx_ingredient_consumption_daily_venue_date ON public.ingredient_consumption_daily (venue_id, date DESC);

ALTER TABLE public.ingredient_consumption_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredient_consumption_daily_all ON public.ingredient_consumption_daily
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = ingredient_consumption_daily.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venues v
      JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = ingredient_consumption_daily.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_consumption_daily TO authenticated;

CREATE TABLE public.stock_count_variance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  variance_qty numeric NOT NULL,
  variance_cents bigint NOT NULL,
  tagged_reason text,
  tagged_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_count_variance_events_reason_chk CHECK (
    tagged_reason IS NULL
    OR tagged_reason IN ('waste', 'theft', 'mis_count', 'known_breakage', 'unknown')
  )
);

CREATE INDEX idx_stock_count_variance_events_count ON public.stock_count_variance_events (count_id);

ALTER TABLE public.stock_count_variance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_count_variance_events_all ON public.stock_count_variance_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_variance_events.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_variance_events.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_variance_events TO authenticated;

CREATE TABLE public.stock_count_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts (id) ON DELETE CASCADE,
  actor_user_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_count_audit_events_count ON public.stock_count_audit_events (count_id, created_at DESC);

ALTER TABLE public.stock_count_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_count_audit_events_all ON public.stock_count_audit_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_audit_events.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stock_counts sc
      JOIN public.user_organisations uo ON uo.organisation_id = sc.organisation_id
      WHERE sc.id = stock_count_audit_events.count_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_audit_events TO authenticated;

ALTER TABLE public.organisation_purchasing_settings
  ADD COLUMN IF NOT EXISTS stock_count_large_variance_cents integer NOT NULL DEFAULT 50000;
