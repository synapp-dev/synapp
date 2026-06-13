"use client";

import { createBrowserClient } from "@/utils/supabase/client";

function buildInvoiceAttachmentDownloadUrl(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string;
  fileName: string;
}): string {
  const base = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/${encodeURIComponent(input.invoiceId)}/attachments/${encodeURIComponent(input.fileName)}`;
  return base;
}

export async function downloadVenueXeroInvoiceAttachment(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string;
  fileName: string;
}): Promise<void> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = buildInvoiceAttachmentDownloadUrl(input);
  const headers = new Headers();
  const token = session?.access_token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = (await response.json()) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? `Download failed (${response.status})`);
    }
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = input.fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
