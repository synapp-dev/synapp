import "server-only";

import { NextResponse } from "next/server";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_SANDBOX_ACCESS } from "@/entities/admin/lib/rbac-constants";

import { RedlineApiError, RedlineNotConfiguredError } from "./client";

/**
 * Gate Redline routes behind the same `sandbox.access` capability as the
 * sandbox UI, so the API key is only ever exercised by staff. Returns a
 * `NextResponse` to short-circuit on failure, or `null` when authorized.
 */
export async function guardRedlineRoute(): Promise<NextResponse | null> {
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

/** Map client errors to clean HTTP responses for the test harness. */
export function redlineErrorResponse(err: unknown): NextResponse {
  if (err instanceof RedlineNotConfiguredError) {
    return NextResponse.json({ error: err.message, configured: false }, { status: 503 });
  }
  if (err instanceof RedlineApiError) {
    return NextResponse.json(
      { error: err.message, status: err.status, body: err.body },
      { status: 502 },
    );
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}
