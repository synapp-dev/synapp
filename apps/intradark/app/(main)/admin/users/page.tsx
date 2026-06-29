import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { canManageUsers } from "@/entities/admin/lib/users-admin-access";
import {
  getProfileByUserId,
  listAdminUsers,
  listRoleCatalog,
} from "@/entities/admin/lib/users-admin-server";

import { UsersAdminClient } from "./_components/users-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!canManageUsers(slugs)) notFound();

  const [initial, roleCatalog, actor] = await Promise.all([
    listAdminUsers({ page: 1 }),
    listRoleCatalog(),
    getProfileByUserId(userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/admin" className="text-primary hover:underline">
            ← Admin
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Grant or revoke admin access. Tap a user to manage their roles.
        </p>
      </div>

      <UsersAdminClient
        initialData={initial}
        roleCatalog={roleCatalog}
        actorProfileId={actor?.profileId ?? null}
      />
    </div>
  );
}
