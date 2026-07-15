import { NextResponse, type NextRequest } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";

import { isOrganisationAdmin } from "@/server/auth/rbac";
import { scopeRepo } from "@/server/db/scope.repo";
import {
  attachSquareOAuthCookie,
  createSquareOAuthCookiePair,
} from "@/server/square/oauth-cookie";
import {
  oauthLogAuthorize,
  oauthWarnAuthorize,
} from "@/server/square/oauth-route-log";
import { getSquareOAuthEnvConfig } from "@/server/square/config";
import { buildSquareAuthorizeUrl } from "@/server/square/square-oauth";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import { runBackfillSquareSync } from "@/server/square/square-sync.service";
import {
  connectTestMirrorSquare,
  getTestModeSourceVenueId,
  isTestRunOrganisation,
} from "@/server/test-mode/test-mode";

export async function GET(request: NextRequest) {
  oauthLogAuthorize("request", {
    organisation: request.nextUrl.searchParams.get("organisation")?.trim() ?? "",
    venue: request.nextUrl.searchParams.get("venue")?.trim() ?? "",
  });

  const authorizeUrl = request.nextUrl.toString();

  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    oauthWarnAuthorize("unauthenticated", { authError: true });
    const signIn = new URL("/auth", request.nextUrl.origin);
    signIn.searchParams.set("next", authorizeUrl);
    return NextResponse.redirect(signIn);
  }

  const organisation = request.nextUrl.searchParams.get("organisation")?.trim() ?? "";
  const venue = request.nextUrl.searchParams.get("venue")?.trim() ?? "";
  const nextRaw = request.nextUrl.searchParams.get("next");

  if (!organisation || !venue) {
    oauthWarnAuthorize("missing_organisation_or_venue");
    return NextResponse.redirect(
      new URL("/dashboard?square_error=missing_params", request.nextUrl.origin),
    );
  }

  const context = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisation, venue),
  );
  if (!context) {
    oauthWarnAuthorize("venue_not_found", { organisation, venue });
    return NextResponse.redirect(
      new URL("/dashboard?square_error=venue_not_found", request.nextUrl.origin),
    );
  }

  if (!isOrganisationAdmin(ctx.tenantRoles, context.organisationId)) {
    oauthWarnAuthorize("forbidden_not_org_admin", {
      organisation,
      venue,
    });
    const dest = new URL(
      `/${organisation}/${venue}/settings/integrations`,
      request.nextUrl.origin,
    );
    dest.searchParams.set("square_error", "forbidden");
    return NextResponse.redirect(dest);
  }

  const nextPath = safeRelativeNextPath(nextRaw);

  // Test-run organisations skip Square OAuth entirely: connecting creates a
  // mirror of the configured source venue's connection, then returns to the
  // app exactly like a successful OAuth callback would.
  const testSourceVenueId = getTestModeSourceVenueId();
  if (
    testSourceVenueId &&
    (await isTestRunOrganisation(ctx.appDb, context.organisationId))
  ) {
    const mirror = await connectTestMirrorSquare(ctx.appDb, {
      venueId: context.venueId,
      organisationId: context.organisationId,
      sourceVenueId: testSourceVenueId,
    });
    const dest = new URL(
      nextPath ?? `/${organisation}/${venue}/settings/integrations`,
      request.nextUrl.origin,
    );
    if (!mirror.ok) {
      oauthWarnAuthorize("test_mirror_failed", { code: mirror.code });
      dest.searchParams.set("square_error", mirror.code);
      return NextResponse.redirect(dest);
    }

    oauthLogAuthorize("test_mirror_connected", {
      organisation,
      venue,
      venueId: context.venueId,
      sourceVenueId: testSourceVenueId,
    });

    const connection = await squareConnectionsRepo.loadConnectionForVenue(
      ctx.appDb,
      context.venueId,
      false,
    );
    if (connection) {
      void runBackfillSquareSync(ctx.appDb, {
        venueId: context.venueId,
        organisationId: context.organisationId,
        timezone: context.timezone ?? "Australia/Melbourne",
        accessToken: connection.squareAccessToken,
        environment: connection.environment,
        locationId: connection.squareLocationId,
      }).catch((error) => {
        console.error("[square/oauth] test-mirror backfill failed", error);
      });
    }

    dest.searchParams.set("square", "connected");
    return NextResponse.redirect(dest);
  }

  let squareUrl: string;
  let cookieValue: string;
  try {
    const { cookieValue: cv, stateParam } = createSquareOAuthCookiePair({
      venueId: context.venueId,
      organisationId: context.organisationId,
      userId: ctx.userId,
      orgSlug: organisation,
      venueSlug: venue,
      next: nextPath,
    });
    cookieValue = cv;
    squareUrl = buildSquareAuthorizeUrl(stateParam);

    let squareHost = "";
    try {
      squareHost = new URL(squareUrl).host;
    } catch {
      squareHost = "(invalid_square_url)";
    }

    const env = getSquareOAuthEnvConfig().environment;
    oauthLogAuthorize("redirecting_to_square", {
      organisation,
      venue,
      venueId: context.venueId,
      organisationId: context.organisationId,
      squareHost,
      environment: env,
      stateLength: stateParam.length,
    });
  } catch (e) {
    oauthWarnAuthorize("build_authorize_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.redirect(
      new URL("/dashboard?square_error=config", request.nextUrl.origin),
    );
  }

  const response = NextResponse.redirect(squareUrl, 302);
  attachSquareOAuthCookie(response, request, cookieValue);
  return response;
}
