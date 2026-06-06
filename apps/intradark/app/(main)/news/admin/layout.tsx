import { notFound, redirect } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasNewsEditorRole } from "@/entities/news/lib/roles";

export default async function NewsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/auth");
  }

  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasNewsEditorRole(slugs)) {
    notFound();
  }

  return <>{children}</>;
}
