-- Migration: Create feature access control tables
-- This migration creates the features and feature_permissions tables
-- to enable hierarchical feature access control at global, role, school, and user levels

-- ============================================================================
-- 1. Create enum type for feature permission levels
-- ============================================================================
CREATE TYPE feature_permission_level AS ENUM ('global', 'role', 'school', 'user');

-- ============================================================================
-- 2. Create features table
-- ============================================================================
CREATE TABLE features (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	key text NOT NULL,
	name text NOT NULL,
	description text,
	category text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT features_key_key UNIQUE(key)
);

-- ============================================================================
-- 3. Create feature_permissions table
-- ============================================================================
CREATE TABLE feature_permissions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	feature_id uuid NOT NULL,
	level feature_permission_level NOT NULL,
	target_id uuid,
	enabled boolean DEFAULT true NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	created_by uuid,
	CONSTRAINT feature_permissions_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
	CONSTRAINT feature_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES user_profile(id) ON DELETE SET NULL,
	CONSTRAINT feature_permissions_unique UNIQUE(feature_id, level, target_id)
);

-- ============================================================================
-- 4. Create indexes for performance
-- ============================================================================
CREATE INDEX idx_feature_permissions_feature_id ON feature_permissions USING btree (feature_id);
CREATE INDEX idx_feature_permissions_level_target ON feature_permissions USING btree (level, target_id);
CREATE INDEX idx_feature_permissions_target_id ON feature_permissions USING btree (target_id);

-- ============================================================================
-- 5. Add comments
-- ============================================================================
COMMENT ON TABLE features IS 'Stores available features that can be controlled';
COMMENT ON TABLE feature_permissions IS 'Stores permission settings at different levels (global, role, school, user)';
COMMENT ON COLUMN feature_permissions.level IS 'The scope of this permission: global (all users), role (specific role), school (specific school), user (specific user)';
COMMENT ON COLUMN feature_permissions.target_id IS 'ID of the target: NULL for global, role.id for role, school.id for school, user_profile.id for user';
COMMENT ON COLUMN feature_permissions.enabled IS 'Whether feature is enabled at this level';

-- ============================================================================
-- 6. Enable Row Level Security (optional, for future use)
-- ============================================================================
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Grant access to authenticated users
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_permissions TO authenticated;
