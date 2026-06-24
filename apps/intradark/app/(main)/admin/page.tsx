import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasAnyAdminSlug } from "@/entities/admin/lib/role-slugs";
import { ADMIN_AREA_SLUGS } from "@/entities/admin/lib/rbac-constants";
import { ADMIN_NAV_ITEMS } from "@/entities/admin/lib/admin-nav";

import { AdminSectionCards } from "./_components/admin-section-cards";

export default async function AdminHomePage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasAnyAdminSlug(slugs, ADMIN_AREA_SLUGS)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff tools gated by role. Sections you can’t access are greyed out.
        </p>
      </div>

      <AdminSectionCards items={ADMIN_NAV_ITEMS} slugs={slugs} />
    </div>
  );
}
