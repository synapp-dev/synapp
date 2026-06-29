import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_SANDBOX_ACCESS } from "@/entities/admin/lib/rbac-constants";

import { DemosHarness } from "./demos-harness";

export const dynamic = "force-dynamic";

/**
 * Staff demo-parser playground. Upload a CS2 `.dem`, then pull curated insights
 * (scoreboard, kill feed, rounds, utility…) via @laihoe/demoparser2 server-side.
 * Gated by `sandbox.access`; parsing runs on the Node runtime only.
 */
export default async function AdminDevToolsDemosPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasCapability(slugs, ROLE_SANDBOX_ACCESS)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Demo parser</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CS2 demo (<code className="rounded bg-muted px-1 py-0.5 text-xs">.dem</code>)
          and pull curated insights out of it with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">@laihoe/demoparser2</code>.
          Localhost devtool — the native parser runs server-side.
        </p>
      </div>
      <DemosHarness />
    </div>
  );
}
