import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_SANDBOX_ACCESS } from "@/entities/admin/lib/rbac-constants";

export default async function AdminSandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) notFound();

  const slugs = await getRoleSlugsForUser(userId);
  if (!hasCapability(slugs, ROLE_SANDBOX_ACCESS)) notFound();

  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading sandbox…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
