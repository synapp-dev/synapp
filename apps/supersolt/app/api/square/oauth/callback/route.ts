import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";

import { venues, venueSquareConnections } from "@/server/db/schema";
import {
  getOptionalSquareLocationIdFromEnv,
  getSquareOAuthEnvConfig,
} from "@/server/square/config";
import {
  clearSquareOAuthCookie,
  SQUARE_OAUTH_COOKIE,
  verifySquareOAuthCookie,
} from "@/server/square/oauth-cookie";
import {
  oauthAuthCodeHint,
  oauthLogCallback,
  oauthWarnCallback,
} from "@/server/square/oauth-route-log";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import {
  exchangeSquareAuthorizationCode,
  tokenExpiresAtIso,
} from "@/server/square/square-oauth";
import { runBackfillSquareSync } from "@/server/square/square-sync.service";

function defaultSettingsUrl(
  request: NextRequest,
  orgSlug: string,
  venueSlug: string,
  extraParams?: Record<string, string>,
): URL {
  const url = new URL(
    `/${orgSlug}/${venueSlug}/settings/integrations`,
    request.nextUrl.origin,
  );
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url;
}

function squareOAuthReturnUrl(
  request: NextRequest,
  payload: { next?: string | null; orgSlug: string; venueSlug: string },
  extraParams?: Record<string, string>,
): URL {
  const nextPath = safeRelativeNextPath(payload.next);
  if (nextPath) {
    const dest = new URL(nextPath, request.nextUrl.origin);
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        dest.searchParams.set(k, v);
      }
    }
    return dest;
  }
  return defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, extraParams);
}

export async function GET(request: NextRequest) {
  const stateParam = request.nextUrl.searchParams.get("state") ?? "";
  const codeParam = request.nextUrl.searchParams.get("code");
  const cookieRaw = request.cookies.get(SQUARE_OAUTH_COOKIE)?.value;

  oauthLogCallback("request", {
    hasSquareError: Boolean(request.nextUrl.searchParams.get("error")),
    hasCode: Boolean(codeParam),
    hasState: Boolean(stateParam),
    cookiePresent: Boolean(cookieRaw),
  });

  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const verified = verifySquareOAuthCookie(cookieRaw, stateParam);
  if (!verified.ok) {
    oauthWarnCallback("state_verification_failed", {
      reason: verified.reason,
    });
    const res = NextResponse.redirect(
      new URL(`/dashboard?square_error=state_${verified.reason}`, request.nextUrl.origin),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const { payload } = verified;
  if (payload.userId !== ctx.userId) {
    oauthWarnCallback("wrong_user", {
      startedAsUserId: payload.userId,
      sessionUserId: ctx.userId,
    });
    const res = NextResponse.redirect(
      new URL("/dashboard?square_error=wrong_user", request.nextUrl.origin),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const code = codeParam;
  if (!code) {
    oauthWarnCallback("missing_authorization_code", {
      organisation: payload.orgSlug,
      venue: payload.venueSlug,
    });
    const res = NextResponse.redirect(
      squareOAuthReturnUrl(request, payload, {
        square_error: "missing_code",
      }),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const venueRows = await ctx.appDb.admin
    .select({
      id: venues.id,
      organisationId: venues.organisationId,
      timezone: venues.timezone,
    })
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
    oauthWarnCallback("venue_lookup_failed", {
      venueId: payload.venueId,
      dbError: false,
    });
    const res = NextResponse.redirect(
      squareOAuthReturnUrl(request, payload, {
        square_error: "venue_not_found",
      }),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  oauthLogCallback("exchanging_code", {
    code: oauthAuthCodeHint(code),
    venueId: payload.venueId,
  });

  const exchange = await exchangeSquareAuthorizationCode(code);
  if (!exchange.ok) {
    oauthWarnCallback("token_exchange_failed", {
      message: exchange.message.slice(0, 500),
    });
    const res = NextResponse.redirect(
      squareOAuthReturnUrl(request, payload, {
        square_error: "token_exchange",
        square_error_detail: exchange.message,
      }),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const envLabel = getSquareOAuthEnvConfig().environment;
  const envLoc = getOptionalSquareLocationIdFromEnv();

  const existingRows = await ctx.appDb.admin
    .select({
      squareMerchantId: venueSquareConnections.squareMerchantId,
      squareLocationId: venueSquareConnections.squareLocationId,
    })
    .from(venueSquareConnections)
    .where(eq(venueSquareConnections.venueId, payload.venueId))
    .limit(1);

  const existing = existingRows[0];
  const newMerchantId = exchange.token.merchant_id;
  const priorMerchantId = existing?.squareMerchantId?.trim() ?? "";
  const sameSquareSeller =
    priorMerchantId.length > 0 && priorMerchantId === newMerchantId;

  const squareLocationId = envLoc
    ? envLoc
    : sameSquareSeller
      ? (existing?.squareLocationId ?? null)
      : null;

  const tokenExpires = tokenExpiresAtIso(exchange.token.expires_at);
  const nowIso = new Date().toISOString();

  try {
    await ctx.appDb.admin
      .insert(venueSquareConnections)
      .values({
        venueId: payload.venueId,
        organisationId: payload.organisationId,
        squareMerchantId: exchange.token.merchant_id,
        squareAccessToken: exchange.token.access_token,
        squareRefreshToken: exchange.token.refresh_token,
        tokenExpiresAt: tokenExpires,
        environment: envLabel,
        squareLocationId,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: venueSquareConnections.venueId,
        set: {
          squareMerchantId: exchange.token.merchant_id,
          squareAccessToken: exchange.token.access_token,
          squareRefreshToken: exchange.token.refresh_token,
          tokenExpiresAt: tokenExpires,
          environment: envLabel,
          squareLocationId,
          updatedAt: nowIso,
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    oauthWarnCallback("database_upsert_failed", {
      message: message.slice(0, 500),
    });
    const res = NextResponse.redirect(
      squareOAuthReturnUrl(request, payload, {
        square_error: "save_failed",
        square_error_detail: message,
      }),
      302,
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  oauthLogCallback("connected", {
    merchantId: exchange.token.merchant_id,
    venueId: payload.venueId,
    environment: envLabel,
  });

  void runBackfillSquareSync(ctx.appDb, {
    venueId: payload.venueId,
    organisationId: payload.organisationId,
    timezone: venueRow.timezone,
    accessToken: exchange.token.access_token,
    environment: envLabel,
    locationId: squareLocationId,
  }).catch((error) => {
    console.error("[square/oauth] post-connect backfill failed", error);
  });

  const nextPath = safeRelativeNextPath(payload.next);
  const defaultSuccess = defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, {
    square: "connected",
  });

  if (nextPath) {
    oauthLogCallback("redirect_after_success", { nextPath });
    const dest = new URL(nextPath, request.nextUrl.origin);
    if (!dest.searchParams.has("square")) {
      dest.searchParams.set("square", "connected");
    }
    const res = NextResponse.redirect(dest, 302);
    clearSquareOAuthCookie(res, request);
    return res;
  }

  oauthLogCallback("redirect_after_success", { path: "default_settings" });
  const res = NextResponse.redirect(defaultSuccess, 302);
  clearSquareOAuthCookie(res, request);
  return res;
}
