import "server-only";

import { NextResponse } from "next/server";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_SANDBOX_ACCESS } from "@/entities/admin/lib/rbac-constants";

/**
 * Gate demo-parser routes behind `sandbox.access`, matching the DevTools UI.
 * Returns a `NextResponse` to short-circuit on failure, or `null` if allowed.
 */
export async function guardDemoRoute(): Promise<NextResponse | null> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasCapability(slugs, ROLE_SANDBOX_ACCESS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
