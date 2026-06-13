"use client";

import { createBrowserClient } from "@/utils/supabase/client";

export type InvoiceAttachmentRef =
  | {
      kind: "storage";
      attachmentId: string;
      fileName: string;
    }
  | {
      kind: "xero";
      fileName: string;
    };

function buildStorageAttachmentPath(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string;
  attachmentId: string;
}): string {
  return `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/attachments/${encodeURIComponent(input.attachmentId)}`;
}

function buildXeroAttachmentPath(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string;
  fileName: string;
}): string {
  return `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/${encodeURIComponent(input.invoiceId)}/attachments/${encodeURIComponent(input.fileName)}`;
}

export function buildInvoiceAttachmentPath(
  scope: { organisationSlug: string; venueSlug: string; invoiceId: string },
  attachment: InvoiceAttachmentRef,
): string {
  if (attachment.kind === "storage") {
    return buildStorageAttachmentPath({
      ...scope,
      attachmentId: attachment.attachmentId,
    });
  }
  return buildXeroAttachmentPath({
    ...scope,
    fileName: attachment.fileName,
  });
}

async function authHeaders(): Promise<Headers> {
  const headers = new Headers();
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function fetchInvoiceAttachmentBlob(
  scope: { organisationSlug: string; venueSlug: string; invoiceId: string },
  attachment: InvoiceAttachmentRef,
): Promise<Blob> {
  const url = buildInvoiceAttachmentPath(scope, attachment);
  const response = await fetch(url, { headers: await authHeaders(), cache: "no-store" });
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = (await response.json()) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? `Download failed (${response.status})`);
    }
    throw new Error(`Download failed (${response.status})`);
  }
  return response.blob();
}

export async function downloadInvoiceAttachmentFile(
  scope: { organisationSlug: string; venueSlug: string; invoiceId: string },
  attachment: InvoiceAttachmentRef,
): Promise<void> {
  const blob = await fetchInvoiceAttachmentBlob(scope, attachment);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = attachment.fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
