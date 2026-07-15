import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";

import type { PoLineRow, PoRow } from "./purchase-orders.repo";

export type PoPdfPayload = {
  po: PoRow;
  lines: PoLineRow[];
  venueName: string;
  organisationName: string;
  supplierName: string;
  orderingEmail: string;
  fromAddress: string;
  venueAddress?: string | null;
  venuePhone?: string | null;
  orderedByName?: string | null;
  /** Public URL of the organisation logo; skipped silently if unreachable. */
  orgLogoUrl?: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

// Brand palette lifted from the Supersolt logo mark.
const INK = rgb(0.137, 0.122, 0.125); // #231f20
const MUTED = rgb(0.44, 0.46, 0.49);
const GREEN = rgb(0.737, 0.859, 0.545); // #bcdb8b
const LINE = rgb(0.9, 0.906, 0.914);
const HEADER_BG = rgb(0.972, 0.976, 0.968);

// Standard fonts only cover WinAnsi; strip anything they can't encode so a
// stray character in a product name can never fail the whole send.
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedLogo(
  doc: PDFDocument,
  bytes: Uint8Array,
): Promise<PDFImage | null> {
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

/** The Supersolt mark (rounded square + two green bars), from the brand SVG. */
function drawSupersoltMark(page: PDFPage, x: number, yTop: number, size: number): void {
  const scale = size / 150.55;
  page.drawSvgPath(
    "M25,0 H125.55 A25,25 0 0 1 150.55,25 V119 A25,25 0 0 1 125.55,144 H25 A25,25 0 0 1 0,119 V25 A25,25 0 0 1 25,0 Z",
    { x, y: yTop, scale, color: INK },
  );
  page.drawSvgPath(
    "M55.41,35.74c-10.02,0-18.13,8.12-18.13,18.13s8.12,18.13,18.13,18.13h57.96v-36.27h-57.96Z",
    { x, y: yTop, scale, color: GREEN },
  );
  page.drawSvgPath(
    "M95.13,71.99c10.02,0,18.13,8.12,18.13,18.13s-8.12,18.13-18.13,18.13h-57.96v-36.27h57.96Z",
    { x, y: yTop, scale, color: GREEN },
  );
}

type DrawContext = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
  hasSkuColumn: boolean;
};

function drawText(
  ctx: DrawContext,
  text: string,
  options: {
    x: number;
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    alignRight?: boolean;
    maxWidth?: number;
  },
): void {
  const font = options.font ?? ctx.regular;
  const size = options.size ?? 9;
  let value = sanitize(text);
  if (options.maxWidth && font.widthOfTextAtSize(value, size) > options.maxWidth) {
    let kept = value;
    while (
      kept.length > 1 &&
      font.widthOfTextAtSize(`${kept}...`, size) > options.maxWidth
    ) {
      kept = kept.slice(0, -1).trimEnd();
    }
    value = `${kept}...`;
  }
  const x = options.alignRight
    ? options.x - font.widthOfTextAtSize(value, size)
    : options.x;
  ctx.page.drawText(value, {
    x,
    y: ctx.y,
    size,
    font,
    color: options.color ?? INK,
  });
}

function drawRule(
  ctx: DrawContext,
  color = LINE,
  thickness = 0.5,
  fromX = MARGIN,
  toX = PAGE_WIDTH - MARGIN,
): void {
  ctx.page.drawLine({
    start: { x: fromX, y: ctx.y },
    end: { x: toX, y: ctx.y },
    thickness,
    color,
  });
}

function columns(ctx: DrawContext) {
  const sku = MARGIN;
  const product = ctx.hasSkuColumn ? MARGIN + 66 : MARGIN;
  return {
    sku,
    product,
    qty: MARGIN + 230,
    pack: MARGIN + 262,
    unitPrice: PAGE_WIDTH - MARGIN - 67,
    lineTotal: PAGE_WIDTH - MARGIN,
  };
}

function drawTableHeader(ctx: DrawContext): void {
  const col = columns(ctx);
  ctx.page.drawRectangle({
    x: MARGIN - 6,
    y: ctx.y - 6,
    width: PAGE_WIDTH - 2 * MARGIN + 12,
    height: 20,
    color: HEADER_BG,
  });
  const header = { size: 7.5, font: ctx.bold, color: MUTED };
  if (ctx.hasSkuColumn) drawText(ctx, "CODE", { x: col.sku, ...header });
  drawText(ctx, "PRODUCT", { x: col.product, ...header });
  drawText(ctx, "QTY", { x: col.qty, ...header });
  drawText(ctx, "PACK", { x: col.pack, ...header });
  drawText(ctx, "UNIT PRICE", { x: col.unitPrice, ...header, alignRight: true });
  drawText(ctx, "TOTAL", { x: col.lineTotal, ...header, alignRight: true });
  ctx.y -= 9;
  drawRule(ctx, INK, 0.8);
  ctx.y -= 15;
}

function ensureRoom(ctx: DrawContext, needed: number): void {
  if (ctx.y - needed > MARGIN + 70) return;
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
  drawTableHeader(ctx);
}

/**
 * Pack contents subline is skipped when the pack label already carries the
 * size in the supplier's own words (e.g. ARZ's "1kg x 12", "4lt x 4").
 */
function packContents(line: PoLineRow): string | null {
  const packLabel = line.pack_label ?? "unit";
  if (/\d/.test(packLabel)) return null;
  if (
    line.units_per_pack === null ||
    line.pack_unit === null ||
    (line.units_per_pack === 1 && ["each", "unit", "ea"].includes(line.pack_unit))
  ) {
    return null;
  }
  const amount = Number.isInteger(line.units_per_pack)
    ? String(line.units_per_pack)
    : line.units_per_pack.toFixed(2);
  return `${amount} ${line.pack_unit} per ${packLabel}`;
}

export async function buildPoPdf(payload: PoPdfPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(payload.po.po_number);
  doc.setAuthor(payload.organisationName);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { po, lines } = payload;
  const ctx: DrawContext = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN,
    hasSkuColumn: lines.some((line) => line.sku_code),
  };

  // Header: org logo + venue identity left, PO identity right
  const headerTop = ctx.y;
  let identityX = MARGIN;
  if (payload.orgLogoUrl) {
    const bytes = await fetchImageBytes(payload.orgLogoUrl);
    const logo = bytes ? await embedLogo(doc, bytes) : null;
    if (logo) {
      const width = Math.min((logo.width / logo.height) * 40, 120);
      const height = (logo.height / logo.width) * width;
      ctx.page.drawImage(logo, {
        x: MARGIN,
        y: headerTop - height + 10,
        width,
        height,
      });
      identityX = MARGIN + width + 14;
    }
  }
  ctx.y = headerTop;
  drawText(ctx, payload.venueName, { x: identityX, size: 15, font: bold });
  drawText(ctx, "PURCHASE ORDER", {
    x: PAGE_WIDTH - MARGIN,
    size: 13,
    font: bold,
    alignRight: true,
  });
  ctx.y -= 15;
  drawText(ctx, payload.organisationName, { x: identityX, size: 8.5, color: MUTED });
  drawText(ctx, po.po_number, {
    x: PAGE_WIDTH - MARGIN,
    size: 11,
    font: bold,
    alignRight: true,
  });
  ctx.y -= 13;
  if (payload.venueAddress) {
    drawText(ctx, payload.venueAddress, { x: identityX, size: 8.5, color: MUTED });
  }
  drawText(
    ctx,
    `Issued ${formatDate(po.submitted_at ?? po.created_at)} - ${statusLabel(po.status)}`,
    { x: PAGE_WIDTH - MARGIN, size: 8.5, color: MUTED, alignRight: true },
  );
  ctx.y -= 14;
  drawRule(ctx, GREEN, 2.5);
  ctx.y -= 22;

  // Supplier / deliver-to / order-details blocks
  const blockWidth = (PAGE_WIDTH - 2 * MARGIN) / 3;
  const blockX: [number, number, number] = [
    MARGIN,
    MARGIN + blockWidth,
    MARGIN + 2 * blockWidth,
  ];
  const caption = { size: 7.5, font: bold, color: MUTED };
  drawText(ctx, "SUPPLIER", { x: blockX[0], ...caption });
  drawText(ctx, "DELIVER TO", { x: blockX[1], ...caption });
  drawText(ctx, "ORDER DETAILS", { x: blockX[2], ...caption });
  ctx.y -= 14;

  const blockLines: string[][] = [
    [payload.supplierName, payload.orderingEmail].filter(Boolean),
    [payload.venueName, ...(payload.venueAddress ? [payload.venueAddress] : []),
      ...(payload.venuePhone ? [payload.venuePhone] : [])],
    [
      ...(po.expected_delivery_date
        ? [`Expected delivery: ${formatDate(po.expected_delivery_date)}`]
        : []),
      ...(payload.orderedByName ? [`Ordered by: ${payload.orderedByName}`] : []),
      `Contact: ${payload.fromAddress}`,
    ],
  ];
  const blockTop = ctx.y;
  let blockBottom = ctx.y;
  blockLines.forEach((linesOfBlock, index) => {
    ctx.y = blockTop;
    for (const text of linesOfBlock) {
      drawText(ctx, text, {
        x: blockX[index] ?? MARGIN,
        size: 8.5,
        maxWidth: blockWidth - 14,
      });
      ctx.y -= 12;
    }
    blockBottom = Math.min(blockBottom, ctx.y);
  });
  ctx.y = blockBottom - 16;

  drawTableHeader(ctx);

  for (const line of lines) {
    const col = columns(ctx);
    const contents = packContents(line);
    const rowHeight = contents ? 27 : 17;
    ensureRoom(ctx, rowHeight);

    if (ctx.hasSkuColumn) {
      drawText(ctx, line.sku_code ?? "", { x: col.sku, size: 8.5, maxWidth: 58 });
    }
    drawText(ctx, line.product_name, {
      x: col.product,
      size: 9,
      maxWidth: col.qty - col.product - 10,
    });
    drawText(ctx, formatQuantity(Number(line.quantity_ordered)), {
      x: col.qty,
      size: 9,
    });
    drawText(ctx, line.pack_label ?? "unit", {
      x: col.pack,
      size: 9,
      maxWidth: col.unitPrice - col.pack - 44,
    });
    drawText(ctx, money(line.unit_price_cents), {
      x: col.unitPrice,
      size: 9,
      alignRight: true,
    });
    drawText(ctx, money(line.subtotal_cents), {
      x: col.lineTotal,
      size: 9,
      alignRight: true,
    });
    if (contents) {
      ctx.y -= 10;
      drawText(ctx, contents, { x: col.pack, size: 7.5, color: MUTED });
    }
    ctx.y -= 8;
    drawRule(ctx);
    ctx.y -= 12;
  }

  // Totals
  ensureRoom(ctx, 100);
  const labelX = PAGE_WIDTH - MARGIN - 150;
  const valueX = PAGE_WIDTH - MARGIN;
  const exGstCents = po.total_cents - po.gst_cents;
  ctx.y -= 2;
  drawText(ctx, "Subtotal (ex GST)", { x: labelX, size: 9 });
  drawText(ctx, money(exGstCents), { x: valueX, size: 9, alignRight: true });
  ctx.y -= 15;
  drawText(ctx, "GST", { x: labelX, size: 9 });
  drawText(ctx, money(po.gst_cents), { x: valueX, size: 9, alignRight: true });
  ctx.y -= 8;
  drawRule(ctx, INK, 0.8, labelX, valueX);
  ctx.y -= 14;
  drawText(ctx, "Total (inc GST)", { x: labelX, size: 10.5, font: bold });
  drawText(ctx, money(po.total_cents), {
    x: valueX,
    size: 10.5,
    font: bold,
    alignRight: true,
  });
  ctx.y -= 26;

  if (po.notes) {
    ensureRoom(ctx, 44);
    drawText(ctx, "NOTES", { x: MARGIN, ...caption });
    ctx.y -= 12;
    drawText(ctx, po.notes, {
      x: MARGIN,
      size: 8.5,
      maxWidth: PAGE_WIDTH - 2 * MARGIN,
    });
    ctx.y -= 22;
  }

  ensureRoom(ctx, 54);
  drawText(
    ctx,
    `Please reply to this email to confirm quantities and delivery date. Replies go to ${payload.fromAddress}.`,
    { x: MARGIN, size: 7.5, color: MUTED, maxWidth: PAGE_WIDTH - 2 * MARGIN },
  );
  ctx.y -= 16;
  drawRule(ctx);
  ctx.y -= 18;
  drawSupersoltMark(ctx.page, MARGIN, ctx.y + 12, 12);
  drawText(ctx, "Generated with Supersolt", {
    x: MARGIN + 17,
    size: 7.5,
    color: MUTED,
  });
  drawText(ctx, po.po_number, {
    x: PAGE_WIDTH - MARGIN,
    size: 7.5,
    color: MUTED,
    alignRight: true,
  });

  return doc.save();
}
