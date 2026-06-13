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
