import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";

import {
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
  ROLE_UTILITY_EDITOR,
} from "./rbac-constants";

/** Slugs that mark a profile as "admin" for the admins-first list ordering. */
export const ADMIN_SLUGS_FOR_SORT: readonly string[] = [
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
  ROLE_UTILITY_EDITOR,
];

export const USERS_PAGE_SIZE = 25;

export type AdminUserRow = {
  profileId: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  /** Directly-granted capability slugs (from `user_roles`). */
  slugs: string[];
};

export type AdminUsersPage = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type RoleCatalogRow = {
  slug: string;
  label: string;
  description: string | null;
};

type Rows = Array<Record<string, unknown>>;

function slugInList(slugs: readonly string[]) {
  return sql.join(
    slugs.map((s) => sql`${s}`),
    sql`, `,
  );
}

/** Paginated user directory with directly-granted slugs; admins sorted first. */
export async function listAdminUsers(opts: {
  q?: string;
  page?: number;
}): Promise<AdminUsersPage> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = USERS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const q = opts.q?.trim();
  const like = q ? `%${q}%` : null;

  const where = like
    ? sql`WHERE (up.username ILIKE ${like} OR up.display_name ILIKE ${like} OR up.email ILIKE ${like})`
    : sql``;

  const adminIn = slugInList(ADMIN_SLUGS_FOR_SORT);

  const rowsRes = (await db.execute(sql`
    SELECT
      up.id          AS profile_id,
      up.user_id     AS user_id,
      up.username    AS username,
      up.display_name AS display_name,
      up.email       AS email,
      up.avatar_url  AS avatar_url,
      up.created_at  AS created_at,
      COALESCE(array_remove(array_agg(DISTINCT r.slug), NULL), ARRAY[]::text[]) AS slugs,
      COALESCE(bool_or(r.slug IN (${adminIn})), false) AS is_admin
    FROM user_profiles up
    LEFT JOIN user_roles ur ON ur.user_profile_id = up.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ${where}
    GROUP BY up.id
    ORDER BY is_admin DESC, up.created_at DESC NULLS LAST
    LIMIT ${pageSize} OFFSET ${offset}
  `)) as unknown as Rows;

  const countRes = (await db.execute(sql`
    SELECT COUNT(*)::int AS total FROM user_profiles up ${where}
  `)) as unknown as Rows;

  const rows: AdminUserRow[] = rowsRes.map((r) => ({
    profileId: String(r.profile_id),
    userId: String(r.user_id),
    username: (r.username as string | null) ?? null,
    displayName: (r.display_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
    slugs: Array.isArray(r.slugs) ? (r.slugs as string[]) : [],
  }));

  const total = Number(countRes[0]?.total ?? 0);
  return { rows, total, page, pageSize };
}

/** Full role catalog for the advanced raw-slug editor. */
export async function listRoleCatalog(): Promise<RoleCatalogRow[]> {
  const res = (await db.execute(sql`
    SELECT slug, label, description FROM roles ORDER BY slug
  `)) as unknown as Rows;
  return res.map((r) => ({
    slug: String(r.slug),
    label: String(r.label),
    description: (r.description as string | null) ?? null,
  }));
}

export type ProfileIdentity = {
  profileId: string;
  userId: string;
  email: string | null;
};

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileIdentity | null> {
  const res = (await db.execute(sql`
    SELECT id, user_id, email FROM user_profiles WHERE user_id = ${userId} LIMIT 1
  `)) as unknown as Rows;
  const row = res[0];
  if (!row) return null;
  return {
    profileId: String(row.id),
    userId: String(row.user_id),
    email: (row.email as string | null) ?? null,
  };
}

export async function getProfileById(
  profileId: string,
): Promise<ProfileIdentity | null> {
  const res = (await db.execute(sql`
    SELECT id, user_id, email FROM user_profiles WHERE id = ${profileId}::uuid LIMIT 1
  `)) as unknown as Rows;
  const row = res[0];
  if (!row) return null;
  return {
    profileId: String(row.id),
    userId: String(row.user_id),
    email: (row.email as string | null) ?? null,
  };
}

/** Directly-granted slugs for a single profile (excludes template-derived). */
export async function getDirectSlugsForProfile(
  profileId: string,
): Promise<string[]> {
  const res = (await db.execute(sql`
    SELECT r.slug
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_profile_id = ${profileId}::uuid
    ORDER BY r.slug
  `)) as unknown as Rows;
  return res.map((r) => String(r.slug));
}

/** Insert `slugs` as `user_roles` rows (idempotent). Unknown slugs are ignored. */
export async function grantSlugsToProfile(
  profileId: string,
  slugs: readonly string[],
  grantedByProfileId: string | null,
): Promise<void> {
  if (slugs.length === 0) return;
  await db.execute(sql`
    INSERT INTO user_roles (user_profile_id, role_id, granted_by)
    SELECT ${profileId}::uuid, r.id, ${grantedByProfileId}::uuid
    FROM roles r
    WHERE r.slug IN (${slugInList(slugs)})
    ON CONFLICT (user_profile_id, role_id) DO NOTHING
  `);
}

/** Delete the `user_roles` rows matching `slugs` for a profile (idempotent). */
export async function revokeSlugsFromProfile(
  profileId: string,
  slugs: readonly string[],
): Promise<void> {
  if (slugs.length === 0) return;
  await db.execute(sql`
    DELETE FROM user_roles ur
    USING roles r
    WHERE ur.role_id = r.id
      AND ur.user_profile_id = ${profileId}::uuid
      AND r.slug IN (${slugInList(slugs)})
  `);
}
