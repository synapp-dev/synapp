import {
  getXeroOAuthScopes,
  requireXeroOAuthEnvConfig,
} from "@/server/xero/config";

const XERO_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

export function buildXeroAuthorizeUrl(state: string): string {
  const cfg = requireXeroOAuthEnvConfig();
  const scope = getXeroOAuthScopes()
    .split(/[\s+,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  const q = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope,
    state,
  });

  return `${XERO_AUTHORIZE_URL}?${q.toString()}`;
}

export type XeroTokenSuccess = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

type XeroTokenErrorBody = {
  error?: string;
  error_description?: string;
};

export async function exchangeXeroAuthorizationCode(
  code: string,
): Promise<{ ok: true; token: XeroTokenSuccess } | { ok: false; message: string }> {
  const cfg = requireXeroOAuthEnvConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
    // A hung identity call must fail loudly, not freeze an import forever.
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await res.json()) as XeroTokenSuccess & XeroTokenErrorBody;

  if (!res.ok) {
    const detail =
      body.error_description ??
      body.error ??
      `Xero token exchange failed (${res.status})`;
    return { ok: false, message: detail };
  }

  if (!body.access_token || !body.refresh_token) {
    return {
      ok: false,
      message: "Xero token response missing required fields",
    };
  }

  return {
    ok: true,
    token: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
    },
  };
}

export type XeroConnection = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
};

export async function listXeroConnections(
  accessToken: string,
): Promise<{ ok: true; connections: XeroConnection[] } | { ok: false; message: string }> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      message: text.slice(0, 500) || `Xero connections failed (${res.status})`,
    };
  }

  const raw = (await res.json()) as Array<{
    id?: string;
    tenantId?: string;
    tenantName?: string;
    tenantType?: string;
  }>;

  const connections: XeroConnection[] = [];
  for (const row of raw) {
    if (!row.tenantId) continue;
    connections.push({
      id: row.id ?? row.tenantId,
      tenantId: row.tenantId,
      tenantName: row.tenantName ?? "Xero organisation",
      tenantType: row.tenantType ?? "ORGANISATION",
    });
  }

  return { ok: true, connections };
}

export function tokenExpiresAtIso(expiresInSeconds: number | undefined): string | null {
  if (expiresInSeconds == null || !Number.isFinite(expiresInSeconds)) return null;
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export async function refreshXeroAccessToken(
  refreshToken: string,
): Promise<{ ok: true; token: XeroTokenSuccess } | { ok: false; message: string }> {
  const cfg = requireXeroOAuthEnvConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    // A hung token refresh must fail loudly, not freeze an import forever.
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await res.json()) as XeroTokenSuccess & XeroTokenErrorBody;

  if (!res.ok) {
    const detail =
      body.error_description ??
      body.error ??
      `Xero token refresh failed (${res.status})`;
    return { ok: false, message: detail };
  }

  if (!body.access_token || !body.refresh_token) {
    return {
      ok: false,
      message: "Xero refresh response missing required fields",
    };
  }

  return {
    ok: true,
    token: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
    },
  };
}
