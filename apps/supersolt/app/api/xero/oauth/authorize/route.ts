import { NextResponse, type NextRequest } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";

import { isOrganisationAdmin } from "@/server/auth/rbac";
import { scopeRepo } from "@/server/db/scope.repo";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import { getXeroOAuthEnvConfig } from "@/server/xero/config";
import {
  attachXeroOAuthCookie,
  createXeroOAuthCookiePair,
} from "@/server/xero/oauth-cookie";
import { buildXeroAuthorizeUrl } from "@/server/xero/xero-oauth";
import {
  connectTestMirrorXero,
  getTestModeSourceVenueId,
  isTestRunOrganisation,
} from "@/server/test-mode/test-mode";

function redirectWithXeroError(request: NextRequest, nextPath: string, code: string) {
  const dest = new URL(nextPath, request.nextUrl.origin);
  dest.searchParams.set("xero_error", code);
  return NextResponse.redirect(dest);
}

export async function GET(request: NextRequest) {
  const config = getXeroOAuthEnvConfig();
  const defaultNext = "/setup?step=4";
  const nextPath =
    safeRelativeNextPath(request.nextUrl.searchParams.get("next")) ?? defaultNext;

  if (!config.isConfigured) {
    return redirectWithXeroError(request, nextPath, "config");
  }

  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    const signIn = new URL("/auth", request.nextUrl.origin);
    signIn.searchParams.set("next", request.nextUrl.toString());
    return NextResponse.redirect(signIn);
  }

  const organisation = request.nextUrl.searchParams.get("organisation")?.trim() ?? "";
  const venue = request.nextUrl.searchParams.get("venue")?.trim() ?? "";

  if (!organisation || !venue) {
    return redirectWithXeroError(request, nextPath, "missing_params");
  }

  const context = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisation, venue),
  );
  if (!context) {
    return redirectWithXeroError(request, nextPath, "venue_not_found");
  }

  if (!isOrganisationAdmin(ctx.tenantRoles, context.organisationId)) {
    return redirectWithXeroError(request, nextPath, "forbidden");
  }

  // Test-run organisations skip Xero OAuth entirely: connecting creates a
  // mirror of the configured source venue's connection, then returns to the
  // app exactly like a successful OAuth callback would.
  const testSourceVenueId = getTestModeSourceVenueId();
  if (
    testSourceVenueId &&
    (await isTestRunOrganisation(ctx.appDb, context.organisationId))
  ) {
    const mirror = await connectTestMirrorXero(ctx.appDb, {
      venueId: context.venueId,
      organisationId: context.organisationId,
      sourceVenueId: testSourceVenueId,
    });
    if (!mirror.ok) {
      return redirectWithXeroError(request, nextPath, mirror.code);
    }
    const dest = new URL(nextPath, request.nextUrl.origin);
    dest.searchParams.set("xero", "connected");
    return NextResponse.redirect(dest);
  }

  let xeroUrl: string;
  let cookieValue: string;
  try {
    const { cookieValue: cv, stateParam } = createXeroOAuthCookiePair({
      venueId: context.venueId,
      organisationId: context.organisationId,
      userId: ctx.userId,
      orgSlug: organisation,
      venueSlug: venue,
      next: nextPath,
    });
    cookieValue = cv;
    xeroUrl = buildXeroAuthorizeUrl(stateParam);
  } catch {
    return redirectWithXeroError(request, nextPath, "config");
  }

  const response = NextResponse.redirect(xeroUrl, 302);
  attachXeroOAuthCookie(response, request, cookieValue);
  return response;
}
