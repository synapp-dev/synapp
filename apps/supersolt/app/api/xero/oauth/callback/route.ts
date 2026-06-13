import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";

import { venues, venueXeroConnections } from "@/server/db/schema";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import {
  clearXeroOAuthCookie,
  verifyXeroOAuthCookie,
  XERO_OAUTH_COOKIE,
} from "@/server/xero/oauth-cookie";
import {
  exchangeXeroAuthorizationCode,
  listXeroConnections,
  tokenExpiresAtIso,
} from "@/server/xero/xero-oauth";
import { syncVenueXeroSuppliers } from "@/server/xero/xero-suppliers.service";

function redirectWithXeroError(
  request: NextRequest,
  nextPath: string,
  code: string,
  detail?: string,
) {
  const dest = new URL(nextPath, request.nextUrl.origin);
  dest.searchParams.set("xero_error", code);
  if (detail) {
    dest.searchParams.set("xero_error_detail", detail.slice(0, 500));
  }
  return dest;
}

export async function GET(request: NextRequest) {
  const stateParam = request.nextUrl.searchParams.get("state") ?? "";
  const codeParam = request.nextUrl.searchParams.get("code");
  const cookieRaw = request.cookies.get(XERO_OAUTH_COOKIE)?.value;

  const defaultNext = "/setup?step=4";

  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const verified = verifyXeroOAuthCookie(cookieRaw, stateParam);
  const fallbackNext =
    verified.ok && verified.payload.next
      ? (safeRelativeNextPath(verified.payload.next) ?? defaultNext)
      : defaultNext;

  if (!verified.ok) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, `state_${verified.reason}`),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const { payload } = verified;
  if (payload.userId !== ctx.userId) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "wrong_user"),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorDescription =
    request.nextUrl.searchParams.get("error_description") ?? undefined;
  if (oauthError) {
    const nextPath = safeRelativeNextPath(payload.next) ?? defaultNext;
    const errorCode =
      oauthError === "access_denied" &&
      oauthErrorDescription?.toLowerCase().includes("scope")
        ? "invalid_scope"
        : oauthError;
    const res = NextResponse.redirect(
      redirectWithXeroError(request, nextPath, errorCode, oauthErrorDescription),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const code = codeParam;
  if (!code) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "missing_code"),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const venueRows = await ctx.appDb.admin
    .select({ id: venues.id, organisationId: venues.organisationId })
    .from(venues)
    .where(
      and(
        eq(venues.id, payload.venueId),
        eq(venues.organisationId, payload.organisationId),
        eq(venues.isActive, true),
        isNull(venues.archivedAt),
      ),
    )
    .limit(1);

  const venueRow = venueRows[0];
  if (!venueRow) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "venue_not_found"),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const exchange = await exchangeXeroAuthorizationCode(code);
  if (!exchange.ok) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "token_exchange", exchange.message),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const connections = await listXeroConnections(exchange.token.access_token);
  if (!connections.ok) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "connections", connections.message),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  if (connections.connections.length === 0) {
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "no_tenant"),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  const tenant = connections.connections[0]!;
  const tokenExpires = tokenExpiresAtIso(exchange.token.expires_in);
  const nowIso = new Date().toISOString();

  try {
    await ctx.appDb.admin
      .insert(venueXeroConnections)
      .values({
        venueId: payload.venueId,
        organisationId: payload.organisationId,
        xeroTenantId: tenant.tenantId,
        xeroTenantName: tenant.tenantName,
        xeroAccessToken: exchange.token.access_token,
        xeroRefreshToken: exchange.token.refresh_token,
        tokenExpiresAt: tokenExpires,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: venueXeroConnections.venueId,
        set: {
          xeroTenantId: tenant.tenantId,
          xeroTenantName: tenant.tenantName,
          xeroAccessToken: exchange.token.access_token,
          xeroRefreshToken: exchange.token.refresh_token,
          tokenExpiresAt: tokenExpires,
          updatedAt: nowIso,
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const res = NextResponse.redirect(
      redirectWithXeroError(request, fallbackNext, "save_failed", message),
      302,
    );
    clearXeroOAuthCookie(res, request);
    return res;
  }

  try {
    await syncVenueXeroSuppliers(ctx, {
      organisationSlug: payload.orgSlug,
      venueSlug: payload.venueSlug,
    });
  } catch (error) {
    console.error("[xero] oauth callback: initial supplier sync failed", {
      venueId: payload.venueId,
      error: error instanceof Error ? error.message : error,
    });
  }

  const nextPath = safeRelativeNextPath(payload.next) ?? defaultNext;
  const dest = new URL(nextPath, request.nextUrl.origin);
  dest.searchParams.delete("xero_error");
  dest.searchParams.delete("xero_error_detail");
  if (!dest.searchParams.has("xero")) {
    dest.searchParams.set("xero", "connected");
  }

  const res = NextResponse.redirect(dest, 302);
  clearXeroOAuthCookie(res, request);
  return res;
}
