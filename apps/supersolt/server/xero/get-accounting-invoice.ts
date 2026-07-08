import { fetchXero } from "@/server/xero/xero-request-queue";
import type { XeroApiInvoice } from "@/server/xero/xero-invoice-map";

const XERO_ACCOUNTING_INVOICES_URL = "https://api.xero.com/api.xro/2.0/Invoices";

type XeroInvoiceResponse = {
  Invoices?: XeroApiInvoice[];
};

export type XeroApiLineItem = {
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  LineAmount?: number;
  AccountCode?: string;
  TaxType?: string;
};

export type XeroApiInvoiceWithLines = XeroApiInvoice & {
  LineItems?: XeroApiLineItem[];
  Url?: string;
  SubTotal?: number;
  TotalTax?: number;
};

export async function getXeroAccountingInvoice(args: {
  accessToken: string;
  tenantId: string;
  xeroInvoiceId: string;
}): Promise<
  | { ok: true; invoice: XeroApiInvoiceWithLines }
  | { ok: false; message: string; status: number }
> {
  const id = encodeURIComponent(args.xeroInvoiceId.trim());
  const res = await fetchXero(`${XERO_ACCOUNTING_INVOICES_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/json",
      "xero-tenant-id": args.tenantId,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      message: text.slice(0, 500) || `Xero get invoice failed (${res.status})`,
      status: res.status,
    };
  }

  const body = (await res.json()) as XeroInvoiceResponse;
  const invoice = body.Invoices?.[0];
  if (!invoice) {
    return {
      ok: false,
      message: "Invoice not found in Xero",
      status: 404,
    };
  }

  return { ok: true, invoice: invoice as XeroApiInvoiceWithLines };
}
