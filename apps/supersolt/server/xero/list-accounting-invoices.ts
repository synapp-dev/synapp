import type { XeroApiInvoice } from "@/server/xero/xero-invoice-map";

const XERO_ACCOUNTING_INVOICES_URL = "https://api.xero.com/api.xro/2.0/Invoices";

type XeroInvoicesResponse = {
  Invoices?: XeroApiInvoice[];
};

export async function listXeroAccpayInvoices(args: {
  accessToken: string;
  tenantId: string;
  modifiedSince?: string;
  /** YYYY-MM-DD — filters by invoice Date (Date >= dateSince), not update time. */
  dateSince?: string;
  pageSize?: number;
}): Promise<
  | { ok: true; invoices: XeroApiInvoice[]; httpStatuses: number[]; usedModifiedSince: boolean }
  | { ok: false; message: string; status: number }
> {
  const pageSize = Math.min(Math.max(args.pageSize ?? 100, 1), 100);
  const collected: XeroApiInvoice[] = [];
  const httpStatuses: number[] = [];
  let page = 1;

  let where = 'Type=="ACCPAY"';
  if (args.dateSince) {
    const [y, m, d] = args.dateSince.split("-").map(Number);
    if (y && m && d) {
      where += ` AND Date >= DateTime(${y},${m},${d})`;
    }
  }

  for (;;) {
    const q = new URLSearchParams({
      where,
      order: "UpdatedDateUTC DESC",
      page: String(page),
      pageSize: String(pageSize),
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/json",
      "xero-tenant-id": args.tenantId,
    };

    if (args.modifiedSince && page === 1) {
      headers["If-Modified-Since"] = args.modifiedSince;
    }

    const res = await fetch(`${XERO_ACCOUNTING_INVOICES_URL}?${q.toString()}`, {
      headers,
    });
    httpStatuses.push(res.status);

    if (res.status === 304) {
      console.info("[xero] list ACCPAY invoices: 304 Not Modified", {
        tenantId: args.tenantId,
        modifiedSince: args.modifiedSince ?? null,
        page,
      });
      return {
        ok: true,
        invoices: collected,
        httpStatuses,
        usedModifiedSince: Boolean(args.modifiedSince),
      };
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("[xero] list ACCPAY invoices failed", {
        tenantId: args.tenantId,
        status: res.status,
        modifiedSince: args.modifiedSince ?? null,
        body: text.slice(0, 500),
      });
      return {
        ok: false,
        message: text.slice(0, 500) || `Xero list invoices failed (${res.status})`,
        status: res.status,
      };
    }

    const body = (await res.json()) as XeroInvoicesResponse;
    const batch = body.Invoices ?? [];
    collected.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    page += 1;
    if (page > 50) {
      break;
    }
  }

  console.info("[xero] list ACCPAY invoices ok", {
    tenantId: args.tenantId,
    count: collected.length,
    modifiedSince: args.modifiedSince ?? null,
    httpStatuses,
  });

  return {
    ok: true,
    invoices: collected,
    httpStatuses,
    usedModifiedSince: Boolean(args.modifiedSince),
  };
}
