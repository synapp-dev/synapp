import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasAnyAdminSlug } from "@/entities/admin/lib/role-slugs";
import { ADMIN_AREA_SLUGS } from "@/entities/admin/lib/rbac-constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) notFound();

  const slugs = await getRoleSlugsForUser(userId);
  if (!hasAnyAdminSlug(slugs, ADMIN_AREA_SLUGS)) notFound();

  return <>{children}</>;
}
