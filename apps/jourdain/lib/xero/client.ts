import { createAdminClient } from "@/utils/supabase/admin";

const XERO_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";

// Scopes — must be the exact granular strings this app exposes (see the app's
// Authorisation → Scopes list in developer.xero.com). Read-only is enough:
//   offline_access                       — required to receive a refresh token
//   accounting.settings.read             — chart of accounts → GET /Accounts
//   accounting.banktransactions.read     — GET /BankTransactions (transactions)
//   accounting.reports.banksummary.read  — GET /Reports/BankSummary (balances)
export const XERO_SCOPES = [
  "offline_access",
  "accounting.settings.read",
  "accounting.banktransactions.read",
  "accounting.reports.banksummary.read",
];

export function isXeroConfigured(): boolean {
  return Boolean(
    process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.XERO_OAUTH_REDIRECT_URI
  );
}

function basicAuthHeader(): string {
  const id = process.env.XERO_CLIENT_ID ?? "";
  const secret = process.env.XERO_CLIENT_SECRET ?? "";
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export function buildXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID ?? "",
    redirect_uri: process.env.XERO_OAUTH_REDIRECT_URI ?? "",
    scope: XERO_SCOPES.join(" "),
    state,
  });
  return `${XERO_AUTHORIZE_URL}?${params.toString()}`;
}

type XeroTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type XeroTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

export type XeroConnection = {
  user_id: string;
  xero_tenant_id: string;
  xero_tenant_name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
};

async function postToken(body: URLSearchParams): Promise<XeroTokens> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuthHeader()}`,
    },
    body,
  });
  const json = (await res.json()) as XeroTokenResponse;
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(
      json.error_description ??
        json.error ??
        `Xero token request failed (${res.status})`
    );
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<XeroTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.XERO_OAUTH_REDIRECT_URI ?? "",
    })
  );
}

async function refreshTokens(refreshToken: string): Promise<XeroTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

export type XeroTenant = { tenantId: string; tenantName: string };

export async function listTenants(accessToken: string): Promise<XeroTenant[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Xero connections lookup failed (${res.status})`);
  }
  const raw = (await res.json()) as Array<{
    tenantId?: string;
    tenantName?: string;
  }>;
  return raw
    .filter((row) => row.tenantId)
    .map((row) => ({
      tenantId: row.tenantId as string,
      tenantName: row.tenantName ?? "Xero organisation",
    }));
}

export function expiresAtIso(expiresIn: number | undefined): string | null {
  if (!expiresIn || !Number.isFinite(expiresIn)) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function getXeroConnection(
  userId: string
): Promise<XeroConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("xero_connections")
    .select(
      "user_id, xero_tenant_id, xero_tenant_name, access_token, refresh_token, token_expires_at"
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as XeroConnection | null) ?? null;
}

/**
 * A valid access token + tenant for the user. Xero access tokens last 30 min
 * and refresh tokens rotate on every use, so this refreshes and persists the
 * rotated tokens whenever the stored token is expired (or within 60s of it).
 * Returns null when the user has no Xero connection.
 */
export async function getXeroAccess(userId: string): Promise<{
  accessToken: string;
  tenantId: string;
  tenantName: string | null;
} | null> {
  const connection = await getXeroConnection(userId);
  if (!connection) return null;

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;
  if (expiresAt - 60_000 > Date.now()) {
    return {
      accessToken: connection.access_token,
      tenantId: connection.xero_tenant_id,
      tenantName: connection.xero_tenant_name,
    };
  }

  const refreshed = await refreshTokens(connection.refresh_token);
  const admin = createAdminClient();
  await admin
    .from("xero_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: expiresAtIso(refreshed.expires_in),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    accessToken: refreshed.access_token,
    tenantId: connection.xero_tenant_id,
    tenantName: connection.xero_tenant_name,
  };
}

export type XeroBankAccount = {
  accountId: string;
  name: string;
  bankAccountNumber: string | null;
  currencyCode: string | null;
  status: string | null;
};

/** Bank-type accounts from the connected Xero organisation's chart of accounts. */
export async function getBankAccounts(
  userId: string
): Promise<XeroBankAccount[]> {
  const access = await getXeroAccess(userId);
  if (!access) throw new Error("Xero is not connected");

  const params = new URLSearchParams({ where: 'Type=="BANK"' });
  const res = await fetch(`${XERO_API_BASE}/Accounts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${access.accessToken}`,
      "Xero-tenant-id": access.tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text.slice(0, 300) || `Xero accounts request failed (${res.status})`
    );
  }

  const body = (await res.json()) as {
    Accounts?: Array<{
      AccountID?: string;
      Name?: string;
      BankAccountNumber?: string;
      CurrencyCode?: string;
      Status?: string;
    }>;
  };

  return (body.Accounts ?? []).map((account) => ({
    accountId: account.AccountID ?? "",
    name: account.Name ?? "Unnamed account",
    bankAccountNumber: account.BankAccountNumber ?? null,
    currencyCode: account.CurrencyCode ?? null,
    status: account.Status ?? null,
  }));
}

type ReportCell = {
  Value?: string;
  Attributes?: Array<{ Value?: string; Id?: string }>;
};
type ReportRow = {
  RowType?: string;
  Cells?: ReportCell[];
  Rows?: ReportRow[];
};

/**
 * Current balance per bank account, keyed by AccountID, from the Bank Summary
 * report. With no date params the report covers the current period, so its
 * closing balance (the last cell of each account row) is today's balance.
 */
export async function getBankBalances(
  userId: string
): Promise<Record<string, number>> {
  const access = await getXeroAccess(userId);
  if (!access) throw new Error("Xero is not connected");

  const res = await fetch(`${XERO_API_BASE}/Reports/BankSummary`, {
    headers: {
      Authorization: `Bearer ${access.accessToken}`,
      "Xero-tenant-id": access.tenantId,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text.slice(0, 300) || `Xero bank summary request failed (${res.status})`
    );
  }

  const body = (await res.json()) as { Reports?: Array<{ Rows?: ReportRow[] }> };
  const balances: Record<string, number> = {};

  const walk = (rows: ReportRow[] | undefined): void => {
    for (const row of rows ?? []) {
      if (row.RowType === "Row" && row.Cells && row.Cells.length > 0) {
        const attributes = row.Cells[0]?.Attributes ?? [];
        const accountId =
          attributes.find((attr) => attr.Id === "account")?.Value ??
          attributes[0]?.Value;
        const closing = row.Cells[row.Cells.length - 1]?.Value;
        if (accountId && closing != null) {
          const parsed = Number(closing.replace(/,/g, ""));
          if (Number.isFinite(parsed)) balances[accountId] = parsed;
        }
      }
      walk(row.Rows);
    }
  };
  walk(body.Reports?.[0]?.Rows);

  return balances;
}

export type XeroBankTransaction = {
  bankTransactionId: string;
  date: string | null;
  type: string | null;
  reference: string | null;
  contactName: string | null;
  amount: number;
  isReconciled: boolean;
  status: string | null;
};

/** Xero serialises JSON dates as `/Date(1518685200000+0000)/`. */
function parseXeroDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /\/Date\((\d+)/.exec(value);
  if (match) return new Date(Number(match[1])).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** All bank transactions for one account, newest first (paged 100 at a time). */
export async function getBankTransactions(
  userId: string,
  accountId: string
): Promise<XeroBankTransaction[]> {
  const access = await getXeroAccess(userId);
  if (!access) throw new Error("Xero is not connected");

  const transactions: XeroBankTransaction[] = [];
  const MAX_PAGES = 25; // 100 per page → up to 2,500 transactions

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      where: `BankAccount.AccountID==GUID("${accountId}")`,
      order: "Date DESC",
      page: String(page),
    });
    const res = await fetch(
      `${XERO_API_BASE}/BankTransactions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${access.accessToken}`,
          "Xero-tenant-id": access.tenantId,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        text.slice(0, 300) || `Xero transactions request failed (${res.status})`
      );
    }

    const body = (await res.json()) as {
      BankTransactions?: Array<{
        BankTransactionID?: string;
        Date?: string;
        Type?: string;
        Reference?: string;
        Contact?: { Name?: string };
        Total?: number;
        IsReconciled?: boolean;
        Status?: string;
      }>;
    };

    const batch = body.BankTransactions ?? [];
    for (const transaction of batch) {
      const total = typeof transaction.Total === "number" ? transaction.Total : 0;
      const isSpend = (transaction.Type ?? "").startsWith("SPEND");
      transactions.push({
        bankTransactionId: transaction.BankTransactionID ?? "",
        date: parseXeroDate(transaction.Date),
        type: transaction.Type ?? null,
        reference: transaction.Reference ?? null,
        contactName: transaction.Contact?.Name ?? null,
        amount: isSpend ? -total : total,
        isReconciled: Boolean(transaction.IsReconciled),
        status: transaction.Status ?? null,
      });
    }

    if (batch.length < 100) break;
  }

  return transactions;
}
