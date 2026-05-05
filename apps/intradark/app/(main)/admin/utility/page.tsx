import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { UtilityMapsAdminClient } from "@/entities/utility-lineups/components/utility-maps-admin-client";
import {
  listMapPools,
  listMapsWithPoolsForAdmin,
} from "@/entities/utility-lineups/lib/queries";

export default async function AdminUtilityMapsPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();

  const [rows, pools] = await Promise.all([
    listMapsWithPoolsForAdmin(),
    listMapPools(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utility — maps</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit canonical <code className="text-xs">maps</code> rows (pools, radar URL, active
          flag). Requires <span className="font-medium">developer</span> role.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No maps yet. Insert rows into <code className="text-xs">public.maps</code> (with a{" "}
          <code className="text-xs">pool_id</code>) to manage them here.
        </p>
      ) : (
        <UtilityMapsAdminClient rows={rows} pools={pools} />
      )}
    </div>
  );
}
