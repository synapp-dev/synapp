import type { RequestAuthContext } from "@/server/auth/context";
import { InvoicesServiceError } from "@/server/invoices/invoices.errors";
import {
  fuzzyMatchSupplier,
  fuzzyMatchSupplierProduct,
  mapParsedInvoiceToLineInserts,
  parseInvoiceDocument,
} from "@/server/invoices/invoice-parser.service";
import {
  checkAndMarkDuplicate,
  runPoMatchForInvoice,
} from "@/server/invoices/invoice-linking.service";
import { uploadInvoiceAttachment } from "@/server/invoices/invoice-storage";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

export async function uploadAndParseInvoice(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    fileName: string;
    mimeType: string;
    bytes: Buffer;
    supplierId?: string;
    notes?: string;
  },
): Promise<{ invoiceId: string }> {
  const context = await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);
  const now = new Date().toISOString();

  let parsedResult;
  try {
    parsedResult = await parseInvoiceDocument({
      fileName: args.fileName,
      mimeType: args.mimeType,
      bytes: args.bytes,
    });
  } catch (error) {
    throw new InvoicesServiceError(
      422,
      error instanceof Error ? error.message : "Could not parse invoice",
    );
  }
  const parsed = parsedResult.parsed;

  const supplierList = await ctx.appDb.rls((tx) =>
    suppliersRepo.listSuppliers(tx, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      page: 1,
      pageSize: 500,
    }),
  );

  const matchedSupplierId =
    args.supplierId ??
    fuzzyMatchSupplier(
      supplierList.rows.map((s) => ({
        id: s.id,
        name: s.name,
        orderingEmail: s.orderingEmail,
      })),
      parsed,
    );

  const supplier = matchedSupplierId ? supplierList.rows.find((s) => s.id === matchedSupplierId) : null;

  const totalCents =
    parsed.total != null
      ? Math.round(parsed.total * 100)
      : parsed.lineItems.reduce((sum, l) => sum + (l.lineTotal ?? 0) * 100, 0);

  const invoice = await invoicesRepo.insertInvoice(ctx.appDb, {
    venueId: context.venueId,
    organisationId: context.organisationId,
    xeroInvoiceId: null,
    invoiceNumber: parsed.invoiceNumber,
    supplierName: supplier?.name ?? parsed.supplierName,
    supplierId: matchedSupplierId,
    invoiceDate: parsed.invoiceDate,
    dueDate: parsed.dueDate,
    documentType: "invoice",
    totalCents: Math.round(totalCents),
    subtotalCents: parsed.subtotal != null ? Math.round(parsed.subtotal * 100) : null,
    gstCents: parsed.gstTotal != null ? Math.round(parsed.gstTotal * 100) : null,
    currencyCode: "AUD",
    xeroStatus: "DRAFT",
    reviewStatus: "pending_review",
    source: "upload",
    parseConfidence: parsed.confidence,
    notes: args.notes ?? null,
    syncedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const { storagePath } = await uploadInvoiceAttachment({
    organisationId: context.organisationId,
    venueId: context.venueId,
    invoiceId: invoice.id,
    fileName: args.fileName,
    mimeType: args.mimeType,
    bytes: args.bytes,
  });

  await invoicesRepo.insertAttachment(ctx.appDb, {
    invoiceId: invoice.id,
    organisationId: context.organisationId,
    venueId: context.venueId,
    fileName: args.fileName,
    mimeType: args.mimeType,
    contentLength: args.bytes.length,
    storagePath,
    source: "upload",
  });

  const attachmentRows = await ctx.appDb.rls((tx) => invoicesRepo.listAttachments(tx, invoice.id));
  const uploadedAttachment = attachmentRows.find((a) => a.storagePath === storagePath);

  const products = matchedSupplierId
    ? await supplierProductsRepo.listActiveForVenue(ctx.appDb, {
        organisationId: context.organisationId,
        venueId: context.venueId,
        supplierId: matchedSupplierId,
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
    lines: lineInserts.map((line) => ({
      ...line,
      quantity: line.quantity,
    })),
  });

  if (uploadedAttachment) {
    await ctx.appDb.rls((tx) =>
      invoicesRepo.updateInvoice(tx, invoice.id, {
        attachmentParseFingerprint: `local:${uploadedAttachment.id}`,
        attachmentParsedAt: now,
        attachmentParseError: null,
      }),
    );
  }

  await checkAndMarkDuplicate(ctx, invoice.id, context.venueId);
  await runPoMatchForInvoice(ctx, invoice.id, context.venueId, context.organisationId);

  await ctx.appDb.rls((tx) =>
    invoicesRepo.insertAudit(tx, {
      invoiceId: invoice.id,
      eventType: "uploaded",
      afterValue: { source: "upload", parseConfidence: parsed.confidence },
      changedByUserId: ctx.userId,
    }),
  );

  return { invoiceId: invoice.id };
}
