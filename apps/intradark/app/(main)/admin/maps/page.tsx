import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { MapsAdminClient } from "@/entities/utility-lineups/components/maps-admin-client";
import type { UtilityMapSpotRow } from "@/entities/utility-lineups/components/map-spots-admin-section";
import {
  listAllUtilityMapSpotsForAdmin,
  listMapPools,
  listMapsWithPoolsForAdmin,
} from "@/entities/utility-lineups/lib/queries";

export default async function AdminMapsPage({
  searchParams,
}: {
  searchParams: Promise<{ map?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();

  const { map: mapSlugFromQuery } = await searchParams;

  const [rows, pools, spots] = await Promise.all([
    listMapsWithPoolsForAdmin(),
    listMapPools(),
    listAllUtilityMapSpotsForAdmin(),
  ]);

  const spotsByMapId: Record<string, UtilityMapSpotRow[]> = {};
  for (const s of spots) {
    const list = spotsByMapId[s.mapId];
    if (list) {
      list.push(s);
    } else {
      spotsByMapId[s.mapId] = [s];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maps</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit canonical <code className="text-xs">maps</code> rows (pool, radar, badge & map
          screenshot URLs,
          active flag, sort order) and{" "}
          <code className="text-xs">utility_map_spots</code> callouts. Requires{" "}
          <span className="font-medium">developer</span> role.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No maps yet. Insert rows into <code className="text-xs">public.maps</code> (with a{" "}
          <code className="text-xs">pool_id</code>) to manage them here.
        </p>
      ) : (
        <MapsAdminClient
          rows={rows}
          pools={pools}
          spotsByMapId={spotsByMapId}
          defaultMapSlug={mapSlugFromQuery}
        />
      )}
    </div>
  );
}
