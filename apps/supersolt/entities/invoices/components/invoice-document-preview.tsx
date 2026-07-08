"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { InvoiceAttachmentRow } from "@/entities/invoices/model/types";
import type { InvoiceAttachmentRef } from "@/entities/invoices/lib/invoice-attachment";
import { useVenueInvoiceDetailQuery } from "@/entities/invoices/model/use-venue-invoice-detail-query";
import { useInvoiceAttachmentPreview } from "@/entities/invoices/model/use-invoice-attachment-preview";

function pickPreviewAttachment(
  local: InvoiceAttachmentRow[],
  xero: InvoiceAttachmentRow[],
): InvoiceAttachmentRow | null {
  const all = [...local, ...xero];
  const pdf =
    all.find((a) => a.mimeType === "application/pdf") ??
    all.find((a) => a.fileName.toLowerCase().endsWith(".pdf"));
  return pdf ?? all[0] ?? null;
}

function toAttachmentRef(attachment: InvoiceAttachmentRow): InvoiceAttachmentRef {
  if (attachment.source === "xero") {
    return { kind: "xero", fileName: attachment.fileName };
  }
  return {
    kind: "storage",
    attachmentId: attachment.id,
    fileName: attachment.fileName,
  };
}

/** Just the invoice's original document, rendered to fill its container. */
export function InvoiceDocumentPreview({
  organisation,
  venue,
  invoiceId,
  className,
}: {
  organisation: string;
  venue: string;
  invoiceId: string | null;
  className?: string;
}) {
  const detailQuery = useVenueInvoiceDetailQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId,
  });

  const previewAttachment = useMemo(
    () =>
      pickPreviewAttachment(
        detailQuery.data?.attachments ?? [],
        detailQuery.data?.xeroAttachments ?? [],
      ),
    [detailQuery.data?.attachments, detailQuery.data?.xeroAttachments],
  );
  const attachmentRef = previewAttachment ? toAttachmentRef(previewAttachment) : null;

  const preview = useInvoiceAttachmentPreview({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId,
    attachment: attachmentRef,
  });

  const base = cn(
    "bg-muted/30 flex h-full w-full items-center justify-center rounded-md border",
    className,
  );

  if (!invoiceId) {
    return (
      <div className={cn(base, "text-muted-foreground p-6 text-center text-sm")}>
        No source invoice for this item yet.
      </div>
    );
  }

  if (preview.loading || detailQuery.isPending) {
    return (
      <div className={base}>
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (preview.previewUrl) {
    return (
      <iframe
        src={preview.previewUrl}
        title={previewAttachment?.fileName ?? "Invoice document"}
        className={cn("bg-muted/30 h-full w-full rounded-md border", className)}
      />
    );
  }

  return (
    <div className={cn(base, "flex-col gap-2 p-4 text-sm")}>
      <p className="text-muted-foreground text-center">
        {preview.error ?? detailQuery.data?.attachmentsError ?? "No document attached."}
      </p>
      {detailQuery.data?.xeroUrl ? (
        <Button asChild variant="outline" size="sm">
          <Link
            href={detailQuery.data.xeroUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in Xero
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
