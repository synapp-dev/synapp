import { notFound, redirect } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
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

  const slugs = await getRoleSlugsForUser(userId);
  if (!hasNewsEditorRole(slugs)) {
    notFound();
  }

  return <>{children}</>;
}
