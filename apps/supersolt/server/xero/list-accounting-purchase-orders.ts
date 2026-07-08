import { fetchXero } from "@/server/xero/xero-request-queue";
const XERO_PURCHASE_ORDERS_URL = "https://api.xero.com/api.xro/2.0/PurchaseOrders";

export type XeroApiPoLineItem = {
  ItemCode?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  LineAmount?: number;
  AccountCode?: string;
  TaxType?: string;
};

export type XeroApiPurchaseOrder = {
  PurchaseOrderID?: string;
  PurchaseOrderNumber?: string;
  Status?: string;
  CurrencyCode?: string;
  Contact?: { ContactID?: string; Name?: string };
  LineItems?: XeroApiPoLineItem[];
};

type XeroPurchaseOrdersResponse = {
  PurchaseOrders?: XeroApiPurchaseOrder[];
};

/**
 * Fetch all (non-deleted) Purchase Orders for a tenant, with their line items.
 * Xero returns LineItems inline on the list endpoint, so one paginated sweep gives
 * us the full itemized catalog — no per-PO GET needed. Ordered newest-first so the
 * caller can treat the first occurrence of an item as its most recent price.
 */
export async function listXeroPurchaseOrders(args: {
  accessToken: string;
  tenantId: string;
  pageSize?: number;
}): Promise<
  | { ok: true; purchaseOrders: XeroApiPurchaseOrder[]; httpStatuses: number[] }
  | { ok: false; message: string; status: number }
> {
  const pageSize = Math.min(Math.max(args.pageSize ?? 100, 1), 100);
  const collected: XeroApiPurchaseOrder[] = [];
  const httpStatuses: number[] = [];
  let page = 1;

  for (;;) {
    const q = new URLSearchParams({
      where: 'Status!="DELETED"',
      order: "UpdatedDateUTC DESC",
      page: String(page),
      pageSize: String(pageSize),
    });

    const res = await fetchXero(`${XERO_PURCHASE_ORDERS_URL}?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        Accept: "application/json",
        "xero-tenant-id": args.tenantId,
      },
    });
    httpStatuses.push(res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("[xero] list purchase orders failed", {
        tenantId: args.tenantId,
        status: res.status,
        page,
        body: text.slice(0, 500),
      });
      return {
        ok: false,
        message:
          text.slice(0, 500) || `Xero list purchase orders failed (${res.status})`,
        status: res.status,
      };
    }

    const body = (await res.json()) as XeroPurchaseOrdersResponse;
    const batch = body.PurchaseOrders ?? [];
    collected.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    page += 1;
    if (page > 100) {
      break;
    }
  }

  console.info("[xero] list purchase orders ok", {
    tenantId: args.tenantId,
    count: collected.length,
    httpStatuses,
  });

  return { ok: true, purchaseOrders: collected, httpStatuses };
}
