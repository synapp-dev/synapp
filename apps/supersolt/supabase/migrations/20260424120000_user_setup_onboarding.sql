-- Onboarding gate: explicit completion timestamp on user_profiles.
-- organisations: GST registration flag for wizard step 1.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS is_gst_registered boolean NOT NULL DEFAULT false;

-- Existing users who already have venue access are treated as onboarded.
UPDATE public.user_profiles up
SET setup_completed_at = now()
WHERE up.setup_completed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_organisations uo
    INNER JOIN public.user_venues uv
      ON uv.user_organisation_id = uo.id
      AND uv.organisation_id = uo.organisation_id
    WHERE uo.user_profile_id = up.id
      AND uo.is_active = true
      AND uo.archived_at IS NULL
      AND uv.is_active = true
      AND uv.archived_at IS NULL
  );
