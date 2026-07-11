import type { RequestAuthContext } from "@/server/auth/context";
import { purchaseOrderEmails } from "@/server/db/schema";
import type { PoLineRow, PoRow } from "./purchase-orders.repo";

export type PoEmailPayload = {
  po: PoRow;
  lines: PoLineRow[];
  venueName: string;
  organisationName: string;
  supplierName: string;
  orderingEmail: string;
  fromAddress: string;
};

export function buildPoEmailSubject(payload: PoEmailPayload): string {
  return `PO #${payload.po.po_number} from ${payload.venueName}`;
}

/**
 * One PO line in the supplier's own catalog language: their SKU code,
 * their product description, quantities in their sell unit (packs), with
 * pack contents spelled out so "12" can never be misread as loose units.
 * e.g. "• [FDL-1KG] Fior Di Latte — 12 box (1 kg per box) @ $16.50 per box"
 */
export function formatPoEmailLine(line: PoLineRow): string {
  const sku = line.sku_code ? `[${line.sku_code}] ` : "";
  const packLabel = line.pack_label ?? "unit";
  const unitsPerPack = line.units_per_pack;
  const showContents =
    unitsPerPack !== null &&
    line.pack_unit !== null &&
    !(unitsPerPack === 1 && ["each", "unit", "ea"].includes(line.pack_unit));
  const contents = showContents
    ? ` (${Number.isInteger(unitsPerPack) ? unitsPerPack : unitsPerPack.toFixed(2)} ${line.pack_unit} per ${packLabel})`
    : "";
  const price = `$${(line.unit_price_cents / 100).toFixed(2)}`;

  return `• ${sku}${line.product_name} — ${line.quantity_ordered} ${packLabel}${contents} @ ${price} per ${packLabel}`;
}

export function buildPoEmailBody(payload: PoEmailPayload): string {
  const lineSummary = payload.lines.map(formatPoEmailLine).join("\n");

  return `Hello ${payload.supplierName},

Please find attached purchase order ${payload.po.po_number} for ${payload.venueName}.

${lineSummary}

Total (ex GST): $${(payload.po.subtotal_cents / 100).toFixed(2)}
Total (inc GST): $${(payload.po.total_cents / 100).toFixed(2)}

${payload.po.notes ? `Notes: ${payload.po.notes}\n\n` : ""}Please reply to confirm quantities and delivery date.

Kind regards,
${payload.venueName}
${payload.organisationName}`;
}

/** Records outbound PO email; delivery integrates with Email Infrastructure when live. */
export async function sendPurchaseOrderEmail(
  ctx: RequestAuthContext,
  payload: PoEmailPayload,
): Promise<{ emailId: string; providerMessageId: string }> {
  const subject = buildPoEmailSubject(payload);
  const body = buildPoEmailBody(payload);
  const providerMessageId = `local-${payload.po.id}-${Date.now()}`;

  const rows = await ctx.appDb.rls((tx) =>
    tx
      .insert(purchaseOrderEmails)
      .values({
        poId: payload.po.id,
        direction: "outbound",
        fromAddress: payload.fromAddress,
        toAddress: payload.orderingEmail,
        subject,
        body,
        attachments: [
          {
            fileName: `${payload.po.po_number}.pdf`,
            contentType: "application/pdf",
            status: "queued",
          },
        ],
        sentAt: new Date().toISOString(),
        providerMessageId,
      })
      .returning({ id: purchaseOrderEmails.id }),
  );

  const emailId = rows[0]?.id;
  if (!emailId) {
    throw new Error("Failed to record purchase order email");
  }

  return { emailId, providerMessageId };
}

export async function sendCancellationEmail(
  ctx: RequestAuthContext,
  args: {
    po: PoRow;
    venueName: string;
    supplierName: string;
    orderingEmail: string;
    fromAddress: string;
    reason: string;
  },
): Promise<void> {
  const subject = `Cancellation: PO #${args.po.po_number} from ${args.venueName}`;
  const body = `Hello ${args.supplierName},

Please cancel purchase order ${args.po.po_number}.

Reason: ${args.reason}

Kind regards,
${args.venueName}`;

  await ctx.appDb.rls((tx) =>
    tx.insert(purchaseOrderEmails).values({
      poId: args.po.id,
      direction: "outbound",
      fromAddress: args.fromAddress,
      toAddress: args.orderingEmail,
      subject,
      body,
      attachments: [],
      sentAt: new Date().toISOString(),
      providerMessageId: `local-cancel-${args.po.id}-${Date.now()}`,
    }),
  );
}
