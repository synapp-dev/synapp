import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";

type AdminDb = Pick<AppDb, "admin">;
import { inboundEmailLog, purchaseOrders, venueEmailInboxes } from "@/server/db/schema";
import { buildLocalAttachmentFingerprint } from "@/server/invoices/invoice-attachment-parse.service";
import { isLikelyDuplicate } from "@/server/invoices/duplicate-detector";
import { pickBestPoMatch } from "@/server/invoices/invoice-po-matcher";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import {
  fuzzyMatchSupplier,
  mapParsedInvoiceToLineInserts,
  parseInvoiceDocument,
} from "@/server/invoices/invoice-parser.service";
import { uploadInvoiceAttachment } from "@/server/invoices/invoice-storage";
import { purchaseOrdersRepo } from "@/server/purchase-orders/purchase-orders.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

export type PostmarkInboundAttachment = {
  Name: string;
  Content: string;
  ContentType: string;
  ContentLength: number;
};

export type PostmarkInboundPayload = {
  From: string;
  FromFull?: { Email: string };
  To: string;
  ToFull?: Array<{ Email: string }>;
  Subject?: string;
  Attachments?: PostmarkInboundAttachment[];
};

export async function resolveInboxByAddress(appDb: AdminDb, toAddress: string) {
  const normalized = toAddress.trim().toLowerCase();
  const rows = await appDb.admin
    .select()
    .from(venueEmailInboxes)
    .where(eq(venueEmailInboxes.address, normalized))
    .limit(1);
  return rows[0] ?? null;
}

async function applyDuplicateAndPoMatch(appDb: AdminDb, venueId: string, invoiceId: string) {
  const { venueInvoices: vi } = await import("@/server/db/schema");
  const invRows = await appDb.admin
    .select()
    .from(vi)
    .where(eq(vi.id, invoiceId))
    .limit(1);
  const invoice = invRows[0];
  if (!invoice) return;

  const existing = await invoicesRepo.findDuplicateCandidate(appDb, {
    venueId,
    invoiceNumber: invoice.invoiceNumber,
    supplierId: invoice.supplierId,
    supplierName: invoice.supplierName,
    totalCents: invoice.totalCents,
    excludeInvoiceId: invoice.id,
  });

  if (existing && isLikelyDuplicate(existing, invoice)) {
    await invoicesRepo.updateInvoiceAdmin(appDb, invoiceId, {
      reviewStatus: "duplicate",
      archivedAt: new Date().toISOString(),
    });
    return;
  }

  if (invoice.purchaseOrderId) return;

  const openPos = await appDb.admin.transaction(async (tx) =>
    purchaseOrdersRepo.listPurchaseOrders(tx, {
      venueId,
      status: "all",
      supplierId: invoice.supplierId ?? undefined,
    }),
  );

  const matchable = openPos.filter((po) =>
    ["submitted", "confirmed", "delivered"].includes(po.status),
  );
  const best = pickBestPoMatch(invoice, matchable);
  if (!best) return;

  await invoicesRepo.updateInvoiceAdmin(appDb, invoiceId, {
    purchaseOrderId: best.po.id,
    matchMethod: "auto",
  });
  await appDb.admin
    .update(purchaseOrders)
    .set({ linkedInvoiceId: invoiceId, updatedAt: new Date().toISOString() })
    .where(eq(purchaseOrders.id, best.po.id));
}

export async function processInboundEmail(
  appDb: AdminDb,
  payload: PostmarkInboundPayload,
): Promise<{ processed: number; failed: number }> {
  const toAddress =
    payload.ToFull?.[0]?.Email?.toLowerCase() ?? payload.To?.toLowerCase() ?? "";
  const inbox = await resolveInboxByAddress(appDb, toAddress);
  if (!inbox) {
    throw new Error(`Unknown inbox: ${toAddress}`);
  }

  const fromAddress = payload.FromFull?.Email ?? payload.From;
  const log = await invoicesRepo.insertInboundEmail(appDb, {
    inboxId: inbox.id,
    organisationId: inbox.organisationId,
    venueId: inbox.venueId,
    fromAddress,
    subject: payload.Subject ?? null,
    status: "received",
  });

  const attachments = payload.Attachments ?? [];
  let processed = 0;
  let failed = 0;

  for (const attachment of attachments) {
    try {
      const bytes = Buffer.from(attachment.Content, "base64");
      const mimeType = attachment.ContentType || "application/octet-stream";

      if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
        continue;
      }

      const { parsed } = await parseInvoiceDocument({
        fileName: attachment.Name,
        mimeType,
        bytes,
      });

      const supplierList = await appDb.admin.transaction(async (tx) =>
        suppliersRepo.listSuppliers(tx, {
          organisationId: inbox.organisationId,
          venueId: inbox.venueId,
          page: 1,
          pageSize: 500,
        }),
      );

      const supplierId = fuzzyMatchSupplier(
        supplierList.rows.map((s) => ({
          id: s.id,
          name: s.name,
          orderingEmail: s.orderingEmail,
        })),
        parsed,
        fromAddress,
      );

      const supplier = supplierId
        ? supplierList.rows.find((s) => s.id === supplierId)
        : null;

      const now = new Date().toISOString();
      const totalCents =
        parsed.total != null
          ? Math.round(parsed.total * 100)
          : Math.round(
              parsed.lineItems.reduce((sum, l) => sum + (l.lineTotal ?? 0) * 100, 0),
            );

      const invoice = await invoicesRepo.insertInvoice(appDb, {
        venueId: inbox.venueId,
        organisationId: inbox.organisationId,
        xeroInvoiceId: null,
        invoiceNumber: parsed.invoiceNumber,
        supplierName: supplier?.name ?? parsed.supplierName,
        supplierId: supplierId ?? null,
        invoiceDate: parsed.invoiceDate,
        dueDate: parsed.dueDate,
        documentType: "invoice",
        totalCents,
        subtotalCents: parsed.subtotal != null ? Math.round(parsed.subtotal * 100) : null,
        gstCents: parsed.gstTotal != null ? Math.round(parsed.gstTotal * 100) : null,
        currencyCode: "AUD",
        xeroStatus: "DRAFT",
        reviewStatus: "pending_review",
        source: "email",
        parseConfidence: parsed.confidence,
        emailMessageId: log.id,
        syncedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const { storagePath } = await uploadInvoiceAttachment({
        organisationId: inbox.organisationId,
        venueId: inbox.venueId,
        invoiceId: invoice.id,
        fileName: attachment.Name,
        mimeType,
        bytes,
      });

      const storedAttachment = await invoicesRepo.insertAttachment(appDb, {
        invoiceId: invoice.id,
        organisationId: inbox.organisationId,
        venueId: inbox.venueId,
        fileName: attachment.Name,
        mimeType,
        contentLength: attachment.ContentLength,
        storagePath,
        source: "email",
      });

      await invoicesRepo.replaceLineItems(appDb, {
        invoiceId: invoice.id,
        organisationId: inbox.organisationId,
        venueId: inbox.venueId,
        lines: mapParsedInvoiceToLineInserts(parsed, inbox.organisationId, inbox.venueId),
      });

      await applyDuplicateAndPoMatch(appDb, inbox.venueId, invoice.id);

      await invoicesRepo.updateInvoiceAdmin(appDb, invoice.id, {
        attachmentParseFingerprint: buildLocalAttachmentFingerprint(storedAttachment.id),
        attachmentParsedAt: now,
        attachmentParseError: null,
      });

      await appDb.admin
        .update(inboundEmailLog)
        .set({ status: "parsed", linkedInvoiceId: invoice.id })
        .where(eq(inboundEmailLog.id, log.id));

      processed += 1;
    } catch (error) {
      console.error("[inbound-email] attachment failed", error);
      failed += 1;
    }
  }

  if (!attachments.length) {
    await appDb.admin
      .update(inboundEmailLog)
      .set({ status: "failed", parseResult: { error: "No attachments" } })
      .where(eq(inboundEmailLog.id, log.id));
    failed += 1;
  }

  return { processed, failed };
}
