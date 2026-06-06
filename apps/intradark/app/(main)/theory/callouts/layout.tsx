import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
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

  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();

  return <>{children}</>;
}
