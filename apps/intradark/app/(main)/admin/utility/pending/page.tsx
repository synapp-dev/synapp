import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { PendingUtilityLineupsAdminClient } from "@/entities/utility-lineups/components/pending-utility-lineups-admin-client";
import { listPendingUtilityLineupsForAdmin } from "@/entities/utility-lineups/lib/queries";

export default async function AdminUtilityPendingPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();

  const rows = await listPendingUtilityLineupsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/admin" className="text-primary hover:underline">
            ← Admin
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Pending utility lineups</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review community uploads and publish them to the public utility map. Requires{" "}
          <span className="font-medium">developer</span> role.
        </p>
      </div>
      <PendingUtilityLineupsAdminClient
        rows={rows.map((r) => ({
          lineup: {
            id: r.lineup.id,
            description: r.lineup.description,
            grenadeType: r.lineup.grenadeType,
            side: r.lineup.side,
            createdAt: r.lineup.createdAt,
          },
          mapSlug: r.mapSlug,
          mapDisplayName: r.mapDisplayName,
        }))}
      />
    </div>
  );
}
