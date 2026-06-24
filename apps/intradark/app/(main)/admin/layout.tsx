import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasAnyAdminSlug } from "@/entities/admin/lib/role-slugs";
import { ADMIN_AREA_SLUGS } from "@/entities/admin/lib/rbac-constants";

import { AdminSectionSwitcher } from "./admin-section-switcher";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) notFound();

  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasAnyAdminSlug(slugs, ADMIN_AREA_SLUGS)) notFound();

  return (
    <div className="space-y-6">
      <AdminSectionSwitcher slugs={slugs} />
      {children}
    </div>
  );
}
