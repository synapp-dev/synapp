import { fetchXero } from "@/server/xero/xero-request-queue";

const XERO_ACCOUNTING_INVOICES_URL = "https://api.xero.com/api.xro/2.0/Invoices";

export async function getXeroAccountingInvoiceAttachment(args: {
  accessToken: string;
  tenantId: string;
  xeroInvoiceId: string;
  fileName: string;
  mimeType?: string | null;
}): Promise<
  | { ok: true; data: ArrayBuffer; mimeType: string; fileName: string }
  | { ok: false; message: string; status: number }
> {
  const invoiceId = encodeURIComponent(args.xeroInvoiceId.trim());
  const fileName = encodeURIComponent(args.fileName.trim());
  const accept = args.mimeType?.trim() || "application/octet-stream";

  const res = await fetchXero(
    `${XERO_ACCOUNTING_INVOICES_URL}/${invoiceId}/Attachments/${fileName}`,
    {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        Accept: accept,
        "xero-tenant-id": args.tenantId,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      message: text.slice(0, 500) || `Xero download attachment failed (${res.status})`,
      status: res.status,
    };
  }

  const data = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || accept;

  return {
    ok: true,
    data,
    mimeType,
    fileName: args.fileName.trim(),
  };
}
