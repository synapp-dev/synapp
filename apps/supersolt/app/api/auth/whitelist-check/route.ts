import { NextResponse } from "next/server";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { adminDb } from "@/server/db/drizzle";
import { listWhitelistedOrganisationsForEmail } from "@/server/organisations/members-auth-whitelist.service";
import { normalizeInviteEmail } from "@/server/organisations/members-policy";

type Body = {
  email?: string;
};

/**
 * Public pre-auth check: whether an email has any active whitelist row.
 * Returns generic shape — caller must not leak org details to unauthenticated users.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { data: { allowed: false }, error: null },
      { status: 200 },
    );
  }

  const raw = typeof body.email === "string" ? body.email.trim() : "";
  if (!raw.includes("@")) {
    return jsonDataResponse({ allowed: false });
  }

  const email = normalizeInviteEmail(raw);
  const rows = await listWhitelistedOrganisationsForEmail(
    { admin: adminDb },
    email,
  );

  const now = Date.now();
  const allowed = rows.some((row) => {
    if (!row.trialExpiresAt) return true;
    const ms = new Date(row.trialExpiresAt).getTime();
    return !Number.isNaN(ms) && ms > now;
  });

  return NextResponse.json({
    data: { allowed, organisationCount: allowed ? rows.length : 0 },
    error: null,
  });
}
