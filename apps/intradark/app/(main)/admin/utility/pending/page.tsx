import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasUtilityEditorRole } from "@/entities/utility-lineups/lib/roles";
import { PendingUtilityLineupsAdminClient } from "@/entities/utility-lineups/components/pending-utility-lineups-admin-client";
import { listPendingUtilityLineupsForAdmin } from "@/entities/utility-lineups/lib/queries";

export default async function AdminUtilityPendingPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasUtilityEditorRole(slugs)) notFound();

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
          Review community uploads and publish them to the public utility map. Requires the{" "}
          <span className="font-medium">utility editor</span> role.
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
