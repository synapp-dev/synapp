const XERO_ACCOUNTING_INVOICES_URL = "https://api.xero.com/api.xro/2.0/Invoices";

export type XeroApiAttachment = {
  AttachmentID?: string;
  FileName?: string;
  Url?: string;
  MimeType?: string;
  ContentLength?: number;
};

type XeroAttachmentsResponse = {
  Attachments?: XeroApiAttachment[];
};

export async function listXeroAccountingInvoiceAttachments(args: {
  accessToken: string;
  tenantId: string;
  xeroInvoiceId: string;
}): Promise<
  | { ok: true; attachments: XeroApiAttachment[] }
  | { ok: false; message: string; status: number }
> {
  const id = encodeURIComponent(args.xeroInvoiceId.trim());
  const res = await fetch(`${XERO_ACCOUNTING_INVOICES_URL}/${id}/Attachments`, {
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
      message: text.slice(0, 500) || `Xero list attachments failed (${res.status})`,
      status: res.status,
    };
  }

  const body = (await res.json()) as XeroAttachmentsResponse;
  return { ok: true, attachments: body.Attachments ?? [] };
}
