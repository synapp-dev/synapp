import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasUtilityEditorRole } from "@/entities/utility-lineups/lib/roles";

import { AdminSectionIndex } from "../_components/admin-section-index";

export const dynamic = "force-dynamic";

export default async function AdminUtilityPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasUtilityEditorRole(slugs)) notFound();

  return <AdminSectionIndex href="/admin/utility" slugs={slugs} />;
}
