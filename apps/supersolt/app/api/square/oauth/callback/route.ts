import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
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

function defaultSettingsUrl(
  request: NextRequest,
  orgSlug: string,
  venueSlug: string,
  extraParams?: Record<string, string>
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

export async function GET(request: NextRequest) {
  const squareError = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const stateParam = request.nextUrl.searchParams.get("state") ?? "";
  const codeParam = request.nextUrl.searchParams.get("code");
  const cookieRaw = request.cookies.get(SQUARE_OAUTH_COOKIE)?.value;

  oauthLogCallback("request", {
    hasSquareError: Boolean(squareError),
    hasCode: Boolean(codeParam),
    hasState: Boolean(stateParam),
    cookiePresent: Boolean(cookieRaw),
  });

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const verified = verifySquareOAuthCookie(cookieRaw, stateParam);
  const orgSlug = verified.ok ? verified.payload.orgSlug : "";
  const venueSlug = verified.ok ? verified.payload.venueSlug : "";

  const fallbackDashboard = new URL("/dashboard?square_error=callback", request.nextUrl.origin);

  if (squareError) {
    oauthWarnCallback("square_returned_error", {
      squareError,
      hasDescription: Boolean(errorDescription),
    });
    const dest =
      orgSlug && venueSlug
        ? defaultSettingsUrl(request, orgSlug, venueSlug, {
            square_error: squareError,
            ...(errorDescription ? { square_error_detail: errorDescription } : {}),
          })
        : fallbackDashboard;
    const res = NextResponse.redirect(dest, 302);
    clearSquareOAuthCookie(res, request);
    return res;
  }

  if (authError || !user) {
    oauthWarnCallback("unauthenticated_on_callback", {
      authError: Boolean(authError),
    });
    const res = NextResponse.redirect(
      new URL("/dashboard?square_error=session", request.nextUrl.origin),
      302
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  if (!verified.ok) {
    oauthWarnCallback("state_verification_failed", {
      reason: verified.reason,
    });
    const res = NextResponse.redirect(
      new URL(`/dashboard?square_error=state_${verified.reason}`, request.nextUrl.origin),
      302
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const { payload } = verified;
  if (payload.userId !== user.id) {
    oauthWarnCallback("wrong_user", {
      startedAsUserId: payload.userId,
      sessionUserId: user.id,
    });
    const res = NextResponse.redirect(
      new URL("/dashboard?square_error=wrong_user", request.nextUrl.origin),
      302
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
      defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, {
        square_error: "missing_code",
      }),
      302
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const { data: venueRow, error: venueError } = await supabase
    .from("venues")
    .select("id, organisation_id")
    .eq("id", payload.venueId)
    .eq("organisation_id", payload.organisationId)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (venueError || !venueRow) {
    oauthWarnCallback("venue_lookup_failed", {
      venueId: payload.venueId,
      dbError: Boolean(venueError),
    });
    const res = NextResponse.redirect(
      defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, {
        square_error: "venue_not_found",
      }),
      302
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
      defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, {
        square_error: "token_exchange",
        square_error_detail: exchange.message,
      }),
      302
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  const envLabel = getSquareOAuthEnvConfig().environment;
  const envLoc = getOptionalSquareLocationIdFromEnv();

  const { data: existing } = await supabase
    .from("venue_square_connections")
    .select("square_merchant_id, square_location_id")
    .eq("venue_id", payload.venueId)
    .maybeSingle();

  const newMerchantId = exchange.token.merchant_id;
  const priorMerchantId = existing?.square_merchant_id?.trim() ?? "";
  const sameSquareSeller =
    priorMerchantId.length > 0 && priorMerchantId === newMerchantId;

  // Env wins (single-tenant / dev). Otherwise only reuse a stored location if it belongs to this
  // Square seller — otherwise a stale sandbox or copy-pasted id breaks ListPayments ("Not authorized
  // for location_id …") after connecting a different production account.
  const squareLocationId = envLoc
    ? envLoc
    : sameSquareSeller
      ? (existing?.square_location_id ?? null)
      : null;

  const tokenExpires = tokenExpiresAtIso(exchange.token.expires_at);
  const nowIso = new Date().toISOString();

  // Tokens are sensitive; RLS on venue_square_connections restricts reads to org admins.
  const { error: upsertError } = await supabase.from("venue_square_connections").upsert(
    {
      venue_id: payload.venueId,
      organisation_id: payload.organisationId,
      square_merchant_id: exchange.token.merchant_id,
      square_access_token: exchange.token.access_token,
      square_refresh_token: exchange.token.refresh_token,
      token_expires_at: tokenExpires,
      environment: envLabel,
      square_location_id: squareLocationId,
      updated_at: nowIso,
    },
    { onConflict: "venue_id" }
  );

  if (upsertError) {
    oauthWarnCallback("database_upsert_failed", {
      message: upsertError.message.slice(0, 500),
    });
    const res = NextResponse.redirect(
      defaultSettingsUrl(request, payload.orgSlug, payload.venueSlug, {
        square_error: "save_failed",
        square_error_detail: upsertError.message,
      }),
      302
    );
    clearSquareOAuthCookie(res, request);
    return res;
  }

  oauthLogCallback("connected", {
    merchantId: exchange.token.merchant_id,
    venueId: payload.venueId,
    environment: envLabel,
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
