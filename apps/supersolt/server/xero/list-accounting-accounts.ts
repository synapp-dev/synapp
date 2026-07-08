import { fetchXero } from "@/server/xero/xero-request-queue";
const XERO_ACCOUNTS_URL = "https://api.xero.com/api.xro/2.0/Accounts";

export type XeroApiAccount = {
  Code?: string;
  Name?: string;
  /** e.g. DIRECTCOSTS, EXPENSE, OVERHEADS, REVENUE, CURRENT… */
  Type?: string;
  /** e.g. EXPENSE, REVENUE, ASSET, LIABILITY, EQUITY */
  Class?: string;
  Status?: string;
};

export type ResolvedAccount = {
  code: string;
  name: string;
  type: string;
  class: string;
};

type XeroAccountsResponse = {
  Accounts?: XeroApiAccount[];
};

/**
 * Fetch the tenant's chart of accounts. Not paginated by Xero — one GET returns
 * all accounts. We use the per-account Type (DIRECTCOSTS = cost of goods sold)
 * to tell inventory suppliers apart from overhead/expense ones during setup.
 */
export async function listXeroAccounts(args: {
  accessToken: string;
  tenantId: string;
}): Promise<
  | { ok: true; byCode: Map<string, ResolvedAccount> }
  | { ok: false; message: string; status: number }
> {
  const res = await fetchXero(XERO_ACCOUNTS_URL, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/json",
      "xero-tenant-id": args.tenantId,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[xero] list accounts failed", {
      tenantId: args.tenantId,
      status: res.status,
      body: text.slice(0, 500),
    });
    return {
      ok: false,
      message: text.slice(0, 500) || `Xero list accounts failed (${res.status})`,
      status: res.status,
    };
  }

  const body = (await res.json()) as XeroAccountsResponse;
  const byCode = new Map<string, ResolvedAccount>();
  for (const a of body.Accounts ?? []) {
    const code = a.Code?.trim();
    if (!code) continue;
    byCode.set(code, {
      code,
      name: a.Name?.trim() ?? code,
      type: (a.Type ?? "").trim().toUpperCase(),
      class: (a.Class ?? "").trim().toUpperCase(),
    });
  }

  console.info("[xero] list accounts ok", {
    tenantId: args.tenantId,
    count: byCode.size,
  });

  return { ok: true, byCode };
}
