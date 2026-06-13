"use client";

import { useEffect, useState } from "react";
import {
  fetchInvoiceAttachmentBlob,
  type InvoiceAttachmentRef,
} from "@/entities/invoices/lib/invoice-attachment";

export function useInvoiceAttachmentPreview(input: {
  organisationSlug: string;
  venueSlug: string;
  invoiceId: string | null;
  attachment: InvoiceAttachmentRef | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.invoiceId || !input.attachment) {
      setPreviewUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    void fetchInvoiceAttachmentBlob(
      {
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        invoiceId: input.invoiceId,
      },
      input.attachment,
    )
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load document");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    input.organisationSlug,
    input.venueSlug,
    input.invoiceId,
    input.attachment?.kind,
    input.attachment?.kind === "storage"
      ? input.attachment.attachmentId
      : input.attachment?.fileName,
  ]);

  return { previewUrl, loading, error };
}
