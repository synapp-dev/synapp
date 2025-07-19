import { db } from "@/providers/postgres/drizzle/drizzle-client";
import { user_app_roles } from "@/providers/postgres/drizzle/schema";
import { app_roles } from "@/providers/postgres/drizzle/schema";
import { apps } from "@/providers/postgres/drizzle/schema";
import type { Tables } from "@/types/supabase";
import { eq } from "drizzle-orm";

export type UserAppRole = Tables<"user_app_roles">;

export async function getAllUserAppRoles(): Promise<
  (UserAppRole & {
    role_name: string;
    app: {
      id: string;
      name: string;
      description: string | null;
      slug: string | null;
    };
  })[]
> {
  const allRoles = await db
    .select({
      id: user_app_roles.id,
      app_id: user_app_roles.app_id,
      assigned_at: user_app_roles.assigned_at,
      expires_at: user_app_roles.expires_at,
      metadata: user_app_roles.metadata,
      notes: user_app_roles.notes,
      role_id: user_app_roles.role_id,
      user_id: user_app_roles.user_id,
      role_name: app_roles.name,
      app: {
        id: apps.id,
        name: apps.name,
        description: apps.description,
        slug: apps.slug,
      },
    })
    .from(user_app_roles)
    .leftJoin(
      app_roles,
      eq(user_app_roles.role_id, app_roles.id)
    )
    .leftJoin(
      apps,
      eq(user_app_roles.app_id, apps.id)
    );
  return allRoles.map((row) => ({
    ...row,
    app_id: row.app_id ?? "",
    role_id: row.role_id ?? "",
    user_id: row.user_id ?? "",
    metadata: row.metadata as any,
    role_name: row.role_name ?? "",
    app: {
      id: row.app?.id ?? "",
      name: row.app?.name ?? "",
      description: row.app?.description ?? null,
      slug: row.app?.slug ?? null,
    },
  }));
}

export async function getUserAppRolesByUserId(userId: string): Promise<
  (UserAppRole & {
    role_name: string;
    app: {
      id: string;
      name: string;
      description: string | null;
      slug: string | null;
    };
  })[]
> {
  const roles = await db
    .select({
      id: user_app_roles.id,
      app_id: user_app_roles.app_id,
      assigned_at: user_app_roles.assigned_at,
      expires_at: user_app_roles.expires_at,
      metadata: user_app_roles.metadata,
      notes: user_app_roles.notes,
      role_id: user_app_roles.role_id,
      user_id: user_app_roles.user_id,
      role_name: app_roles.name,
      app: {
        id: apps.id,
        name: apps.name,
        description: apps.description,
        slug: apps.slug,
      },
    })
    .from(user_app_roles)
    .leftJoin(
      app_roles,
      eq(user_app_roles.role_id, app_roles.id)
    )
    .leftJoin(
      apps,
      eq(user_app_roles.app_id, apps.id)
    )
    .where(eq(user_app_roles.user_id, userId));
  return roles.map((row) => ({
    ...row,
    app_id: row.app_id ?? "",
    role_id: row.role_id ?? "",
    user_id: row.user_id ?? "",
    metadata: row.metadata as any,
    role_name: row.role_name ?? "",
    app: {
      id: row.app?.id ?? "",
      name: row.app?.name ?? "",
      description: row.app?.description ?? null,
      slug: row.app?.slug ?? null,
    },
  }));
}
