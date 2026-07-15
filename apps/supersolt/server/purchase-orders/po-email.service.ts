import type { RequestAuthContext } from "@/server/auth/context";
import { purchaseOrderEmails } from "@/server/db/schema";
import { sendViaPostmark } from "@/server/email/postmark-client";
import type { PoLineRow, PoRow } from "./purchase-orders.repo";

export type PoEmailPayload = {
  po: PoRow;
  lines: PoLineRow[];
  venueName: string;
  organisationName: string;
  supplierName: string;
  orderingEmail: string;
  fromAddress: string;
  /** Where supplier replies should land (the venue inbox); defaults to fromAddress. */
  replyTo?: string;
  /** Org-level override from purchasing settings; falls back to the default body. */
  bodyTemplate?: string | null;
  pdfBytes?: Uint8Array | null;
  /** Public URL of the organisation logo shown in the HTML email header. */
  orgLogoUrl?: string | null;
};

/**
 * The canonical sender is the venue inbox, but only verified Postmark senders
 * can be a From address. PO_EMAIL_FROM_OVERRIDE lets dev/testing send from a
 * verified personal address while replies still flow to the venue inbox
 * (which receives via the Postmark inbound webhook regardless).
 */
export function resolvePoSenderAddresses(venueSlug: string): {
  fromAddress: string;
  replyTo: string;
} {
  const venueInbox = `${venueSlug}@inbox.supersolt.com`;
  const override = process.env.PO_EMAIL_FROM_OVERRIDE?.trim();
  return { fromAddress: override || venueInbox, replyTo: venueInbox };
}

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

/**
 * Placeholders available in the org-editable template (Settings -> Integrations):
 * {{supplier_name}} {{venue_name}} {{organisation_name}} {{po_number}}
 * {{lines}} {{total_ex_gst}} {{total_inc_gst}} {{notes}}
 */
export function buildPoEmailBody(payload: PoEmailPayload): string {
  const lineSummary = payload.lines.map(formatPoEmailLine).join("\n");
  const totalExGst = `$${((payload.po.total_cents - payload.po.gst_cents) / 100).toFixed(2)}`;
  const totalIncGst = `$${(payload.po.total_cents / 100).toFixed(2)}`;

  const template = payload.bodyTemplate?.trim();
  if (template) {
    const values: Record<string, string> = {
      supplier_name: payload.supplierName,
      venue_name: payload.venueName,
      organisation_name: payload.organisationName,
      po_number: payload.po.po_number,
      lines: lineSummary,
      total_ex_gst: totalExGst,
      total_inc_gst: totalIncGst,
      notes: payload.po.notes ?? "",
    };
    return template.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (match, key: string) => values[key] ?? match,
    );
  }

  return `Hello ${payload.supplierName},

Please find attached purchase order ${payload.po.po_number} for ${payload.venueName}.

${lineSummary}

Total (ex GST): ${totalExGst}
Total (inc GST): ${totalIncGst}

${payload.po.notes ? `Notes: ${payload.po.notes}\n\n` : ""}Please reply to confirm quantities and delivery date.

Kind regards,
${payload.venueName}
${payload.organisationName}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML mirror of the text body: org logo header, line-item table in the
 * supplier's catalog language, totals, and a Supersolt footer. When an org
 * template is set, its rendered text is shown pre-wrapped inside the same
 * shell so both bodies always agree.
 */
export function buildPoEmailHtml(payload: PoEmailPayload): string {
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const totalExGst = money(payload.po.total_cents - payload.po.gst_cents);
  const totalIncGst = money(payload.po.total_cents);

  const logo = payload.orgLogoUrl
    ? `<img src="${escapeHtml(payload.orgLogoUrl)}" alt="${escapeHtml(payload.organisationName)}" height="44" style="height:44px;max-width:160px;object-fit:contain;display:block;" />`
    : "";

  const template = payload.bodyTemplate?.trim();
  const content = template
    ? `<div style="white-space:pre-wrap;">${escapeHtml(buildPoEmailBody(payload))}</div>`
    : `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(payload.supplierName)},</p>
      <p style="margin:0 0 18px;">Please find attached purchase order <strong>${escapeHtml(payload.po.po_number)}</strong> for ${escapeHtml(payload.venueName)}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:6px 0;border-bottom:2px solid #231f20;color:#6b7280;font-size:11px;font-weight:bold;">PRODUCT</td>
          <td style="padding:6px 0;border-bottom:2px solid #231f20;color:#6b7280;font-size:11px;font-weight:bold;text-align:right;">QTY</td>
          <td style="padding:6px 0 6px 12px;border-bottom:2px solid #231f20;color:#6b7280;font-size:11px;font-weight:bold;">PACK</td>
          <td style="padding:6px 0;border-bottom:2px solid #231f20;color:#6b7280;font-size:11px;font-weight:bold;text-align:right;">PRICE</td>
        </tr>
        ${payload.lines
          .map((line) => {
            const sku = line.sku_code ? `[${line.sku_code}] ` : "";
            return `<tr>
          <td style="padding:7px 8px 7px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(`${sku}${line.product_name}`)}</td>
          <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${line.quantity_ordered}</td>
          <td style="padding:7px 0 7px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${escapeHtml(line.pack_label ?? "unit")}</td>
          <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(line.unit_price_cents)}</td>
        </tr>`;
          })
          .join("")}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 18px;margin-left:auto;font-size:13px;">
        <tr><td style="padding:2px 18px 2px 0;color:#6b7280;">Subtotal (ex GST)</td><td style="text-align:right;">${totalExGst}</td></tr>
        <tr><td style="padding:2px 18px 2px 0;color:#6b7280;">GST</td><td style="text-align:right;">${money(payload.po.gst_cents)}</td></tr>
        <tr><td style="padding:4px 18px 0 0;font-weight:bold;border-top:1px solid #231f20;">Total (inc GST)</td><td style="text-align:right;font-weight:bold;border-top:1px solid #231f20;padding-top:4px;">${totalIncGst}</td></tr>
      </table>
      ${payload.po.notes ? `<p style="margin:0 0 18px;color:#374151;"><strong>Notes:</strong> ${escapeHtml(payload.po.notes)}</p>` : ""}
      <p style="margin:0 0 6px;">Please reply to confirm quantities and delivery date.</p>
      <p style="margin:0;">Kind regards,<br/>${escapeHtml(payload.venueName)}<br/><span style="color:#6b7280;">${escapeHtml(payload.organisationName)}</span></p>`;

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#231f20;">
    <div style="background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e5e7eb;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${logo}</td>
        <td style="text-align:right;vertical-align:top;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:0.06em;color:#6b7280;">PURCHASE ORDER</div>
          <div style="font-size:15px;font-weight:bold;">${escapeHtml(payload.po.po_number)}</div>
        </td>
      </tr></table>
      <div style="height:3px;background:#bcdb8b;border-radius:2px;margin:16px 0 20px;"></div>
      ${content}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto 0;"><tr>
      <td style="vertical-align:middle;padding-right:6px;">
        <div style="width:14px;height:13px;background:#231f20;border-radius:3px;position:relative;">
          <div style="position:absolute;top:3px;left:3px;width:7px;height:3px;background:#bcdb8b;border-radius:2px 0 0 2px;"></div>
          <div style="position:absolute;top:7px;left:4px;width:7px;height:3px;background:#bcdb8b;border-radius:0 2px 2px 0;"></div>
        </div>
      </td>
      <td style="vertical-align:middle;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#6b7280;">
        Sent with <strong style="color:#374151;">Supersolt</strong>
      </td>
    </tr></table>
  </div>
</body>
</html>`;
}

/**
 * Sends the PO email via Postmark with the PDF attached, then records it.
 * Without POSTMARK_SERVER_TOKEN the email is recorded with a `local-` message
 * id and never leaves the app (dev/preview behaviour).
 */
export async function sendPurchaseOrderEmail(
  ctx: RequestAuthContext,
  payload: PoEmailPayload,
): Promise<{ emailId: string; providerMessageId: string }> {
  const subject = buildPoEmailSubject(payload);
  const body = buildPoEmailBody(payload);
  const pdfFileName = `${payload.po.po_number}.pdf`;

  const delivery = await sendViaPostmark({
    from: payload.fromAddress,
    to: payload.orderingEmail,
    replyTo: payload.replyTo,
    subject,
    textBody: body,
    htmlBody: buildPoEmailHtml(payload),
    attachments: payload.pdfBytes
      ? [
          {
            name: pdfFileName,
            contentBase64: Buffer.from(payload.pdfBytes).toString("base64"),
            contentType: "application/pdf",
          },
        ]
      : [],
  });
  const providerMessageId =
    delivery?.providerMessageId ?? `local-${payload.po.id}-${Date.now()}`;

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
        attachments: payload.pdfBytes
          ? [
              {
                fileName: pdfFileName,
                contentType: "application/pdf",
                status: delivery ? "sent" : "recorded",
              },
            ]
          : [],
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
    replyTo?: string;
    reason: string;
  },
): Promise<void> {
  const subject = `Cancellation: PO #${args.po.po_number} from ${args.venueName}`;
  const body = `Hello ${args.supplierName},

Please cancel purchase order ${args.po.po_number}.

Reason: ${args.reason}

Kind regards,
${args.venueName}`;

  const delivery = await sendViaPostmark({
    from: args.fromAddress,
    to: args.orderingEmail,
    replyTo: args.replyTo,
    subject,
    textBody: body,
  });

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
      providerMessageId:
        delivery?.providerMessageId ?? `local-cancel-${args.po.id}-${Date.now()}`,
    }),
  );
}
