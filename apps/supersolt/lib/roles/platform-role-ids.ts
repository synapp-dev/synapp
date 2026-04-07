/** Stable UUIDs from migration 20260408120000_roles_normalisation.sql */
export const PLATFORM_ROLE_IDS = {
  owner: "a0000001-0000-4000-8000-000000000001",
  admin: "a0000001-0000-4000-8000-000000000002",
  manager: "a0000001-0000-4000-8000-000000000003",
  supervisor: "a0000001-0000-4000-8000-000000000004",
  crew: "a0000001-0000-4000-8000-000000000005",
} as const;

export type PlatformRoleSlug = keyof typeof PLATFORM_ROLE_IDS;
