import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type { VenueInvoiceDbRow } from "@/server/invoices/invoices.repo";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { InvoicesServiceError } from "@/server/invoices/invoices.errors";
import {
  fuzzyMatchSupplierProduct,
  mapParsedInvoiceToLineInserts,
  parseInvoiceDocument,
  type ParseTokenUsage,
} from "@/server/invoices/invoice-parser.service";
import { downloadInvoiceAttachment, uploadInvoiceAttachment } from "@/server/invoices/invoice-storage";
import { XeroRateLimitError } from "@/server/xero/xero-request-queue";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

export type ParseableAttachment = {
  fingerprint: string;
  fileName: string;
  mimeType: string;
  source: "local" | "xero";
  localAttachmentId?: string;
};

const PARSEABLE_MIME_PREFIXES = ["application/pdf", "image/"];

function isParseableMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return PARSEABLE_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

function pickPdfOrImage<T extends { fileName: string; mimeType: string | null }>(
  items: T[],
): T | null {
  const pdf =
    items.find((a) => a.mimeType === "application/pdf") ??
    items.find((a) => a.fileName.toLowerCase().endsWith(".pdf"));
  if (pdf) return pdf;
  return items.find((a) => isParseableMime(a.mimeType)) ?? items[0] ?? null;
}

export function buildLocalAttachmentFingerprint(attachmentId: string): string {
  return `local:${attachmentId}`;
}

export function buildXeroAttachmentFingerprint(
  xeroInvoiceId: string,
  fileName: string,
): string {
  return `xero:${xeroInvoiceId}:${fileName.trim().toLowerCase()}`;
}

export function resolveParseableAttachment(args: {
  invoice: Pick<VenueInvoiceDbRow, "id" | "xeroInvoiceId">;
  localAttachments: Array<{
    id: string;
    fileName: string;
    mimeType: string | null;
    source: string;
  }>;
  xeroAttachments: Array<{
    id: string;
    fileName: string;
    mimeType: string | null;
  }>;
}): ParseableAttachment | null {
  const localCandidates = args.localAttachments.filter((a) => isParseableMime(a.mimeType));
  const local = pickPdfOrImage(localCandidates);
  if (local) {
    return {
      fingerprint: buildLocalAttachmentFingerprint(local.id),
      fileName: local.fileName,
      mimeType: local.mimeType ?? "application/octet-stream",
      source: "local",
      localAttachmentId: local.id,
    };
  }

  if (!args.invoice.xeroInvoiceId) return null;

  const xeroCandidates = args.xeroAttachments.filter((a) => isParseableMime(a.mimeType));
  const xero = pickPdfOrImage(xeroCandidates);
  if (!xero) return null;

  return {
    fingerprint: buildXeroAttachmentFingerprint(args.invoice.xeroInvoiceId, xero.fileName),
    fileName: xero.fileName,
    mimeType: xero.mimeType ?? "application/pdf",
    source: "xero",
  };
}

export type AttachmentParseState = {
  status: "cached" | "needed" | "unavailable" | "failed";
  fingerprint: string | null;
  parsedAt: string | null;
  error: string | null;
};

export function getAttachmentParseState(args: {
  invoice: Pick<
    VenueInvoiceDbRow,
    "attachmentParseFingerprint" | "attachmentParsedAt" | "attachmentParseError"
  >;
  parseable: ParseableAttachment | null;
}): AttachmentParseState {
  if (!args.parseable) {
    return {
      status: "unavailable",
      fingerprint: null,
      parsedAt: args.invoice.attachmentParsedAt,
      error: args.invoice.attachmentParseError,
    };
  }

  if (args.invoice.attachmentParseFingerprint === args.parseable.fingerprint) {
    return {
      status: "cached",
      fingerprint: args.parseable.fingerprint,
      parsedAt: args.invoice.attachmentParsedAt,
      error: null,
    };
  }

  if (args.invoice.attachmentParseError && !args.invoice.attachmentParsedAt) {
    return {
      status: "failed",
      fingerprint: args.parseable.fingerprint,
      parsedAt: null,
      error: args.invoice.attachmentParseError,
    };
  }

  return {
    status: "needed",
    fingerprint: args.parseable.fingerprint,
    parsedAt: null,
    error: null,
  };
}

async function loadAttachmentBytes(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    parseable: ParseableAttachment;
    localAttachments: Array<{ id: string; storagePath: string }>;
  },
): Promise<Buffer> {
  if (args.parseable.source === "local" && args.parseable.localAttachmentId) {
    const row = args.localAttachments.find((a) => a.id === args.parseable.localAttachmentId);
    if (!row) throw new Error("Local attachment not found");
    const { bytes } = await downloadInvoiceAttachment(row.storagePath);
    return bytes;
  }

  const { downloadVenueXeroInvoiceAttachment } = await import(
    "@/server/xero/xero-invoices.service"
  );
  const downloaded = await downloadVenueXeroInvoiceAttachment(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    invoiceId: args.invoiceId,
    fileName: args.parseable.fileName,
  });
  if (!downloaded.ok) {
    throw new Error(downloaded.message);
  }
  return Buffer.from(downloaded.data);
}

/**
 * The supplier identity block read off the invoice's own header — the ground
 * truth the invoice-first import uses to resolve/mint suppliers (ABN primary).
 * Only present on a fresh successful parse; cached/skipped results carry null.
 */
export type ParsedSupplierHeader = {
  name: string | null;
  abn: string | null;
  category: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  /** Invoice date (row value, else parsed) — for most-recent-wins enrichment. */
  invoiceDate: string | null;
};

export type ParseInvoiceAttachmentResult = {
  skipped: boolean;
  parsed: boolean;
  lineItemCount: number;
  fingerprint: string | null;
  error: string | null;
  tokenUsage: ParseTokenUsage | null;
  supplierHeader: ParsedSupplierHeader | null;
};

export async function parseInvoiceAttachmentIfNeeded(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    force?: boolean;
  },
): Promise<ParseInvoiceAttachmentResult> {
  const context = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new InvoicesServiceError(404, message),
      forbidden: (auth) => new InvoicesServiceError(auth.status, auth.message),
    },
  );

  const invoice = await ctx.appDb.rls((tx) =>
    invoicesRepo.getInvoiceById(tx, context.venueId, args.invoiceId),
  );
  if (!invoice) {
    throw new InvoicesServiceError(404, "Invoice not found");
  }

  const localAttachments = await ctx.appDb.rls((tx) =>
    invoicesRepo.listAttachments(tx, invoice.id),
  );

  let xeroAttachments: Array<{ id: string; fileName: string; mimeType: string | null }> = [];
  if (!localAttachments.length && invoice.xeroInvoiceId) {
    const { listVenueXeroInvoiceAttachments } = await import(
      "@/server/xero/xero-invoices.service"
    );
    const xeroPayload = await listVenueXeroInvoiceAttachments(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      invoiceId: args.invoiceId,
    });
    // A failed attachment lookup (e.g. Xero throttling that survived the queue's
    // retries) must NOT be mistaken for "no attachment" — that silently drops a
    // bill that really does have a PDF. Surface it so the caller records a
    // retryable failure instead of skipping.
    if (xeroPayload.attachmentsError) {
      throw new InvoicesServiceError(
        502,
        `Could not list Xero attachments: ${xeroPayload.attachmentsError}`,
      );
    }
    xeroAttachments = xeroPayload.attachments;
  }

  const parseable = resolveParseableAttachment({
    invoice,
    localAttachments,
    xeroAttachments,
  });

  if (!parseable) {
    return {
      skipped: true,
      parsed: false,
      lineItemCount: 0,
      fingerprint: null,
      error: null,
      tokenUsage: null,
      supplierHeader: null,
    };
  }

  if (
    !args.force &&
    invoice.attachmentParseFingerprint === parseable.fingerprint &&
    invoice.attachmentParsedAt
  ) {
    const existing = await ctx.appDb.rls((tx) => invoicesRepo.listLineItems(tx, invoice.id));
    return {
      skipped: true,
      parsed: false,
      lineItemCount: existing.length,
      fingerprint: parseable.fingerprint,
      error: null,
      tokenUsage: null,
      supplierHeader: null,
    };
  }

  try {
    const bytes = await loadAttachmentBytes(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      invoiceId: args.invoiceId,
      parseable,
      localAttachments,
    });

    const { parsed, usage } = await parseInvoiceDocument({
      fileName: parseable.fileName,
      mimeType: parseable.mimeType,
      bytes,
    });

    if (usage) {
      console.info("[invoice-parse] attachment parsed", {
        invoiceId: invoice.id,
        fileName: parseable.fileName,
        venueId: context.venueId,
        ...usage,
      });
    }

    const products = invoice.supplierId
      ? await supplierProductsRepo.listActiveForVenue(ctx.appDb, {
          organisationId: context.organisationId,
          venueId: context.venueId,
          supplierId: invoice.supplierId,
        })
      : [];

    const lineInserts = mapParsedInvoiceToLineInserts(
      parsed,
      context.organisationId,
      context.venueId,
    ).map((line) => {
      const match = line.parsedDescription
        ? fuzzyMatchSupplierProduct(
            products.map((p) => ({
              id: p.id,
              name: p.name,
              ingredientId: p.ingredientId,
            })),
            line.parsedDescription,
          )
        : null;
      return {
        ...line,
        supplierProductId: match?.supplierProductId ?? null,
        ingredientId: match?.ingredientId ?? null,
        isUnmapped: !match,
        mappingMethod: match ? ("auto" as const) : null,
      };
    });

    await invoicesRepo.replaceLineItems(ctx.appDb, {
      invoiceId: invoice.id,
      organisationId: context.organisationId,
      venueId: context.venueId,
      lines: lineInserts,
    });

    if (parseable.source === "xero") {
      const hasLocal = localAttachments.some((a) => a.fileName === parseable.fileName);
      if (!hasLocal) {
        const { storagePath } = await uploadInvoiceAttachment({
          organisationId: context.organisationId,
          venueId: context.venueId,
          invoiceId: invoice.id,
          fileName: parseable.fileName,
          mimeType: parseable.mimeType,
          bytes,
        });
        await invoicesRepo.insertAttachment(ctx.appDb, {
          invoiceId: invoice.id,
          organisationId: context.organisationId,
          venueId: context.venueId,
          fileName: parseable.fileName,
          mimeType: parseable.mimeType,
          contentLength: bytes.length,
          storagePath,
          source: "xero",
        });
      }
    }

    const now = new Date().toISOString();
    const effectiveInvoiceDate = invoice.invoiceDate ?? parsed.invoiceDate;
    await ctx.appDb.rls(async (tx) => {
      await invoicesRepo.updateInvoice(tx, invoice.id, {
        parseConfidence: parsed.confidence,
        attachmentParseFingerprint: parseable.fingerprint,
        attachmentParsedAt: now,
        attachmentParseError: null,
        invoiceNumber: invoice.invoiceNumber ?? parsed.invoiceNumber,
        invoiceDate: effectiveInvoiceDate,
        dueDate: invoice.dueDate ?? parsed.dueDate,
        subtotalCents:
          invoice.subtotalCents ??
          (parsed.subtotal != null ? Math.round(parsed.subtotal * 100) : null),
        gstCents:
          invoice.gstCents ??
          (parsed.gstTotal != null ? Math.round(parsed.gstTotal * 100) : null),
        updatedAt: now,
      });

      // Enrich the supplier's contact/address from this invoice's header — most-recent invoice wins.
      if (invoice.supplierId && effectiveInvoiceDate) {
        await suppliersRepo.enrichDetailsFromInvoice(tx, {
          organisationId: context.organisationId,
          supplierId: invoice.supplierId,
          invoiceDate: effectiveInvoiceDate,
          details: {
            abn: parsed.supplierAbn,
            category: parsed.supplierCategory ?? null,
            email: parsed.supplierEmail ?? null,
            phone: parsed.supplierPhone ?? null,
            addressLine1: parsed.supplierAddressLine1 ?? null,
            addressLine2: parsed.supplierAddressLine2 ?? null,
            suburb: parsed.supplierSuburb ?? null,
            state: parsed.supplierState ?? null,
            postcode: parsed.supplierPostcode ?? null,
          },
        });
      }
      await invoicesRepo.insertAudit(tx, {
        invoiceId: invoice.id,
        eventType: "attachment_parsed",
        afterValue: {
          fingerprint: parseable.fingerprint,
          lineItemCount: lineInserts.length,
          confidence: parsed.confidence,
          tokenUsage: usage,
        },
        changedByUserId: ctx.userId,
      });
    });

    return {
      skipped: false,
      parsed: true,
      lineItemCount: lineInserts.length,
      fingerprint: parseable.fingerprint,
      error: null,
      tokenUsage: usage,
      supplierHeader: {
        name: parsed.supplierName?.trim() || null,
        abn: parsed.supplierAbn?.trim() || null,
        category: parsed.supplierCategory ?? null,
        email: parsed.supplierEmail ?? null,
        phone: parsed.supplierPhone ?? null,
        addressLine1: parsed.supplierAddressLine1 ?? null,
        addressLine2: parsed.supplierAddressLine2 ?? null,
        suburb: parsed.supplierSuburb ?? null,
        state: parsed.supplierState ?? null,
        postcode: parsed.supplierPostcode ?? null,
        invoiceDate: effectiveInvoiceDate ?? null,
      },
    };
  } catch (error) {
    // A spent Xero API budget is not a parse failure — recording it against
    // the bill would brand a perfectly readable invoice as broken. Rethrow so
    // the import stops cleanly and this bill is retried on the next run.
    if (error instanceof XeroRateLimitError) throw error;
    const message = error instanceof Error ? error.message : "Attachment parse failed";
    await ctx.appDb.rls((tx) =>
      invoicesRepo.updateInvoice(tx, invoice.id, {
        attachmentParseError: message,
        updatedAt: new Date().toISOString(),
      }),
    );
    return {
      skipped: false,
      parsed: false,
      lineItemCount: 0,
      fingerprint: parseable.fingerprint,
      error: message,
      tokenUsage: null,
      supplierHeader: null,
    };
  }
}
