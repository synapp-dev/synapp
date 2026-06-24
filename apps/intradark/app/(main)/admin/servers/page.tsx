import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_SANDBOX_ACCESS } from "@/entities/admin/lib/rbac-constants";
import { isRedlineConfigured } from "@/entities/redline/lib/client";

import { ServersManagerClient } from "./servers-manager-client";
import { RedlineTestConsole } from "./redline-test-console";

/**
 * Manage live CS2 game servers via the Redline provisioning API. Gated by the
 * same `sandbox.access` capability as the `/api/redline/*` routes, so the API
 * key is only ever exercised by staff. Listing + lifecycle (power, delete) live
 * here; raw provisioning experiments stay in the sandbox Redline harness.
 */
export default async function AdminServersPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasCapability(slugs, ROLE_SANDBOX_ACCESS)) notFound();

  const configured = isRedlineConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Servers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          List, power-cycle, and tear down CS2 game servers provisioned through
          Redline. Calls proxy through <code className="text-xs">/api/redline/*</code> so
          the API key stays server-side.
        </p>
      </div>
      <ServersManagerClient configured={configured} />

      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Test console</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Build and fire Redline requests by hand; every call lands in the console with
          its payload, status, and response.
        </p>
        <div className="mt-4">
          <RedlineTestConsole configured={configured} />
        </div>
      </div>
    </div>
  );
}
