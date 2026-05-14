import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";

export const dynamic = "force-dynamic";

export default async function TheoryCalloutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) notFound();

  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();

  return <>{children}</>;
}
