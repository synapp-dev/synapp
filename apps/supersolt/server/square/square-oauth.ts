import {
  getSquareOAuthEnvConfig,
  getSquareOAuthScopes,
} from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";

/**
 * Doc-shaped authorize URL (code flow):
 * Sandbox:  client_id, scope, state — nothing else.
 * Production: client_id, scope, session=false, state
 * @see https://developer.squareup.com/docs/oauth-api/create-urls-for-square-authorization
 */
export function buildSquareAuthorizeUrl(state: string): string {
  const cfg = getSquareOAuthEnvConfig();
  const scopeList = getSquareOAuthScopes()
    .split(/[\s+,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Square expects a space-separated list; encodeURIComponent turns spaces into %20.
  // Do NOT join with "+" then encode — that becomes %2B and Square reads one invalid scope.
  const scopeValue = scopeList.join(" ");

  const base =
    cfg.environment === "sandbox"
      ? "https://connect.squareupsandbox.com/oauth2/authorize"
      : "https://connect.squareup.com/oauth2/authorize";

  const q = [
    `client_id=${encodeURIComponent(cfg.applicationId)}`,
    `scope=${encodeURIComponent(scopeValue)}`,
    `state=${encodeURIComponent(state)}`,
  ];

  if (cfg.environment === "production") {
    q.push("session=false");
  }

  return `${base}?${q.join("&")}`;
}

export type SquareTokenSuccess = {
  access_token: string;
  refresh_token: string;
  merchant_id: string;
  expires_at?: string;
};

type SquareTokenErrorBody = {
  message?: string;
  errors?: Array<{ detail?: string }>;
};

export async function exchangeSquareAuthorizationCode(
  code: string,
): Promise<
  { ok: true; token: SquareTokenSuccess } | { ok: false; message: string }
> {
  const cfg = getSquareOAuthEnvConfig();
  const res = await fetch(`${cfg.baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      client_id: cfg.applicationId,
      client_secret: cfg.applicationSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });

  const body = (await res.json()) as SquareTokenSuccess & SquareTokenErrorBody;

  if (!res.ok) {
    const detail =
      body.message ??
      body.errors
        ?.map((e) => e.detail)
        .filter(Boolean)
        .join("; ") ??
      `Square token exchange failed (${res.status})`;
    return { ok: false, message: detail };
  }

  if (!body.access_token || !body.refresh_token || !body.merchant_id) {
    return {
      ok: false,
      message: "Square token response missing required fields",
    };
  }

  return {
    ok: true,
    token: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      merchant_id: body.merchant_id,
      expires_at: body.expires_at,
    },
  };
}

export async function refreshSquareAccessToken(
  refreshToken: string,
): Promise<
  { ok: true; token: SquareTokenSuccess } | { ok: false; message: string }
> {
  const cfg = getSquareOAuthEnvConfig();
  const res = await fetch(`${cfg.baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      client_id: cfg.applicationId,
      client_secret: cfg.applicationSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const body = (await res.json()) as SquareTokenSuccess & SquareTokenErrorBody;

  if (!res.ok) {
    const detail =
      body.message ??
      body.errors
        ?.map((e) => e.detail)
        .filter(Boolean)
        .join("; ") ??
      `Square token refresh failed (${res.status})`;
    return { ok: false, message: detail };
  }

  if (!body.access_token || !body.refresh_token || !body.merchant_id) {
    return {
      ok: false,
      message: "Square refresh response missing required fields",
    };
  }

  return {
    ok: true,
    token: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      merchant_id: body.merchant_id,
      expires_at: body.expires_at,
    },
  };
}

export function tokenExpiresAtIso(
  expiresAt: string | undefined,
): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
